import { Request, Response } from "express";
import { Restaurant } from "../models/restaurant";
import { Booking } from "../models/booking";
import { Review } from "../models/review";
import { geocodeAddress } from "../utils/location";
import NodeCache from "node-cache";

// Create cache instance with 5-minute TTL - OPTIMIZATION 1
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

export const createRestaurant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Enhanced authentication check
    const user = (req as any).user;
    if (!user || !user.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (user.role !== 'owner') {
      res.status(403).json({ error: "Only restaurant owners can create restaurants" });
      return;
    }

    const { 
      name, 
      address, 
      location,
      phoneNumber,
      phone, 
      description, 
      cuisine, 
      hours,
      openingHours, 
      priceRange,
      email,
      capacity,
      coordinates 
    } = req.body;

    // Handle different field names from frontend
    const restaurantName = name;
    const restaurantPhone = phoneNumber || phone;
    const restaurantHours = openingHours || hours;

    // Handle address - keep object structure for model
    let addressObj = address;
    let addressString = '';

    if (typeof address === 'object' && address !== null) {
      // Use address object as-is for model
      const { street, city, province, postalCode } = address;
      addressString = `${street || ''} ${city || ''} ${province || ''} ${postalCode || ''}`.trim();
    } else if (typeof address === 'string') {
      // Convert string to object
      addressString = address.trim();
      addressObj = { street: address.trim(), city: '', province: '', postalCode: '' };
    } else if (location && typeof location === 'string') {
      // Fallback to location field
      addressString = location.trim();
      addressObj = { street: location.trim(), city: '', province: '', postalCode: '' };
    }

    // Validate required fields
    if (!restaurantName || !addressString || !restaurantPhone || !description || !cuisine) {
      res.status(400).json({ 
        error: "Missing required fields: name, address, phone, description, cuisine",
        received: {
          name: restaurantName,
          address: addressString,
          phone: restaurantPhone,
          description,
          cuisine
        }
      });
      return;
    }

    // Validate address format
    if (addressString.length < 5) {
      res.status(400).json({ 
        error: "Invalid address format. Address must be at least 5 characters long.",
        receivedAddress: addressString
      });
      return;
    }

    console.log("Creating restaurant with address:", addressString);

    // Geocode the address to get coordinates
    const geoCoordinates = await geocodeAddress(addressString);
    
    if (!geoCoordinates) {
      console.error("Failed to geocode address:", addressString);
      res.status(400).json({ 
        error: "Invalid address provided. Unable to determine location coordinates.",
        addressUsed: addressString
      });
      return;
    }

    const restaurant = new Restaurant({
      name: restaurantName,
      address: addressObj, // Use object structure for model
      location: addressString, // String for location field
      phoneNumber: restaurantPhone,
      description,
      cuisine,
      openingHours: restaurantHours,
      priceRange,
      email,
      capacity,
      isActive: true, // Set active by default
      coordinates: {
        latitude: geoCoordinates.latitude,
        longitude: geoCoordinates.longitude,
      },
      geometry: {
        type: "Point",
        coordinates: [geoCoordinates.longitude, geoCoordinates.latitude], // [lng, lat]
      },
      ownerId: (req as any).user.id, // From auth middleware
    });

    await restaurant.save();
    res.status(201).json({ message: "Restaurant created successfully", restaurant });
  } catch (error) {
    console.error("Error creating restaurant:", error);
    res.status(500).json({ error: "Failed to create restaurant" });
  }
};

export const getRestaurantById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found" });
      return;
    }

    res.json(restaurant);
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    res.status(500).json({ error: "Failed to fetch restaurant" });
  }
};

