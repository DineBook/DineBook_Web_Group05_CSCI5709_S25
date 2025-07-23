import express from 'express';
import {
    createRestaurant,
    getRestaurants,
    getRestaurantById,
    getMyRestaurants,
    getRestaurantBookings,
    getRestaurantStats,
    updateRestaurant
} from '../controllers/';
import { authenticate, checkOwner } from '../utils';

const router = express.Router();

// Public routes - no authentication needed for browsing
router.get('/', getRestaurants as any);

// Owner-specific routes
router.post('/', authenticate as any, checkOwner as any, createRestaurant as any);
router.get('/my', authenticate as any, checkOwner as any, getMyRestaurants as any);

router.get('/:id', getRestaurantById as any);
router.put('/:id', authenticate as any, checkOwner as any, updateRestaurant as any);
router.get('/:id/bookings', authenticate as any, checkOwner as any, getRestaurantBookings as any);
router.get('/:id/stats', authenticate as any, checkOwner as any, getRestaurantStats as any);

export default router;
