import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurant';
import bookingRoutes from './routes/booking';
import reviewRoutes from './routes/review';
import favoriteRoutes from './routes/favorite';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dinebook';
console.log('Connecting to MongoDB:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:4200',
  'https://dine-book-web-group05-csci-5709-s25.vercel.app'
];

// Middleware
// app.use(cors());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes); 
app.use('/api/favorites', favoriteRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to DineBook Backend!' });
});



// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Access the API at https://dinebook-web-group05-csci5709-s25.onrender.com`);
});