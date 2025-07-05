import mongoose from 'mongoose';

export const bookingSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Customer ID is required']
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'Restaurant ID is required']
    },
    date: {
        type: String,
        required: [true, 'Booking date is required'],
        trim: true,
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
    },
    time: {
        type: String,
        required: [true, 'Booking time is required'],
        trim: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format (24-hour)']
    },
    guests: {
        type: Number,
        required: [true, 'Number of guests is required'],
        min: [1, 'Must have at least 1 guest'],
        max: [20, 'Cannot exceed 20 guests']
    },
    specialRequests: {
        type: String,
        trim: true,
        maxlength: [500, 'Special requests cannot exceed 500 characters']
    },
    status: {
        type: String,
        enum: ['confirmed', 'pending', 'cancelled', 'completed'],
        default: 'confirmed'
    }
}, {
    timestamps: true
});

bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ restaurantId: 1, date: 1, time: 1 });

export const Booking = mongoose.model('Booking', bookingSchema); 