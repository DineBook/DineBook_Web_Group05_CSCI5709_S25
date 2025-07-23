import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurant';
import bookingRoutes from './routes/booking';
import reviewRoutes from './routes/review';

// Load environment variables from .env file (one level above since this file is in src)
dotenv.config();

// Ensure required environment variables are set
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in the .env file');
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in the .env file');
}

// Load environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'dine-book';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
console.log('Connecting to MongoDB:', MONGODB_URI);
mongoose.connect(MONGODB_URI, { dbName: DB_NAME })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  });

// Initialize Express app
const app = express();

// Middleware
app.use(cors({ origin: FRONTEND_URL }));
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/review', reviewRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to DineBook Backend' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
