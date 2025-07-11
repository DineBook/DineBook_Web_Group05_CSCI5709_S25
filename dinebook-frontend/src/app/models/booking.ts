export interface BookingAvailabilityQuery {
  restaurantId: string;
  date: string; // YYYY-MM-DD format
}

export interface CreateBookingRequest {
  restaurantId: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  guests: number;
  specialRequests?: string;
}

export interface BookingResponse {
  id: string;
  customerId: string;
  restaurantId: string;
  restaurantName: string;
  date: string;
  time: string;
  guests: number;
  specialRequests?: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilityResponse {
  restaurantId: string;
  restaurantName: string;
  date: string;
  dayOfWeek: string;
  openingHours: {
    open: string;
    close: string;
  };
  availableSlots: TimeSlot[];
  totalSlots: number;
}

export interface TimeSlot {
  time: string; // HH:MM format
  available: boolean;
  availableCapacity: number;
  totalCapacity: number;
}

export interface Restaurant {
  _id: string;
  id?: string; // For compatibility
  name: string;
  cuisine: string;
  location: string;
  coordinates?: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  address?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
  priceRange: number; // Backend uses number (1-4)
  averageRating?: number;
  description?: string;
  phoneNumber?: string;
  email?: string;
  capacity: number;
  openingHours: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
  isActive?: boolean;
  ownerId: string;
  createdAt?: Date;
  updatedAt?: Date;

  // Legacy fields for compatibility
  rating?: number;
  reviews?: number;
  timing?: string;
  image?: string;
}

export interface BookingFilter {
  status?: 'all' | 'upcoming' | 'past' | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
}

export interface BookingStats {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
} 