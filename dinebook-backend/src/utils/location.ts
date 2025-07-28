// Interface for geocoding result
interface GeocodeResult {
  latitude: number;
  longitude: number;
}

/**
 * Validate latitude and longitude coordinates
 */
export const validateCoordinates = (
  latitude: number,
  longitude: number
): boolean => {
  return (
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 && // Valid latitude range
    latitude <= 90 && // Valid latitude range
    longitude >= -180 && // Valid longitude range
    longitude <= 180 // Valid longitude range
  );
};

/**
 * Simple mock geocoding function for development
 * Replace with actual geocoding service in production
 */
export const geocodeAddress = async (
  address: string
): Promise<GeocodeResult | null> => {
  console.log(`Mock geocoding for address: ${address}`);

  // Basic validation
  if (!address || typeof address !== 'string' || address.trim().length < 3) {
    console.log("Address validation failed: too short or invalid");
    return null;
  }

  const trimmedAddress = address.trim();

  // For development, return Halifax coordinates as default
  // Remove this in production and implement real geocoding
  try {
    // Mock different coordinates based on address content for testing
    if (trimmedAddress.toLowerCase().includes('toronto')) {
      return {
        latitude: 43.6532,
        longitude: -79.3832,
      };
    } else if (trimmedAddress.toLowerCase().includes('vancouver')) {
      return {
        latitude: 49.2827,
        longitude: -123.1207,
      };
    } else {
      // Default to Halifax for any other valid address
      return {
        latitude: 44.6488, // Halifax latitude
        longitude: -63.5752, // Halifax longitude
      };
    }
  } catch (error) {
    console.error("Error in mock geocoding:", error);
    return null;
  }
};

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};
