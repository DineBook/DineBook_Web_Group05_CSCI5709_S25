// Interface for creating a new booking
export interface CreateBookingBody {
    restaurantId: string;
    date: string;
    time: string;
    guests: number;
    specialRequests?: string;
}

// Interface for booking query parameters
export interface BookingAvailabilityQuery {
    restaurantId: string;
    date: string;
}

// Interface for booking response
export interface BookingResponse {
    id: string;
    customerId: string;
    restaurantId: string;
    restaurantName: string;
    date: string;
    time: string;
    guests: number;
    specialRequests?: string;
    status: string;
    createdAt: Date;
} 