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
import { authenticate , optionalImageUpload } from '../utils';

const router = express.Router();

// Customer routes (authenticated)
router.post('/', authenticate as any, optionalImageUpload, createReview as any);
router.put('/:id', authenticate as any, optionalImageUpload, updateReview as any);
router.delete('/:id', authenticate as any, deleteReview as any);
router.get('/my-reviews', authenticate as any, getMyReviews as any);

// Public route
router.get('/restaurant/:restaurantId', getReviewsByRestaurant as any);

// Owner routes (authenticated)
router.post('/:id/reply', authenticate as any, replyToReview as any);
router.put('/:id/reply', authenticate as any, updateReply as any);
router.delete('/:id/reply', authenticate as any, deleteReply as any);

export default router;