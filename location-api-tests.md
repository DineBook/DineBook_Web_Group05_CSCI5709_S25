# Location-Based Restaurant API Test Requests

## Base URL

```
http://localhost:3000/api/restaurants
```

## 1. Basic Location-Based Search

### Test 1: Halifax Downtown Area

```bash
curl -X GET "http://localhost:3000/api/restaurants?lat=44.6488&lng=-63.5752&radius=5"
```

### Test 2: Toronto CN Tower Area

```bash
curl -X GET "http://localhost:3000/api/restaurants?lat=43.6426&lng=-79.3871&radius=10"
```

### Test 3: Vancouver Downtown

```bash
curl -X GET "http://localhost:3000/api/restaurants?lat=49.2827&lng=-123.1207&radius=8"
```

## 2. Location Search with Filters

### Test 4: Italian restaurants near Halifax (5km radius)

```bash
curl -X GET "http://localhost:3000/api/restaurants?lat=44.6488&lng=-63.5752&radius=5&cuisine=Italian"
```

### Test 5: Budget restaurants (price range 1-2) near location

```bash
curl -X GET "http://localhost:3000/api/restaurants?lat=44.6488&lng=-63.5752&radius=10&priceRange=1"
```

### Test 6: Combined filters (Italian, mid-range pricing)

```bash
curl -X GET "http://localhost:3000/api/restaurants?lat=44.6488&lng=-63.5752&radius=15&cuisine=Italian&priceRange=2"
```

## 3. Pagination with Location Search

### Test 7: First page with 5 results per page

```bash
curl -X GET "http://localhost:3000/api/restaurants?lat=44.6488&lng=-63.5752&radius=20&page=1&limit=5"
```

### Test 8: Second page

```bash
curl -X GET "http://localhost:3000/api/restaurants?lat=44.6488&lng=-63.5752&radius=20&page=2&limit=5"
```

## 5. Different Radius Testing

### Test 9: Very small radius (1km)

```bash
curl -X GET "http://localhost:3000/api/restaurants?lat=44.6488&lng=-63.5752&radius=1"
```

### Test 10: Large radius (50km)

```bash
curl -X GET "http://localhost:3000/api/restaurants?lat=44.6488&lng=-63.5752&radius=50"
```

## 6. Error Testing

### Test 9: Invalid latitude

```bash
curl -X GET "http://localhost:3000/api/restaurants?lat=invalid&lng=-63.5752&radius=10"
```

### Test 10: Missing longitude

```bash
curl -X GET "http://localhost:3000/api/restaurants?lat=44.6488&radius=10"
```

### Test 11: Invalid radius

```bash
curl -X GET "http://localhost:3000/api/restaurants?lat=44.6488&lng=-63.5752&radius=invalid"
```

## 7. Traditional Search (Should still work)

### Test 12: Text-based location search

```bash
curl -X GET "http://localhost:3000/api/restaurants?location=Halifax"
```

### Test 13: Text search with filters

```bash
curl -X GET "http://localhost:3000/api/restaurants?location=Halifax&cuisine=Indian&priceRange=3"
```

## 8. Creating Restaurant with Coordinates

### Test 14: Create restaurant with coordinates (requires authentication)

```bash
curl -X POST "http://localhost:3000/api/restaurants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Location Restaurant",
    "cuisine": "Italian",
    "location": "Halifax Downtown",
    "priceRange": 2,
    "description": "A test restaurant with coordinates",
    "coordinates": {
      "latitude": 44.6488,
      "longitude": -63.5752
    },
    "address": {
      "street": "123 Test Street",
      "city": "Halifax",
      "province": "NS",
      "postalCode": "B3H 3A5"
    }
  }'
```

## 9. Postman Collection Format

### Test Collection for Postman:

#### Request 1: Basic Location Search

- **Method**: GET
- **URL**: `{{baseUrl}}/api/restaurants`
- **Params**:
  - lat: 44.6488
  - lng: -63.5752
  - radius: 10

#### Request 2: Location + Cuisine Filter

- **Method**: GET
- **URL**: `{{baseUrl}}/api/restaurants`
- **Params**:
  - lat: 44.6488
  - lng: -63.5752
  - radius: 15
  - cuisine: Italian

#### Request 3: Create Restaurant with Location

- **Method**: POST
- **URL**: `{{baseUrl}}/api/restaurants`
- **Headers**:
  - Content-Type: application/json
  - Authorization: Bearer {{token}}
- **Body** (JSON):

```json
{
  "name": "Geolocation Test Restaurant",
  "cuisine": "Mediterranean",
  "location": "Halifax Waterfront",
  "priceRange": 3,
  "description": "Restaurant with geolocation data",
  "coordinates": {
    "latitude": 44.6488,
    "longitude": -63.5752
  }
}
```

## 10. JavaScript/Fetch Examples

### Test 15: Browser JavaScript

```javascript
// Basic location search
fetch(
  "http://localhost:3000/api/restaurants?lat=44.6488&lng=-63.5752&radius=10"
)
  .then((response) => response.json())
  .then((data) => {
    console.log("Restaurants found:", data.restaurants.length);
    console.log(
      "First restaurant distance:",
      data.restaurants[0]?.distance,
      "meters"
    );
  });

// Search with filters
fetch(
  "http://localhost:3000/api/restaurants?lat=44.6488&lng=-63.5752&radius=10&cuisine=Italian&priceRange=2"
)
  .then((response) => response.json())
  .then((data) => console.log("Filtered results:", data));
```

## 11. Expected Response Format

### Successful Response:

```json
{
  "restaurants": [
    {
      "_id": "...",
      "name": "Restaurant Name",
      "cuisine": "Italian",
      "location": "Halifax Downtown",
      "priceRange": 2,
      "coordinates": {
        "type": "Point",
        "coordinates": [-63.5752, 44.6488]
      },
      "distance": 1250.5,
      "ownerId": {
        "name": "Owner Name",
        "email": "owner@email.com"
      },
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  },
  "filters": {
    "location": null,
    "cuisine": "Italian",
    "priceRange": "2",
    "lat": "44.6488",
    "lng": "-63.5752",
    "radius": "10"
  }
}
```

### Error Response:

```json
{
  "error": "Invalid coordinates or radius"
}
```

## Key Test Coordinates for Major Canadian Cities:

- **Halifax, NS**: 44.6488, -63.5752
- **Toronto, ON**: 43.6532, -79.3832
- **Vancouver, BC**: 49.2827, -123.1207
- **Calgary, AB**: 51.0447, -114.0719
- **Ottawa, ON**: 45.4215, -75.6972
- **Montreal, QC**: 45.5017, -73.5673

## Testing Checklist:

- [ ] Basic location search returns results sorted by distance
- [ ] Distance field is present in response when using coordinates
- [ ] Filters work with location search
- [ ] Pagination works with location search
- [ ] Invalid coordinates return proper error
- [ ] Traditional text search still works
- [ ] Creating restaurants with coordinates works
- [ ] Different radius values work correctly
- [ ] Combined filters work together
