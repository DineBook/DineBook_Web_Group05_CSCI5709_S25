export interface Restaurant {
    _id: string;
    name: string;
    location: string;
    cuisine: string;
    priceRange: number;
    ownerId: {
        _id: string;
        name: string;
        email: string;
    };
    isActive: boolean;
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
