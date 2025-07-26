import { Request, Response } from "express";
import { Restaurant, Booking, Review } from "../models/";

import type {
  AuthenticatedRequest,
  RestaurantQueryParams,
  CreateRestaurantBody,
} from "../types";
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
    if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
      res.status(400).json({
        error: "Invalid coordinate or radius values",
      });
      return;
    }

    if (lat < -90 || lat > 90) {
      res.status(400).json({
        error: "Latitude must be between -90 and 90",
      });
      return;
    }

    if (lng < -180 || lng > 180) {
      res.status(400).json({
        error: "Longitude must be between -180 and 180",
      });
      return;
    }

    if (radiusKm <= 0) {
      res.status(400).json({
        error: "Radius must be greater than 0",
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

    // Try geospatial query first, fallback to regular query if it fails
    let restaurants;
    let total = 0;

    try {
      restaurants = await Restaurant.aggregate([
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
            key: "geometry" // Specify which field to use for geospatial search
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
            key: "geometry" // Specify which field to use for geospatial search
          },
        },
        {
          $count: "total",
        },
      ]);

      total = totalCount.length > 0 ? totalCount[0].total : 0;
    } catch (geoError) {
      // Fallback to regular query without geospatial features
      restaurants = await Restaurant.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Add mock distance for fallback
      restaurants = restaurants.map(restaurant => ({
        ...restaurant,
        distance: 1000, // 1km default
        distanceKm: 1.0,
      }));

      total = await Restaurant.countDocuments(filter);
    }

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
    res.status(500).json({ 
      error: "Failed to fetch nearby restaurants",
      details: (error as Error).message 
    });
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
      radius = "10", // Default 10km radius
    } = req.query;

    const filter: any = { isActive: true };
    let aggregationPipeline: any[] = [];

    // Location-based search using coordinates
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusInKm = parseFloat(radius);

      if (isNaN(lat) || isNaN(lng) || isNaN(radiusInKm)) {
        res.status(400).json({ error: "Invalid coordinates or radius" });
        return;
      }

      // Use MongoDB geospatial query
      aggregationPipeline.push({
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat], // GeoJSON uses [lng, lat]
          },
          distanceField: "distance",
          maxDistance: radiusInKm * 1000, // Convert to meters
          spherical: true,
        },
      });

      // Add the active filter
      aggregationPipeline.push({ $match: { isActive: true } });
    } else {
      // Text-based location search (existing functionality)
      if (location) {
        filter.location = { $regex: location, $options: "i" };
      }
    }

    // Add other filters
    if (cuisine) {
      const cuisineFilter = { cuisine: cuisine };
      if (aggregationPipeline.length > 0) {
        aggregationPipeline.push({ $match: cuisineFilter });
      } else {
        filter.cuisine = cuisine;
      }
    }

    if (priceRange) {
      const priceFilter = { priceRange: parseInt(priceRange) };
      if (aggregationPipeline.length > 0) {
        aggregationPipeline.push({ $match: priceFilter });
      } else {
        filter.priceRange = parseInt(priceRange);
      }
    }

    let restaurants;
    let total;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    if (aggregationPipeline.length > 0) {
      // Use aggregation pipeline for geospatial search
      aggregationPipeline.push(
        { $sort: latitude && longitude ? { distance: 1 } : { name: 1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: "users",
            localField: "ownerId",
            foreignField: "_id",
            as: "ownerId",
            pipeline: [{ $project: { name: 1, email: 1 } }],
          },
        },
        { $unwind: { path: "$ownerId", preserveNullAndEmptyArrays: true } }
      );

      restaurants = await Restaurant.aggregate(aggregationPipeline);

      // Get total count for pagination
      const countPipeline = aggregationPipeline.slice(0, -3); // Remove sort, skip, limit, lookup, unwind
      countPipeline.push({ $count: "total" });
      const countResult = await Restaurant.aggregate(countPipeline);
      total = countResult[0]?.total || 0;
    } else {
      // Use regular find for text-based search
      restaurants = await Restaurant.find(filter)
        .populate("ownerId", "name email")
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit));

      total = await Restaurant.countDocuments(filter);
    }

    res.json({
      restaurants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      filters: { location, cuisine, priceRange, latitude, longitude, radius },
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
      if (!validateCoordinates(latitude, longitude)) {
        res.status(400).json({ error: "Invalid latitude or longitude values" });
        return;
      }
      coordinates = [longitude, latitude]; // MongoDB format: [lng, lat]
    } else if (location) {
      // Try to geocode the location address
      const geocodeResult = await geocodeAddress(location);
      if (geocodeResult) {
        coordinates = [geocodeResult.longitude, geocodeResult.latitude];
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

/**
 * Get restaurants owned by the authenticated user
 */
export const getMyRestaurants = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const ownerId = req.user.id;

        const restaurants = await Restaurant.find({ ownerId, isActive: true })
            .populate("ownerId", "name email")
            .sort({ createdAt: -1 });

        res.json({
            restaurants,
            total: restaurants.length
        });
    } catch (error) {
        console.error("Get my restaurants error:", error);
        res.status(500).json({ error: "Failed to fetch restaurants" });
    }
};

/**
 * Get bookings for a specific restaurant (owner only)
 */
export const getRestaurantBookings = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id: restaurantId } = req.params;
        const ownerId = req.user.id;
        const { limit = "10", status, date } = req.query as {
            limit?: string;
            status?: string;
            date?: string;
        };

        // Verify restaurant ownership
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" });
            return;
        }

        if (restaurant.ownerId.toString() !== ownerId) {
            res.status(403).json({ error: "You don't have permission to view these bookings" });
            return;
        }

        // Build filter
        const filter: any = { restaurantId };
        if (status && status !== 'all') {
            filter.status = status;
        }
        if (date) {
            filter.date = date;
        }

        const bookings = await Booking.find(filter)
            .populate('customerId', 'name email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({
            restaurantId,
            restaurantName: restaurant.name,
            bookings,
            total: bookings.length
        });
    } catch (error) {
        console.error("Get restaurant bookings error:", error);
        res.status(500).json({ error: "Failed to fetch bookings" });
    }
};