export const updateRestaurant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const ownerId = (req as any).user.id;

    const restaurant = await Restaurant.findOne({ _id: id, ownerId });

    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found or unauthorized" });
      return;
    }

    // If address is being updated, geocode it
    if (req.body.address && req.body.address !== restaurant.address) {
      let addressString = '';
      
      if (typeof req.body.address === 'object' && req.body.address !== null) {
        // Convert address object to string for geocoding
        const { street, city, province, postalCode } = req.body.address;
        addressString = `${street || ''} ${city || ''} ${province || ''} ${postalCode || ''}`.trim();
      } else if (typeof req.body.address === 'string') {
        addressString = req.body.address.trim();
      }

      // Validate address format
      if (addressString.length < 5) {
        res.status(400).json({ error: "Invalid address format. Address must be at least 5 characters long." });
        return;
      }

      const coordinates = await geocodeAddress(addressString);
      if (!coordinates) {
        console.error("Failed to geocode address:", addressString);
        res.status(400).json({ error: "Invalid address provided. Unable to determine location coordinates." });
        return;
      }
      
      // Update location fields
      req.body.location = addressString;
      req.body.coordinates = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };
      req.body.geometry = {
        type: "Point",
        coordinates: [coordinates.longitude, coordinates.latitude],
      };
    }

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    res.json({
      message: "Restaurant updated successfully",
      restaurant: updatedRestaurant,
    });
  } catch (error) {
    console.error("Error updating restaurant:", error);
    res.status(500).json({ error: "Failed to update restaurant" });
  }
};

export const deleteRestaurant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const ownerId = (req as any).user.id;

    const restaurant = await Restaurant.findOneAndDelete({ _id: id, ownerId });

    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found or unauthorized" });
      return;
    }

    res.json({ message: "Restaurant deleted successfully" });
  } catch (error) {
    console.error("Error deleting restaurant:", error);
    res.status(500).json({ error: "Failed to delete restaurant" });
  }
};

export const getMyRestaurants = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const ownerId = (req as any).user.id;
    console.log("Fetching restaurants for owner:", ownerId);
    
    const restaurants = await Restaurant.find({ ownerId });
    console.log("Found restaurants:", restaurants.length);

    res.json({ restaurants });
  } catch (error) {
    console.error("Error fetching my restaurants:", error);
    res.status(500).json({ error: "Failed to fetch restaurants" });
  }
};

