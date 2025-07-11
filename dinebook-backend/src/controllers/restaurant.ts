import { Request, Response } from "express";
import { Restaurant } from "../models/";

import type { AuthenticatedRequest, RestaurantQueryParams, CreateRestaurantBody } from "../types";

/**
 * Get all restaurants with optional filtering and pagination
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
            lat,
            lng,
            radius = "10", // Default 10km radius
        } = req.query;

        const filter: any = { isActive: true };
        let aggregationPipeline: any[] = [];

        // Location-based search using coordinates
        if (lat && lng) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            const radiusInKm = parseFloat(radius);

            if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusInKm)) {
                res.status(400).json({ error: "Invalid coordinates or radius" });
                return;
            }

            // Use MongoDB geospatial query
            aggregationPipeline.push({
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [longitude, latitude] // GeoJSON uses [lng, lat]
                    },
                    distanceField: "distance",
                    maxDistance: radiusInKm * 1000, // Convert to meters
                    spherical: true
                }
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
                { $sort: lat && lng ? { distance: 1 } : { name: 1 } },
                { $skip: skip },
                { $limit: parseInt(limit) },
                {
                    $lookup: {
                        from: "users",
                        localField: "ownerId",
                        foreignField: "_id",
                        as: "ownerId",
                        pipeline: [{ $project: { name: 1, email: 1 } }]
                    }
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
            filters: { location, cuisine, priceRange, lat, lng, radius },
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
        const restaurantData: any = {
            ...req.body,
            ownerId: req.user.id,
        };

        // Handle coordinates if provided
        if (req.body.coordinates) {
            restaurantData.coordinates = {
                type: 'Point',
                coordinates: [req.body.coordinates.longitude, req.body.coordinates.latitude]
            };
        }

        const restaurant = new Restaurant(restaurantData);
        await restaurant.save();

        await restaurant.populate("ownerId", "name email");

        res.status(201).json({
            message: "Restaurant created successfully",
            restaurant,
        });
    } catch (error) {
        console.error("Restaurant creation error:", error);
        res.status(500).json({ error: "Failed to create restaurant" });
    }
};
