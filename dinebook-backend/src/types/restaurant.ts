export enum CuisineType {
    Italian = "Italian",
    Indian = "Indian",
    Chinese = "Chinese",
    Mexican = "Mexican",
    American = "American",
    Thai = "Thai",
    Japanese = "Japanese",
    Mediterranean = "Mediterranean",
    French = "French",
    Other = "Other",
}

// Interface for restaurant query parameters
export interface RestaurantQueryParams {
    location?: string;
    cuisine?: CuisineType;
    priceRange?: string;
    page?: string;
    limit?: string;
    // Location-based search parameters
    lat?: string;
    lng?: string;
    radius?: string; // in kilometers
}

// Interface for restaurant creation body
export interface CreateRestaurantBody {
    name: string;
    cuisine: CuisineType;
    location: string;
    priceRange: number;
    description?: string;
    phoneNumber?: string;
    email?: string;
    capacity?: number;
    openingHours?: {
        monday?: { open: string; close: string };
        tuesday?: { open: string; close: string };
        wednesday?: { open: string; close: string };
        thursday?: { open: string; close: string };
        friday?: { open: string; close: string };
        saturday?: { open: string; close: string };
        sunday?: { open: string; close: string };
    };
    address?: {
        street?: string;
        city?: string;
        province?: string;
        postalCode?: string;
    };
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}
