import express from 'express';
import {
  createReview,
  updateReview,
  deleteReview,
  getReviewsByRestaurant,
  replyToReview,
  getMyReviews,
  updateReply,
  deleteReply,
} from '../controllers/review';
import { authenticate } from '../utils';

const router = express.Router();

// POST with restaurantId as route param
router.post('/:restaurantId', authenticate as any, createReview as any); 

// Customer routes (authenticated)
router.put('/:id', authenticate as any, updateReview as any);
router.delete('/:id', authenticate as any, deleteReview as any);
router.get('/my-reviews', authenticate as any, getMyReviews as any);

// Public route
router.get('/restaurant/:restaurantId', getReviewsByRestaurant as any);

// Owner routes (authenticated)
router.post('/:id/reply', authenticate as any, replyToReview as any);
router.put('/:id/reply', authenticate as any, updateReply as any);
router.delete('/:id/reply', authenticate as any, deleteReply as any);

export default router;
