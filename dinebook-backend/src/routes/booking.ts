import express from 'express';
import { getAvailability, createBooking, getBookingById, cancelBooking } from '../controllers/';
import { authenticate } from '../utils';

const router = express.Router();

// GET /api/bookings/availability?restaurantId=xxx&date=yyyy-mm-dd
router.get('/availability', authenticate as any, getAvailability as any);

// POST /api/bookings
router.post('/', authenticate as any, createBooking as any);

// GET /api/bookings/:id - Get booking by ID (only if user owns it)
router.get('/:id', authenticate as any, getBookingById as any);

// DELETE /api/bookings/:id - Cancel booking (only if user owns it)
router.delete('/:id', authenticate as any, cancelBooking as any);

export default router; 