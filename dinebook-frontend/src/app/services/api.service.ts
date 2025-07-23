import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  getWelcomeMessage(): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${this.apiUrl}/`);
  }

  register(user: { email: string, password: string, role: string, name: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, user);
  }

  login(credentials: { email: string, password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials);
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/verify?token=${token}`);
  }

  getRestaurantById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/restaurants/${id}`);
  }

submitReview(restaurantId: string, review: { comment: string; rating: number }) {
  return this.http.post(`${this.apiUrl}/review/${restaurantId}`, review, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
}
}
