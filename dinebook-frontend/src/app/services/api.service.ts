import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

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
}