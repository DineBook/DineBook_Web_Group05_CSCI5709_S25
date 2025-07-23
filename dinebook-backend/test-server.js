const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Mock endpoint that exactly matches what the frontend expects
app.get('/api/restaurants', (req, res) => {
  const { latitude, longitude, radius = 5, page = 1, limit = 2, location, cuisine, priceRange } = req.query;
  
  console.log('Received request:', {
    latitude, longitude, radius, page, limit, location, cuisine, priceRange
  });

  // Return mock data in the expected format
  res.json({
    restaurants: [
      {
        _id: "1",
        name: "Test Restaurant 1",
        cuisine: "Italian",
        priceRange: 2,
        rating: 4.5,
        address: {
          street: "123 Test St",
          city: "Halifax",
          province: "NS",
          postalCode: "B3H 4R2"
        },
        geometry: {
          type: "Point",
          coordinates: [parseFloat(longitude || -63.59), parseFloat(latitude || 44.63)]
        },
        distanceKm: 1.2,
        isActive: true,
        description: "Amazing Italian cuisine with fresh ingredients",
        images: [],
        ownerId: "owner1"
      },
      {
        _id: "2", 
        name: "Test Restaurant 2",
        cuisine: "Mexican",
        priceRange: 1,
        rating: 4.0,
        address: {
          street: "456 Test Ave",
          city: "Halifax",
          province: "NS", 
          postalCode: "B3H 4R3"
        },
        geometry: {
          type: "Point",
          coordinates: [parseFloat(longitude || -63.58), parseFloat(latitude || 44.64)]
        },
        distanceKm: 2.1,
        isActive: true,
        description: "Authentic Mexican flavors in the heart of Halifax",
        images: [],
        ownerId: "owner2"
      }
    ],
    userLocation: {
      latitude: parseFloat(latitude || 44.63),
      longitude: parseFloat(longitude || -63.59)
    },
    searchRadius: parseFloat(radius),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: 2,
      pages: 1
    },
    filters: { cuisine, priceRange, location },
    message: "Found 2 restaurants within " + radius + "km"
  });
});

// Mock reviews endpoint
app.get('/api/reviews', (req, res) => {
  const { restaurantId } = req.query;
  
  res.json({
    reviews: [
      {
        _id: "1",
        restaurantId: restaurantId || "1",
        userId: "user1",
        rating: 5,
        title: "Great food!",
        comment: "Amazing experience",
        createdAt: new Date().toISOString()
      }
    ],
    stats: {
      averageRating: 4.5,
      totalReviews: 1
    }
  });
});

// Mock my reviews endpoint
app.get('/api/reviews/my', (req, res) => {
  res.json({
    reviews: [
      {
        _id: "1",
        restaurantId: "1",
        userId: "user1",
        rating: 5,
        title: "Great Experience",
        comment: "Food was amazing, service was excellent",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        _id: "2", 
        restaurantId: "2",
        userId: "user1",
        rating: 4,
        title: "Good Food",
        comment: "Tasty Mexican food, would recommend",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  });
});

// Mock restaurant by ID endpoint
app.get('/api/restaurants/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    _id: id,
    name: `Restaurant ${id}`,
    cuisine: "Italian",
    priceRange: 2,
    rating: 4.5,
    address: {
      street: "123 Test St",
      city: "Halifax",
      province: "NS",
      postalCode: "B3H 4R2"
    },
    description: "Amazing restaurant with great food",
    images: [],
    isActive: true
  });
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('API endpoints available:');
  console.log('- GET /api/restaurants?latitude=44.63&longitude=-63.59&radius=5&page=1&limit=2');
  console.log('- GET /api/reviews?restaurantId=1');
  console.log('- GET /api/reviews/my');
  console.log('- GET /api/restaurants/:id');
});
