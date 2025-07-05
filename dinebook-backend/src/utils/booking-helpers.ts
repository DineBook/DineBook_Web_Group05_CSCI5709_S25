import { Response } from "express";
import { Restaurant, Booking, User } from "../models/";

// Validation utilities
export class BookingValidators {
    static validateDateFormat(date: string): boolean {
        return /^\d{4}-\d{2}-\d{2}$/.test(date);
    }

    static validateTimeFormat(time: string): boolean {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
    }

    static validateGuestCount(guests: number): boolean {
        return guests >= 1 && guests <= 20;
    }

    static isFutureDate(date: string): boolean {
        const bookingDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return bookingDate >= today;
    }

    static isTimeWithinHours(time: string, openTime: string, closeTime: string): boolean {
        const [reqHour, reqMinute] = time.split(':').map(Number);
        const [openHour, openMinute] = openTime.split(':').map(Number);
        const [closeHour, closeMinute] = closeTime.split(':').map(Number);

        const requestedMinutes = reqHour * 60 + reqMinute;
        const openMinutes = openHour * 60 + openMinute;
        const closeMinutes = closeHour * 60 + closeMinute;

        return requestedMinutes >= openMinutes && requestedMinutes < closeMinutes;
    }
}

// Response utilities
export class ResponseHelper {
    static sendError(res: Response, status: number, message: string): void {
        res.status(status).json({ error: message });
    }

    static sendValidationError(res: Response, message: string): void {
        ResponseHelper.sendError(res, 400, message);
    }

    static sendNotFoundError(res: Response, message: string): void {
        ResponseHelper.sendError(res, 404, message);
    }

    static sendConflictError(res: Response, message: string): void {
        ResponseHelper.sendError(res, 409, message);
    }
}

// Database utilities
export class BookingDatabase {
    static async findRestaurantById(restaurantId: string) {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant || !restaurant.isActive) {
            throw new Error('Restaurant not found or not active');
        }
        return restaurant;
    }

    static async findUserById(userId: string) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    static async findUserBookingById(bookingId: string, customerId: string) {
        const booking = await Booking.findOne({
            _id: bookingId,
            customerId: customerId
        })
        .populate('restaurantId', 'name location address phoneNumber email')
        .populate('customerId', 'name email');

        if (!booking) {
            throw new Error("Booking not found or you don't have permission to view it");
        }
        return booking;
    }

    static async getExistingBookings(restaurantId: string, date: string, time?: string) {
        const query: any = {
            restaurantId,
            date,
            status: { $in: ['confirmed', 'pending'] }
        };

        if (time) {
            query.time = time;
        }

        return await Booking.find(query);
    }
}

// Time utilities
export class TimeHelper {
    static generateTimeSlots(openTime: string, closeTime: string): string[] {
        const slots: string[] = [];
        const [openHour, openMinute] = openTime.split(':').map(Number);
        const [closeHour, closeMinute] = closeTime.split(':').map(Number);
        
        let currentHour = openHour;
        let currentMinute = openMinute;
        
        while (currentHour < closeHour || (currentHour === closeHour && currentMinute < closeMinute)) {
            const timeSlot = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
            slots.push(timeSlot);
            
            currentMinute += 30;
            if (currentMinute >= 60) {
                currentMinute -= 60;
                currentHour += 1;
            }
        }
        
        return slots;
    }

    static getDayOfWeek(date: string): string {
        return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    }

    static getOpeningHours(restaurant: any, dayOfWeek: string) {
        return restaurant.openingHours?.[dayOfWeek as keyof typeof restaurant.openingHours];
    }

    static isRestaurantClosed(openingHours: any): boolean {
        return !openingHours?.open || !openingHours?.close;
    }

    static calculateAvailableCapacity(restaurant: any, existingBookings: any[]): number {
        const totalBookedGuests = existingBookings.reduce((sum, booking) => sum + booking.guests, 0);
        return restaurant.capacity - totalBookedGuests;
    }
}

// Input validation
export class BookingInputValidator {
    static validateCreateBookingInput(body: any): string | null {
        const { restaurantId, date, time, guests } = body;

        if (!restaurantId || !date || !time || !guests) {
            return "Restaurant ID, date, time, and number of guests are required";
        }

        if (!BookingValidators.validateDateFormat(date)) {
            return "Date must be in YYYY-MM-DD format";
        }

        if (!BookingValidators.validateTimeFormat(time)) {
            return "Time must be in HH:MM format (24-hour)";
        }

        if (!BookingValidators.validateGuestCount(guests)) {
            return "Number of guests must be between 1 and 20";
        }

        if (!BookingValidators.isFutureDate(date)) {
            return "Cannot book a table for past dates";
        }

        return null;
    }

    static validateAvailabilityInput(query: any): string | null {
        const { restaurantId, date } = query;

        if (!restaurantId || !date) {
            return "Restaurant ID and date are required";
        }

        if (!BookingValidators.validateDateFormat(date)) {
            return "Date must be in YYYY-MM-DD format";
        }

        return null;
    }
} 