import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'https://dinebook-web-group05-csci5709-s25.onrender.com';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getWelcomeMessage(): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${this.apiUrl}/`);
  }

  register(user: {
    email: string;
    password: string;
    role: string;
    name: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/register`, user);
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/login`, credentials);
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/auth/verify?token=${token}`);
  }

  getRestaurantById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/restaurants/${id}`);
  }

  // Owner Dashboard APIs
  getMyRestaurants(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/restaurants/my`, {
      headers: this.getAuthHeaders(),
    });
  }

  getRestaurantBookings(
    restaurantId: string,
    limit: number = 10
  ): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/api/restaurants/${restaurantId}/bookings?limit=${limit}`,
      { headers: this.getAuthHeaders() }
    );
  }

  getRestaurantStats(restaurantId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/api/restaurants/${restaurantId}/stats`,
      { headers: this.getAuthHeaders() }
    );
  }

  getRestaurantReviews(restaurantId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/api/reviews/restaurant/${restaurantId}`
    );
  }

  createRestaurant(restaurantData: any): Observable<any> {
    const headers = this.getAuthHeaders();

    // Handle FormData (for file uploads) vs regular JSON data
    if (restaurantData instanceof FormData) {
      // Remove Content-Type header to let browser set it automatically for FormData
      const formDataHeaders = new HttpHeaders({
        Authorization: headers.get('Authorization') || '',
      });
      return this.http.post(`${this.apiUrl}/api/restaurants`, restaurantData, {
        headers: formDataHeaders,
      });
    } else {
      return this.http.post(`${this.apiUrl}/api/restaurants`, restaurantData, {
        headers: headers,
      });
    }
  }

  updateRestaurant(restaurantId: string, restaurantData: any): Observable<any> {
    const headers = this.getAuthHeaders();

    // Handle FormData (for file uploads) vs regular JSON data
    if (restaurantData instanceof FormData) {
      // Remove Content-Type header to let browser set it automatically for FormData
      const formDataHeaders = new HttpHeaders({
        Authorization: headers.get('Authorization') || '',
      });
      return this.http.put(
        `${this.apiUrl}/api/restaurants/${restaurantId}`,
        restaurantData,
        { headers: formDataHeaders }
      );
    } else {
      return this.http.put(
        `${this.apiUrl}/api/restaurants/${restaurantId}`,
        restaurantData,
        { headers: headers }
      );
    }
  }

  deleteRestaurant(restaurantId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/restaurants/${restaurantId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Restaurant search and filtering
  getRestaurants(filters?: any): Observable<any> {
    let params = '';
    if (filters) {
      const queryParams = new URLSearchParams(filters).toString();
      params = queryParams ? `?${queryParams}` : '';
    }
    return this.http.get(`${this.apiUrl}/api/restaurants${params}`);
  }

  searchNearbyRestaurants(
    latitude: number,
    longitude: number,
    radius?: number,
    filters?: any
  ): Observable<any> {
    let params = `?latitude=${latitude}&longitude=${longitude}`;
    if (radius) params += `&radius=${radius}`;
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params += `&${key}=${filters[key]}`;
      });
    }
    return this.http.get(`${this.apiUrl}/api/restaurants/nearby${params}`);
  }

  getFavorites(): Observable<any[]> {
    return this.http
      .get<{ favorites: any[] }>(`${this.apiUrl}/api/favorites`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res) =>
          (res.favorites || [])
            .map((fav) => fav.restaurantId)
            .filter((r) => !!r)
        )
      );
  }

  /**
   * Check if a specific restaurant is favorited by the current user
   * @param restaurantId Restaurant ID
   */
  checkFavoriteStatus(
    restaurantId: string
  ): Observable<{ isFavorite: boolean }> {
    return this.http.get<{ isFavorite: boolean }>(
      `${this.apiUrl}/api/favorites/${restaurantId}/status`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Toggle favorite status for a restaurant (add/remove)
   * @param restaurantId Restaurant ID
   */
  toggleFavorite(restaurantId: string): Observable<{ isFavorite: boolean }> {
    return this.http.post<{ isFavorite: boolean }>(
      `${this.apiUrl}/api/favorites/${restaurantId}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // Menu Management APIs
  getMenuItems(restaurantId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/api/restaurants/${restaurantId}/menu`,
      { headers: this.getAuthHeaders() }
    );
  }

  createMenuItem(restaurantId: string, menuItem: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/api/restaurants/${restaurantId}/menu`,
      menuItem,
      { headers: this.getAuthHeaders() }
    );
  }

  updateMenuItem(
    restaurantId: string,
    itemId: string,
    menuItem: any
  ): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/api/restaurants/${restaurantId}/menu/${itemId}`,
      menuItem,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteMenuItem(restaurantId: string, itemId: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/api/restaurants/${restaurantId}/menu/${itemId}`,
      { headers: this.getAuthHeaders() }
    );
  }
}
