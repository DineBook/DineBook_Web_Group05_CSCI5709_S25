import express from "express";
import {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  getMyRestaurants,
  getRestaurantBookings,
  getRestaurantStats,
  updateRestaurant,
  deleteRestaurant,
  getNearbyRestaurants,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/";
import { authenticate, checkOwner, optionalImageUpload } from "../utils";

const router = express.Router();

// Public routes - no authentication needed for browsing
router.get("/nearby", getNearbyRestaurants as any);
router.get("/", getRestaurants as any);

// Owner-specific routes
router.post(
  "/",
  authenticate as any,
  checkOwner as any,
  optionalImageUpload,
  createRestaurant as any
);
router.get(
  "/my",
  authenticate as any,
  checkOwner as any,
  getMyRestaurants as any
);

router.get("/:id", getRestaurantById as any);
router.put(
  "/:id",
  authenticate as any,
  checkOwner as any,
  optionalImageUpload,
  updateRestaurant as any
);
router.delete(
  "/:id",
  authenticate as any,
  checkOwner as any,
  deleteRestaurant as any
);
router.get(
  "/:id/bookings",
  authenticate as any,
  checkOwner as any,
  getRestaurantBookings as any
);
router.get(
  "/:id/stats",
  authenticate as any,
  checkOwner as any,
  getRestaurantStats as any
);

// Menu management routes
router.get("/:id/menu", authenticate as any, getMenuItems as any);
router.post(
  "/:id/menu",
  authenticate as any,
  checkOwner as any,
  createMenuItem as any
);
router.put(
  "/:id/menu/:itemId",
  authenticate as any,
  checkOwner as any,
  updateMenuItem as any
);
router.delete(
  "/:id/menu/:itemId",
  authenticate as any,
  checkOwner as any,
  deleteMenuItem as any
);

export default router;
