import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

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
}