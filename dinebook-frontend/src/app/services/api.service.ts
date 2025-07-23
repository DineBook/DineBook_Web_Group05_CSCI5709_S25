import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getWelcomeMessage(): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${this.apiUrl}/`);
  }

  register(user: { email: string, password: string, role: string, name: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/register`, user);
  }

  login(credentials: { email: string, password: string }): Observable<any> {
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
    return this.http.get(`${this.apiUrl}/api/restaurants/my`, { headers: this.getAuthHeaders() });
  }

  getRestaurantBookings(restaurantId: string, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/restaurants/${restaurantId}/bookings?limit=${limit}`, { headers: this.getAuthHeaders() });
  }

  getRestaurantStats(restaurantId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/restaurants/${restaurantId}/stats`, { headers: this.getAuthHeaders() });
  }

  getRestaurantReviews(restaurantId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/reviews/restaurant/${restaurantId}`);
  }

  updateRestaurant(restaurantId: string, restaurantData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/api/restaurants/${restaurantId}`, restaurantData, { headers: this.getAuthHeaders() });
  }

  getFavorites(): Observable<any[]> {
    return this.http.get<{ favorites: any[] }>(`${this.apiUrl}/api/favorites`, { headers: this.getAuthHeaders() })
      .pipe(
        map(res => (res.favorites || []).map(fav => fav.restaurantId).filter(r => !!r))
      );
  }

  /**
   * Check if a specific restaurant is favorited by the current user
   * @param restaurantId Restaurant ID
   */
  checkFavoriteStatus(restaurantId: string): Observable<{ isFavorite: boolean }> {
    return this.http.get<{ isFavorite: boolean }>(`${this.apiUrl}/api/favorites/${restaurantId}/status`, { headers: this.getAuthHeaders() });
  }

  /**
   * Toggle favorite status for a restaurant (add/remove)
   * @param restaurantId Restaurant ID
   */
  toggleFavorite(restaurantId: string): Observable<{ isFavorite: boolean }> {
    return this.http.post<{ isFavorite: boolean }>(`${this.apiUrl}/api/favorites/${restaurantId}`, {}, { headers: this.getAuthHeaders() });
  }
}