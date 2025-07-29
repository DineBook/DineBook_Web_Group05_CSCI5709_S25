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
      latitude: {
        type: Number,
        min: [-90, "Latitude must be between -90 and 90 (North/South)"],
        max: [90, "Latitude must be between -90 and 90 (North/South)"],
        required: false,
      },
      longitude: {
        type: Number,
        min: [-180, "Longitude must be between -180 and 180 (East/West)"],
        max: [180, "Longitude must be between -180 and 180 (East/West)"],
        required: false,
      },
    },
       geometry: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude] - MongoDB requirement
        validate: {
          validator: function (coordinates: number[]) {
            // Only validate if coordinates are provided
            if (!coordinates || coordinates.length === 0) return true;
            return (
              coordinates.length === 2 &&
              coordinates[0] >= -180 &&
              coordinates[0] <= 180 && // longitude
              coordinates[1] >= -90 &&
              coordinates[1] <= 90 // latitude
            );
          },
          message:
            "Coordinates must be [longitude, latitude] with valid ranges",
        },
      },
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
    },
    imageUrl: {
        type: String
    },
    menuItems: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            default: () => new mongoose.Types.ObjectId()
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: [100, 'Menu item name cannot exceed 100 characters']
        },
        description: {
            type: String,
            maxlength: [300, 'Menu item description cannot exceed 300 characters']
        },
        price: {
            type: Number,
            required: true,
            min: [0, 'Price must be positive']
        },
        category: {
            type: String,
            required: true,
            enum: ['Appetizers', 'Mains', 'Desserts', 'Beverages', 'Salads', 'Soups', 'Specials', 'Other']
        },
        imageUrl: {
            type: String
        },
        isVegetarian: {
            type: Boolean,
            default: false
        },
        isVegan: {
            type: Boolean,
            default: false
        },
        isGlutenFree: {
            type: Boolean,
            default: false
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

restaurantSchema.virtual('averageRating').get(function () {
    return this._averageRating || 0;
});

restaurantSchema.index({ geometry: "2dsphere" }, { sparse: true }); // Create 2dsphere index for geospatial queries

export const Restaurant = mongoose.model('Restaurant', restaurantSchema);
