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
  // Add geolocation parameters with clear names
  latitude?: string; // User's North/South position (-90 to 90)
  longitude?: string; // User's East/West position (-180 to 180)
  radius?: string; // Search radius in kilometers, default 5
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
  // Add coordinates for new restaurants with clear descriptions
  latitude?: number; // Restaurant's North/South position (-90 to 90)
  longitude?: number; // Restaurant's East/West position (-180 to 180)
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
}

// Interface for geolocation with clear descriptions
export interface GeoLocation {
  latitude: number; // North/South position (-90 to 90)
  longitude: number; // East/West position (-180 to 180)
}

// Interface for nearby restaurants response
export interface NearbyRestaurantsResponse {
  restaurants: any[];
  search_info: {
    your_location: {
      latitude: number;
      longitude: number;
      description: string;
    };
    search_radius_km: number;
    results_found: number;
  };
  success: boolean;
}

// Interface for geocoding result
export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}
