import mongoose from 'mongoose';

export const restaurantSchema = new mongoose.Schema({
    _averageRating: {
        type: Number,
        default: 0
    },
    name: {
        type: String,
        required: [true, 'Restaurant name is required'],
        trim: true,
        maxlength: [100, 'Restaurant name cannot exceed 100 characters']
    },
    cuisine: {
        type: String,
        required: [true, 'Cuisine type is required'],
        enum: ['Italian', 'Indian', 'Chinese', 'Mexican', 'American', 'Thai', 'Japanese', 'Mediterranean', 'French', 'Other']
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    coordinates: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere'
        }
    },
    address: {
        street: String,
        city: String,
        province: String,
        postalCode: String
    },
    priceRange: {
        type: Number,
        required: [true, 'Price range is required'],
        min: [1, 'Price range must be between 1-4'],
        max: [4, 'Price range must be between 1-4']
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Owner ID is required']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    phoneNumber: {
        type: String,
        match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
    },
    email: {
        type: String,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    capacity: {
        type: Number,
        default: 50,
        min: [1, 'Capacity must be at least 1']
    },
    openingHours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

restaurantSchema.virtual('averageRating').get(function () {
    return this._averageRating || 0;
});

export const Restaurant = mongoose.model('Restaurant', restaurantSchema);
