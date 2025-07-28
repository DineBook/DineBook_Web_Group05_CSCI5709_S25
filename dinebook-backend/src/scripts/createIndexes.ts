import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dinebook';

async function createIndexes() {
  try {
    console.log('Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection not established');
    }

    // Restaurant indexes for performance optimization
    console.log('Creating restaurant indexes...');
    await db.collection('restaurants').createIndex({ 
      "location.coordinates": "2dsphere" 
    }, { name: "location_geospatial_index" });
    
    await db.collection('restaurants').createIndex({ 
      "name": "text", 
      "description": "text", 
      "cuisine": "text" 
    }, { name: "restaurant_search_index" });
    
    await db.collection('restaurants').createIndex({ 
      "cuisine": 1 
    }, { name: "cuisine_index" });
    
    await db.collection('restaurants').createIndex({ 
      "priceRange": 1 
    }, { name: "price_range_index" });
    
    await db.collection('restaurants').createIndex({ 
      "rating": -1 
    }, { name: "rating_desc_index" });

    // Review indexes
    console.log('Creating review indexes...');
    await db.collection('reviews').createIndex({ 
      "restaurantId": 1, 
      "createdAt": -1 
    }, { name: "restaurant_reviews_index" });
    
    await db.collection('reviews').createIndex({ 
      "userId": 1 
    }, { name: "user_reviews_index" });

    // Booking indexes
    console.log('Creating booking indexes...');
    await db.collection('bookings').createIndex({ 
      "restaurantId": 1, 
      "bookingDate": 1, 
      "bookingTime": 1 
    }, { name: "availability_check_index" });
    
    await db.collection('bookings').createIndex({ 
      "userId": 1, 
      "bookingDate": -1 
    }, { name: "user_bookings_index" });
    
    await db.collection('bookings').createIndex({ 
      "restaurantId": 1, 
      "status": 1 
    }, { name: "restaurant_booking_status_index" });

    // User indexes
    console.log('Creating user indexes...');
    await db.collection('users').createIndex({ 
      "email": 1 
    }, { unique: true, name: "email_unique_index" });

    // Favorite indexes
    console.log('Creating favorite indexes...');
    await db.collection('favorites').createIndex({ 
      "userId": 1, 
      "restaurantId": 1 
    }, { unique: true, name: "user_restaurant_favorite_index" });

    console.log('All indexes created successfully!');
    
    // List all indexes to verify
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      console.log(`\nIndexes for ${collection.name}:`);
      const indexes = await db.collection(collection.name).listIndexes().toArray();
      indexes.forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }

  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createIndexes();