/**
 * Get statistics for a specific restaurant (owner only)
 */
export const getRestaurantStats = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id: restaurantId } = req.params;
        const ownerId = req.user.id;

        // Verify restaurant ownership
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" });
            return;
        }

        if (restaurant.ownerId.toString() !== ownerId) {
            res.status(403).json({ error: "You don't have permission to view these stats" });
            return;
        }

        // Calculate stats in parallel
        const [
            totalBookings,
            todayBookings,
            upcomingBookings,
            totalReviews,
            averageRating
        ] = await Promise.all([
            Booking.countDocuments({ restaurantId }),
            Booking.countDocuments({
                restaurantId,
                date: new Date().toISOString().split('T')[0],
                status: { $in: ['confirmed', 'pending'] }
            }),
            Booking.countDocuments({
                restaurantId,
                date: { $gte: new Date().toISOString().split('T')[0] },
                status: { $in: ['confirmed', 'pending'] }
            }),
            Review.countDocuments({ restaurantId }),
            Review.aggregate([
                { $match: { restaurantId: restaurant._id } },
                { $group: { _id: null, avgRating: { $avg: "$rating" } } }
            ])
        ]);

        res.json({
            restaurantId,
            restaurantName: restaurant.name,
            stats: {
                totalBookings,
                todayBookings,
                upcomingBookings,
                totalReviews,
                averageRating: averageRating[0]?.avgRating || 0
            }
        });
    } catch (error) {
        console.error("Get restaurant stats error:", error);
        res.status(500).json({ error: "Failed to fetch restaurant statistics" });
    }
};

/**
 * Update a restaurant (owner only)
 */
export const updateRestaurant = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id: restaurantId } = req.params;
        const ownerId = req.user.id;
        const updateData = req.body;

        // Verify restaurant ownership
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" });
            return;
        }

        if (restaurant.ownerId.toString() !== ownerId) {
            res.status(403).json({ error: "You don't have permission to update this restaurant" });
            return;
        }

        // Handle coordinates if provided
        if (updateData.coordinates) {
            updateData.coordinates = {
                type: 'Point',
                coordinates: [updateData.coordinates.longitude, updateData.coordinates.latitude]
            };
        }

        // Update the restaurant
        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
            restaurantId,
            updateData,
            { new: true, runValidators: true }
        ).populate("ownerId", "name email");

        res.json({
            message: "Restaurant updated successfully",
            restaurant: updatedRestaurant
        });
    } catch (error) {
        console.error("Restaurant update error:", error);

        if (error instanceof Error && error.name === "ValidationError") {
            res.status(400).json({ error: "Validation error: " + error.message });
            return;
        }

        res.status(500).json({ error: "Failed to update restaurant" });
    }
};

/**
 * Delete a restaurant (owner only)
 */
