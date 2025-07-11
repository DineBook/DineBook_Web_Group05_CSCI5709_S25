import { Request, Response } from "express";
import mongoose from "mongoose";
import { Booking } from "../models/";
import { sendBookingConfirmationEmail } from "../utils/email";
import {
    BookingValidators,
    ResponseHelper,
    BookingDatabase,
    TimeHelper,
    BookingInputValidator
} from "../utils/booking-helpers";
import type { AuthenticatedRequest, CreateBookingBody } from "../types";

export const getAvailability = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { restaurantId, date } = req.query as { restaurantId: string; date: string };

        const validationError = BookingInputValidator.validateAvailabilityInput(req.query);
        if (validationError) {
            return ResponseHelper.sendValidationError(res, validationError);
        }

        const restaurant = await BookingDatabase.findRestaurantById(restaurantId);

        const dayOfWeek = TimeHelper.getDayOfWeek(date);
        const openingHours = TimeHelper.getOpeningHours(restaurant, dayOfWeek);

        if (TimeHelper.isRestaurantClosed(openingHours)) {
            res.json({
                restaurantId,
                date,
                availableSlots: [],
                message: `Restaurant is closed on ${dayOfWeek}`
            });
            return;
        }

        const timeSlots = TimeHelper.generateTimeSlots(openingHours.open, openingHours.close);
        const existingBookings = await Booking.find({
            restaurantId,
            date,
            status: { $in: ['confirmed', 'pending'] }
        });

        const bookingCounts: { [key: string]: number } = {};
        existingBookings.forEach(booking => {
            bookingCounts[booking.time] = (bookingCounts[booking.time] || 0) + booking.guests;
        });

        const availableSlots = timeSlots.map(time => {
            const bookedGuests = bookingCounts[time] || 0;
            const availableCapacity = restaurant.capacity - bookedGuests;

            return {
                time,
                available: availableCapacity > 0,
                availableCapacity,
                totalCapacity: restaurant.capacity
            };
        });

        res.json({
            restaurantId,
            restaurantName: restaurant.name,
            date,
            dayOfWeek,
            openingHours: {
                open: openingHours.open,
                close: openingHours.close
            },
            availableSlots,
            totalSlots: timeSlots.length
        });

    } catch (error) {
        console.error("Availability fetch error:", error);

        if (error instanceof Error) {
            if (error.name === "CastError") {
                return ResponseHelper.sendValidationError(res, "Invalid restaurant ID");
            }
            if (error.message.includes('Restaurant not found')) {
                return ResponseHelper.sendNotFoundError(res, error.message);
            }
        }

        ResponseHelper.sendError(res, 500, "Failed to fetch availability");
    }
};

export const createBooking = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { restaurantId, date, time, guests, specialRequests } = req.body;
        const customerId = req.user.id;

        const validationError = BookingInputValidator.validateCreateBookingInput(req.body);
        if (validationError) {
            return ResponseHelper.sendValidationError(res, validationError);
        }

        const [restaurant, user] = await Promise.all([
            BookingDatabase.findRestaurantById(restaurantId),
            BookingDatabase.findUserById(customerId)
        ]);

        const dayOfWeek = TimeHelper.getDayOfWeek(date);
        const openingHours = TimeHelper.getOpeningHours(restaurant, dayOfWeek);

        if (TimeHelper.isRestaurantClosed(openingHours)) {
            return ResponseHelper.sendValidationError(res, `Restaurant is closed on ${dayOfWeek}`);
        }

        if (!BookingValidators.isTimeWithinHours(time, openingHours.open, openingHours.close)) {
            return ResponseHelper.sendValidationError(res,
                `Requested time is outside restaurant hours (${openingHours.open} - ${openingHours.close})`
            );
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        let booking: any;

        try {
            const existingBookings = await Booking.find({
                restaurantId,
                date,
                time,
                status: { $in: ['confirmed', 'pending'] }
            }).session(session);

            const bookedGuests = existingBookings.reduce((total, booking) => total + booking.guests, 0);
            const availableCapacity = restaurant.capacity - bookedGuests;

            if (availableCapacity < guests) {
                await session.abortTransaction();
                return ResponseHelper.sendConflictError(res,
                    `This time slot is fully booked. Available capacity: ${availableCapacity}, Requested: ${guests}`
                );
            }

            booking = new Booking({
                customerId,
                restaurantId,
                date,
                time,
                guests,
                specialRequests: specialRequests?.trim() || undefined,
                status: 'confirmed'
            });

            await booking.save({ session });
            await session.commitTransaction();
            await sendConfirmationEmail(user.email, booking, restaurant.name, specialRequests);

        } catch (transactionError) {
            console.error('Error during booking creation:', transactionError);
            await session.abortTransaction();
            throw transactionError;
        } finally {
            session.endSession();
        }

        res.status(201).json({
            message: "Booking created successfully",
            booking: {
                id: booking._id,
                customerId: booking.customerId,
                restaurantId: booking.restaurantId,
                restaurantName: restaurant.name,
                date: booking.date,
                time: booking.time,
                guests: booking.guests,
                specialRequests: booking.specialRequests,
                status: booking.status,
                createdAt: booking.createdAt
            }
        });

    } catch (error) {
        console.error("Booking creation error:", error);
        handleBookingError(res, error);
    }
};