export const getRestaurantBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const ownerId = (req as any).user.id;
    console.log("Fetching bookings for restaurant:", id, "owner:", ownerId);

    // Verify the user owns this restaurant
    const restaurant = await Restaurant.findOne({ _id: id, ownerId });
    if (!restaurant) {
      console.log("Restaurant not found or unauthorized");
      res.status(404).json({ error: "Restaurant not found or unauthorized" });
      return;
    }

    const bookings = await Booking.find({ restaurantId: id })
      .populate("customerId", "firstName lastName email")
      .sort({ date: -1 });

    console.log("Found bookings:", bookings.length);
    res.json({ bookings });
  } catch (error) {
    console.error("Error fetching restaurant bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};

export const getRestaurantStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const ownerId = (req as any).user.id;

    // Verify the user owns this restaurant
    const restaurant = await Restaurant.findOne({ _id: id, ownerId });
    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found or unauthorized" });
      return;
    }

    const totalBookings = await Booking.countDocuments({ restaurantId: id });
    const totalReviews = await Review.countDocuments({ restaurantId: id });
    const avgRating = await Review.aggregate([
      { $match: { restaurantId: id } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);

    res.json({
      totalBookings,
      totalReviews,
      averageRating: avgRating.length > 0 ? avgRating[0].avgRating : 0,
    });
  } catch (error) {
    console.error("Error fetching restaurant stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

export const getRestaurants = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // SECURITY: Input sanitization and validation
    const {
      page = "1",
      limit = "10",
      location,
      cuisine,
      latitude,
      longitude,
      radius = "10",
      priceRange,
    } = req.query;

    // SECURITY: Validate and sanitize all inputs
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 1000) {
      res.status(400).json({ error: "Invalid page number (1-1000)" });
      return;
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({ error: "Invalid limit (1-100)" });
      return;
    }

    // SECURITY: Sanitize string inputs to prevent injection
    const sanitizeString = (str: string) => {
      return str.replace(/[<>\"'%;()&+]/g, "").trim();
    };

    let sanitizedLocation = "";
    let sanitizedCuisine = "";
    let sanitizedPriceRange = "";

    if (location && typeof location === 'string') {
      sanitizedLocation = sanitizeString(location);
      if (sanitizedLocation.length > 100) {
        res.status(400).json({ error: "Location search too long" });
        return;
      }
    }

    if (cuisine && typeof cuisine === 'string') {
      sanitizedCuisine = sanitizeString(cuisine);
      if (sanitizedCuisine.length > 50) {
        res.status(400).json({ error: "Cuisine search too long" });
        return;
      }
    }

    if (priceRange && typeof priceRange === 'string') {
      sanitizedPriceRange = sanitizeString(priceRange);
      if (!['$', '$$', '$$$', '$$$$'].includes(sanitizedPriceRange)) {
        res.status(400).json({ error: "Invalid price range" });
        return;
      }
    }

    // OPTIMIZATION 2: Server-side caching with secure key generation
    const secureQuery = {
      page: pageNum,
      limit: limitNum,
      location: sanitizedLocation,
      cuisine: sanitizedCuisine,
      priceRange: sanitizedPriceRange,
      latitude: latitude ? parseFloat(latitude as string) : undefined,
      longitude: longitude ? parseFloat(longitude as string) : undefined,
      radius: parseFloat(radius as string)
    };
    
    const cacheKey = `getRestaurants_${JSON.stringify(secureQuery)}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      res.json(cachedResult);
      return;
    }

    const filter: any = { isActive: true };
    let aggregationPipeline: any[] = [];

    // Location-based search using coordinates
    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusInKm = parseFloat(radius as string);

      if (isNaN(lat) || isNaN(lng) || isNaN(radiusInKm)) {
        res.status(400).json({ error: "Invalid coordinates or radius" });
        return;
      }

      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        res.status(400).json({ error: "Coordinates out of valid range" });
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
          maxDistance: radiusInKm * 1000, // Convert km to meters
          spherical: true,
          key: "geometry", // Specify the field to search
          query: { isActive: true }, // Add isActive filter to geoNear
        },
      });
    }

    // Text-based location search (fallback)
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    // Cuisine filter
    if (cuisine) {
      const cuisineFilter = { cuisine: cuisine };
      if (aggregationPipeline.length > 0) {
        aggregationPipeline.push({ $match: cuisineFilter });
      } else {
        filter.cuisine = cuisine;
      }
    }

    // Price range filter
    if (priceRange) {
      const priceFilter = { priceRange: parseInt(priceRange as string) };
      if (aggregationPipeline.length > 0) {
        aggregationPipeline.push({ $match: priceFilter });
      } else {
        filter.priceRange = parseInt(priceRange as string);
      }
    }

    // Pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    let result;
    if (aggregationPipeline.length > 0) {
      // Use aggregation for geospatial queries
      aggregationPipeline.push(
        { $sort: latitude && longitude ? { distance: 1 } : { name: 1 } },
        { $skip: skip },
        { $limit: parseInt(limit as string) },
      );

      result = await Restaurant.aggregate(aggregationPipeline);
    } else {
      // Use regular find for simple queries
      result = await Restaurant.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit as string));
    }

    // Get total count for pagination
    const total = await Restaurant.countDocuments(filter);

    const response = {
      restaurants: result,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
      filters: { location, cuisine, priceRange, latitude, longitude, radius },
    };

    // Cache the result (convert to plain object to avoid Mongoose document issues)
    const cacheableResponse = {
      restaurants: result.map(r => r.toObject ? r.toObject() : r),
      pagination: response.pagination,
      filters: response.filters,
    };
    cache.set(cacheKey, cacheableResponse);

    res.json(response);
  } catch (error) {
    console.error("Restaurant search error:", error);
    res.status(500).json({ error: "Failed to fetch restaurants" });
  }
};

export const getNearbyRestaurants = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    // OPTIMIZATION 3: Cache nearby restaurant queries
    const cacheKey = `getNearbyRestaurants_${latitude}_${longitude}_${radius}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      res.json(cachedResult);
      return;
    }

    if (!latitude || !longitude) {
      res.status(400).json({ error: "Latitude and longitude are required" });
      return;
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radiusInKm = parseFloat(radius as string);

    if (isNaN(lat) || isNaN(lng) || isNaN(radiusInKm)) {
      res.status(400).json({ error: "Invalid coordinates or radius" });
      return;
    }

    const restaurants = await Restaurant.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat],
          },
          distanceField: "distance",
          maxDistance: radiusInKm * 1000, // Convert km to meters
          spherical: true,
          key: "geometry", // Specify the field to search
          query: { isActive: true }, // Add isActive filter to geoNear
        },
      },
      {
        $sort: { distance: 1 },
      },
    ]);

    const response = { restaurants };
    
    // Cache the result (convert to plain object to avoid Mongoose document issues)
    const cacheableResponse = {
      restaurants: restaurants.map(r => r.toObject ? r.toObject() : r)
    };
    cache.set(cacheKey, cacheableResponse);

    res.json(response);
  } catch (error) {
    console.error("Error fetching nearby restaurants:", error);
    res.status(500).json({ error: "Failed to fetch nearby restaurants" });
  }
};

