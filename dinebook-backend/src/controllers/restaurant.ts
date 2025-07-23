import { Request, Response } from "express";
import { Restaurant, Booking, Review } from "../models/";

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