export const getBookingById = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const customerId = req.user.id;

        const booking = await BookingDatabase.findUserBookingById(id, customerId);

        res.json({
            booking: {
                id: booking._id,
                customerId: booking.customerId,
                restaurantId: booking.restaurantId,
                date: booking.date,
                time: booking.time,
                guests: booking.guests,
                specialRequests: booking.specialRequests,
                status: booking.status,
                createdAt: booking.createdAt,
                updatedAt: booking.updatedAt
            }
        });

    } catch (error) {
        console.error("Get booking error:", error);
        handleBookingError(res, error);
    }
};

export const cancelBooking = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const customerId = req.user.id;

        const booking = await BookingDatabase.findUserBookingById(id, customerId);

        if (booking.status === 'cancelled') {
            return ResponseHelper.sendValidationError(res, "Booking is already cancelled");
        }

        const bookingDateTime = new Date(`${booking.date}T${booking.time}:00`);
        const now = new Date();

        if (bookingDateTime < now) {
            return ResponseHelper.sendValidationError(res, "Cannot cancel past bookings");
        }

        booking.status = 'cancelled';
        await booking.save();

        res.json({
            message: "Booking cancelled successfully",
            booking: {
                id: booking._id,
                customerId: booking.customerId,
                restaurantId: booking.restaurantId,
                restaurantName: (booking.restaurantId as any).name,
                date: booking.date,
                time: booking.time,
                guests: booking.guests,
                specialRequests: booking.specialRequests,
                status: booking.status,
                updatedAt: booking.updatedAt
            }
        });

    } catch (error) {
        console.error("Cancel booking error:", error);
        handleBookingError(res, error);
    }
};

async function sendConfirmationEmail(
    userEmail: string,
    booking: any,
    restaurantName: string,
    specialRequests?: string
): Promise<void> {
    try {
        console.log(`Attempting to send email to: ${userEmail}`);

        await sendBookingConfirmationEmail(userEmail, {
            bookingId: booking._id.toString(),
            restaurantName,
            date: booking.date,
            time: booking.time,
            guests: booking.guests,
            specialRequests
        });

        console.log(`Booking confirmation email sent successfully to: ${userEmail}`);
    } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        console.error("Email error details:", {
            userEmail,
            errorMessage: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
    }
}

export const getUserBookings = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const customerId = req.user.id;
        const { status, dateFrom, dateTo } = req.query as {
            status?: string;
            dateFrom?: string;
            dateTo?: string;
        };

        const filter: any = { customerId };
        if (status && status !== 'all') filter.status = status;
        if (dateFrom || dateTo) {
            filter.date = {};
            if (dateFrom) filter.date.$gte = dateFrom;
            if (dateTo) filter.date.$lte = dateTo;
        }

        const bookings = await Booking.find(filter)
            .populate('restaurantId', 'name')
            .sort({ createdAt: -1 });

        const formattedBookings = bookings.map(booking => ({
            id: booking._id,
            customerId: booking.customerId,
            restaurantId: booking.restaurantId._id,
            restaurantName: (booking.restaurantId as any).name,
            date: booking.date,
            time: booking.time,
            guests: booking.guests,
            specialRequests: booking.specialRequests,
            status: booking.status,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt
        }));

        res.json(formattedBookings);

    } catch (error) {
        console.error("Get user bookings error:", error);
        handleBookingError(res, error);
    }
};

export const getBookingStats = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const customerId = req.user.id;
        const now = new Date();
        const todayString = now.toISOString().split('T')[0];

        const [
            totalBookings,
            upcomingBookings,
            completedBookings,
            cancelledBookings
        ] = await Promise.all([
            Booking.countDocuments({ customerId }),
            Booking.countDocuments({
                customerId,
                status: 'confirmed',
                $or: [
                    { date: { $gt: todayString } },
                    {
                        date: todayString,
                        time: { $gt: now.toTimeString().slice(0, 5) }
                    }
                ]
            }),
            Booking.countDocuments({
                customerId,
                status: { $in: ['completed'] }
            }),
            Booking.countDocuments({
                customerId,
                status: 'cancelled'
            })
        ]);

        res.json({
            totalBookings,
            upcomingBookings,
            completedBookings,
            cancelledBookings
        });

    } catch (error) {
        console.error("Get booking stats error:", error);
        handleBookingError(res, error);
    }
};

function handleBookingError(res: Response, error: any): void {
    if (error instanceof Error) {
        if (error.name === "CastError") {
            return ResponseHelper.sendValidationError(res, "Invalid ID format");
        }
        if (error.name === "ValidationError") {
            return ResponseHelper.sendValidationError(res, "Validation error: " + error.message);
        }
        if (error.message.includes('not found') || error.message.includes('permission')) {
            return ResponseHelper.sendNotFoundError(res, error.message);
        }
        if (error.message.includes('Restaurant not found') || error.message.includes('User not found')) {
            return ResponseHelper.sendNotFoundError(res, error.message);
        }
    }

    ResponseHelper.sendError(res, 500, "An unexpected error occurred");
} 