import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedIn = new BehaviorSubject<boolean>(!!localStorage.getItem('token'));

  get isLoggedIn(): boolean {
    return this.loggedIn.getValue();
  }

  get isLoggedIn$() {
    return this.loggedIn.asObservable();
  }

  login() {
    this.loggedIn.next(true);
  }

  logout() {
    this.loggedIn.next(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}