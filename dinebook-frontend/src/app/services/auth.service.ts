import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedIn = new BehaviorSubject<boolean>(!!localStorage.getItem('token'));

  constructor(private router: Router) { }

  get isLoggedIn(): boolean {
    return this.loggedIn.getValue();
  }

  get isLoggedIn$() {
    return this.loggedIn.asObservable();
  }

  login(token?: string) {
    if (token) {
      localStorage.setItem('token', token);
    }
    this.loggedIn.next(true);
  }

  logout() {
    this.loggedIn.next(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
    this.loggedIn.next(true);
  }

  removeToken(): void {
    localStorage.removeItem('token');
    this.loggedIn.next(false);
  }

  getUser(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getUserRole(): string | null {
    const user = this.getUser();
    return user ? user.role : null;
  }

  isOwner(): boolean {
    return this.getUserRole() === 'owner';
  }

  isCustomer(): boolean {
    return this.getUserRole() === 'customer';
  }

  setUser(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
  }
}