export const deleteRestaurant = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id: restaurantId } = req.params;
        const ownerId = req.user.id;

        // Verify restaurant ownership
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" });
            return;
        }

        if (restaurant.ownerId.toString() !== ownerId) {
            res.status(403).json({ error: "You don't have permission to delete this restaurant" });
            return;
        }

        // Soft delete - set isActive to false instead of actually deleting
        // This preserves historical data for bookings, reviews, etc.
        restaurant.isActive = false;
        await restaurant.save();

        res.json({
            message: "Restaurant deleted successfully"
        });
    } catch (error) {
        console.error("Restaurant deletion error:", error);
        res.status(500).json({ error: "Failed to delete restaurant" });
    }
};

// Menu Management Functions

/**
 * Get menu items for a restaurant
 */
export const getMenuItems = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id: restaurantId } = req.params;

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" });
            return;
        }

        res.json({
            menuItems: restaurant.menuItems || []
        });
    } catch (error) {
        console.error("Menu items fetch error:", error);
        res.status(500).json({ error: "Failed to fetch menu items" });
    }
};

/**
 * Create a new menu item
 */
export const createMenuItem = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id: restaurantId } = req.params;
        const ownerId = req.user.id;
        const menuItemData = req.body;

        // Verify restaurant ownership
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" });
            return;
        }

        if (restaurant.ownerId.toString() !== ownerId) {
            res.status(403).json({ error: "You don't have permission to manage this restaurant's menu" });
            return;
        }

        // Create new menu item (ObjectId will be auto-generated)
        const newMenuItem = {
            name: menuItemData.name,
            description: menuItemData.description || '',
            price: parseFloat(menuItemData.price),
            category: menuItemData.category,
            imageUrl: menuItemData.imageUrl || '',
            isVegetarian: menuItemData.isVegetarian || false,
            isVegan: menuItemData.isVegan || false,
            isGlutenFree: menuItemData.isGlutenFree || false,
            isAvailable: menuItemData.isAvailable !== false, // Default to true
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Initialize menuItems array if it doesn't exist
        if (!restaurant.menuItems) {
            restaurant.menuItems = [] as any;
        }

        restaurant.menuItems.push(newMenuItem as any);
        await restaurant.save();

        res.status(201).json({
            message: "Menu item created successfully",
            menuItem: newMenuItem
        });
    } catch (error) {
        console.error("Menu item creation error:", error);
        res.status(500).json({ error: "Failed to create menu item" });
    }
};

/**
 * Update a menu item
 */
export const updateMenuItem = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id: restaurantId, itemId } = req.params;
        const ownerId = req.user.id;
        const updateData = req.body;

        // Verify restaurant ownership
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" });
            return;
        }

        if (restaurant.ownerId.toString() !== ownerId) {
            res.status(403).json({ error: "You don't have permission to manage this restaurant's menu" });
            return;
        }

        // Find and update the menu item
        const menuItemIndex = restaurant.menuItems.findIndex(
            item => item._id.toString() === itemId.toString()
        );

        if (menuItemIndex === -1) {
            res.status(404).json({ error: "Menu item not found" });
            return;
        }

        // Update menu item
        const updatedItem = {
            ...restaurant.menuItems[menuItemIndex],
            name: updateData.name,
            description: updateData.description || '',
            price: parseFloat(updateData.price),
            category: updateData.category,
            imageUrl: updateData.imageUrl || '',
            isVegetarian: updateData.isVegetarian || false,
            isVegan: updateData.isVegan || false,
            isGlutenFree: updateData.isGlutenFree || false,
            isAvailable: updateData.isAvailable !== false,
            updatedAt: new Date()
        };

        restaurant.menuItems[menuItemIndex] = updatedItem as any;
        await restaurant.save();

        res.json({
            message: "Menu item updated successfully",
            menuItem: updatedItem
        });
    } catch (error) {
        console.error("Menu item update error:", error);
        res.status(500).json({ error: "Failed to update menu item" });
    }
};

/**
 * Delete a menu item
 */
export const deleteMenuItem = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id: restaurantId, itemId } = req.params;
        const ownerId = req.user.id;

        // Verify restaurant ownership
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" });
            return;
        }

        if (restaurant.ownerId.toString() !== ownerId) {
            res.status(403).json({ error: "You don't have permission to manage this restaurant's menu" });
            return;
        }

        // Remove the menu item
        const initialLength = restaurant.menuItems.length;
        restaurant.menuItems = restaurant.menuItems.filter(
            item => item._id.toString() !== itemId.toString()
        ) as any;

        if (restaurant.menuItems.length === initialLength) {
            res.status(404).json({ error: "Menu item not found" });
            return;
        }

        await restaurant.save();

        res.json({
            message: "Menu item deleted successfully"
        });
    } catch (error) {
        console.error("Menu item deletion error:", error);
        res.status(500).json({ error: "Failed to delete menu item" });
    }
};
