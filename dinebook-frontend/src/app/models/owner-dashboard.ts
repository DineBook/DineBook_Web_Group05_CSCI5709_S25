export interface Restaurant {
    _id: string;
    name: string;
    location: string;
    address?: {
        street: string;
        city: string;
        province: string;
        postalCode: string;
    };
    cuisine: string;
    priceRange: number;
    description?: string;
    phoneNumber?: string;
    email?: string;
    capacity?: number;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    openingHours?: {
        [key: string]: { open: string; close: string };
    };
    ownerId: {
        _id: string;
        name: string;
        email: string;
    };
    isActive: boolean;
    averageRating?: number;
    createdAt: string;
}

export interface RestaurantStats {
    totalBookings: number;
    todayBookings: number;
    upcomingBookings: number;
    totalReviews: number;
    averageRating: number;
}

export interface Booking {
    _id: string;
    customerId?: {
        name: string;
        email: string;
    };
    restaurantId: string;
    date: string;
    time: string;
    guests: number;
    specialRequests?: string;
    status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
    createdAt: string;
}

export interface Review {
    _id: string;
    customerId?: {
        name: string;
    };
    restaurantId: string;
    rating: number;
    comment: string;
    ownerReply?: string;
    createdAt: string;
}

export interface OwnerDashboardData {
    restaurant: Restaurant;
    stats: RestaurantStats;
    recentBookings: Booking[];
    recentReviews: Review[];
}