// Menu management functions
export const getMenuItems = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id: restaurantId } = req.params;
    const restaurant = await Restaurant.findById(restaurantId).select('menu');
    
    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found" });
      return;
    }

    const restaurantData = restaurant as any;
    res.json({ menu: restaurantData.menu || [] });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
};

export const createMenuItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id: restaurantId } = req.params;
    const ownerId = (req as any).user.id;
    const { name, description, price, category, isAvailable = true } = req.body;

    // Verify the user owns this restaurant
    const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId });
    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found or unauthorized" });
      return;
    }

    const newMenuItem = {
      name,
      description,
      price: parseFloat(price),
      category,
      isAvailable,
    };

    const restaurantData = restaurant as any;
    restaurantData.menu = restaurantData.menu || [];
    restaurantData.menu.push(newMenuItem);
    
    await restaurant.save();

    res.status(201).json({ 
      message: "Menu item created successfully", 
      menuItem: newMenuItem 
    });
  } catch (error) {
    console.error("Error creating menu item:", error);
    res.status(500).json({ error: "Failed to create menu item" });
  }
};

export const updateMenuItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id: restaurantId, itemId } = req.params;
    const ownerId = (req as any).user.id;

    // Verify the user owns this restaurant
    const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId });
    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found or unauthorized" });
      return;
    }

    const restaurantData = restaurant as any;
    const menuItem = restaurantData.menu?.id(itemId);
    if (!menuItem) {
      res.status(404).json({ error: "Menu item not found" });
      return;
    }

    // Update menu item fields
    Object.assign(menuItem, req.body);
    await restaurant.save();

    res.json({ 
      message: "Menu item updated successfully", 
      menuItem 
    });
  } catch (error) {
    console.error("Error updating menu item:", error);
    res.status(500).json({ error: "Failed to update menu item" });
  }
};

export const deleteMenuItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id: restaurantId, itemId } = req.params;
    const ownerId = (req as any).user.id;

    // Verify the user owns this restaurant
    const restaurant = await Restaurant.findOne({ _id: restaurantId, ownerId });
    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found or unauthorized" });
      return;
    }

    const restaurantData = restaurant as any;
    const menuItem = restaurantData.menu?.id(itemId);
    if (!menuItem) {
      res.status(404).json({ error: "Menu item not found" });
      return;
    }

    restaurantData.menu?.pull(itemId);
    await restaurant.save();

    res.json({ message: "Menu item deleted successfully" });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).json({ error: "Failed to delete menu item" });
  }
};
