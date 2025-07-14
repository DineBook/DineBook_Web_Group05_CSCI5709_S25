import { Request, Response } from "express";
import { Restaurant } from "../models/";

import type { AuthenticatedRequest, RestaurantQueryParams, CreateRestaurantBody } from "../types";
import { geocodeAddress, validateCoordinates } from "../utils/location";

/**
 * Get restaurants near user location within specified radius
 */
export const getNearbyRestaurants = async (
  req: Request<{}, {}, {}, RestaurantQueryParams>,
  res: Response
): Promise<void> => {
  try {
    const {
      latitude,
      longitude,
      radius = "5", // default 5km
      cuisine,
      priceRange,
      page = "1",
      limit = "10",
    } = req.query;

    // Validate required location parameters
    if (!latitude || !longitude) {
      res.status(400).json({
        error: "Latitude and longitude are required for location-based search",
      });
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    // Validate coordinates
    if (!validateCoordinates(lat, lng)) {
      res.status(400).json({
        error: "Invalid latitude or longitude values",
      });
      return;
    }

    // Build filter for additional criteria
    const filter: any = { isActive: true };

    if (cuisine) {
      filter.cuisine = cuisine;
    }

    if (priceRange) {
      filter.priceRange = parseInt(priceRange);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const restaurants = await Restaurant.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat], // MongoDB uses [longitude, latitude]
          },
          distanceField: "distance",
          maxDistance: radiusKm * 1000, // Convert km to meters
          spherical: true,
          query: filter,
        },
      },
      {
        $addFields: {
          distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] },
        },
      },
      {
        $sort: { distance: 1 }, // Sort by distance (nearest first)
      },
      {
        $skip: skip,
      },
      {
        $limit: parseInt(limit),
      },
    ]);

    // Get total count for pagination
    const totalCount = await Restaurant.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat],
          },
          distanceField: "distance",
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: filter,
        },
      },
      {
        $count: "total",
      },
    ]);

    const total = totalCount.length > 0 ? totalCount[0].total : 0;

    res.json({
      restaurants,
      userLocation: {
        latitude: lat,
        longitude: lng,
      },
      searchRadius: radiusKm,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      filters: { cuisine, priceRange },
      message: `Found ${restaurants.length} restaurants within ${radiusKm}km`,
    });
  } catch (error) {
    console.error("Nearby restaurants search error:", error);
    res.status(500).json({ error: "Failed to fetch nearby restaurants" });
  }
};

/**
 * Get all restaurants with optional filtering (fallback for non-location searches)
 */
export const getRestaurants = async (
  req: Request<{}, {}, {}, RestaurantQueryParams>,
  res: Response
): Promise<void> => {
  try {
    const {
      location,
      cuisine,
      priceRange,
      page = "1",
      limit = "10",
      latitude,
      longitude,
      radius,
    } = req.query;

    // If location coordinates are provided, use nearby search
    if (latitude && longitude) {
      await getNearbyRestaurants(req, res);
      return;
    }

    // Original location-based search (text-based)
    const filter: any = { isActive: true };

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    if (cuisine) {
      filter.cuisine = cuisine;
    }

    if (priceRange) {
      filter.priceRange = parseInt(priceRange);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const restaurants = await Restaurant.find(filter)
      .populate("ownerId", "name email")
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Restaurant.countDocuments(filter);

    res.json({
      restaurants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      filters: { location, cuisine, priceRange },
    });
  } catch (error) {
    console.error("Restaurant search error:", error);
    res.status(500).json({ error: "Failed to fetch restaurants" });
  }
};

/**
 * Get a single restaurant by ID
 */
export const getRestaurantById = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate(
      "ownerId",
      "name email"
    );

    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found" });
      return;
    }

    if (!restaurant.isActive) {
      res.status(404).json({ error: "Restaurant is not available" });
      return;
    }

    res.json(restaurant);
  } catch (error) {
    console.error("Restaurant fetch error:", error);

    if (error instanceof Error && error.name === "CastError") {
      res.status(400).json({ error: "Invalid restaurant ID" });
      return;
    }

    res.status(500).json({ error: "Failed to fetch restaurant" });
  }
};

/**
 * Create a new restaurant
 */
export const createRestaurant = async (
  req: AuthenticatedRequest & Request<{}, {}, CreateRestaurantBody>,
  res: Response
): Promise<void> => {
  try {
    const { latitude, longitude, location, ...otherData } = req.body;

    let coordinates: [number, number] | null = null;

    // If coordinates are provided, use them
    if (latitude !== undefined && longitude !== undefined) {
      console.log(`Using provided coordinates: ${latitude}, ${longitude}`);

      if (!validateCoordinates(latitude, longitude)) {
        res.status(400).json({ error: "Invalid latitude or longitude values" });
        return;
      }
      coordinates = [longitude, latitude]; // MongoDB format: [lng, lat]
    } else if (location) {
      // Try to geocode the location address
      console.log(`Attempting to geocode address: ${location}`);
      const geocodeResult = await geocodeAddress(location);
      if (geocodeResult) {
        coordinates = [geocodeResult.longitude, geocodeResult.latitude];
        console.log(`Geocoded to: ${coordinates}`);
      }
    }

    if (!coordinates) {
      res.status(400).json({
        error:
          "Could not determine restaurant location. Please provide valid coordinates or address.",
      });
      return;
    }

    const restaurantData = {
      ...otherData,
      location,
      geometry: {
        type: "Point",
        coordinates,
      },
      ownerId: req.user.id,
    };

    console.log(
      `Creating restaurant with coordinates: [${coordinates[0]}, ${coordinates[1]}]`
    );

    const restaurant = new Restaurant(restaurantData);
    await restaurant.save();

    await restaurant.populate("ownerId", "name email");

    res.status(201).json({
      message: "Restaurant created successfully",
      restaurant,
      coordinates: coordinates, // Include coordinates in response for verification
    });
  } catch (error) {
    console.error("Restaurant creation error:", error);

    if (error instanceof Error && error.name === "ValidationError") {
      res.status(400).json({
        error: "Validation failed",
        details: error.message,
      });
      return;
    }

    res.status(500).json({ error: "Failed to create restaurant" });
  }
};
