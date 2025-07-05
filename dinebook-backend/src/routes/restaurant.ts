import express from 'express';
import { createRestaurant, getRestaurants, getRestaurantById } from '../controllers/';
import { authenticate } from '../utils';

const router = express.Router();

router.get('/', authenticate as any, getRestaurants as any);
router.post('/', authenticate as any, createRestaurant as any);
router.get('/:id', authenticate as any, getRestaurantById as any);

export default router;
