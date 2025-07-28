import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatMenuModule, MatIconModule, MatDividerModule, CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent {
  constructor(public authService: AuthService) { }

  get isOwner(): boolean {
    return this.authService.isOwner();
  }

  get isCustomer(): boolean {
    return this.authService.isCustomer();
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  // Observable versions for reactive updates
  get isLoggedIn$(): Observable<boolean> {
    return this.authService.isLoggedIn$;
  }

  get isOwner$(): Observable<boolean> {
    return this.authService.isLoggedIn$.pipe(
      map(() => this.authService.isOwner())
    );
  }

  get isCustomer$(): Observable<boolean> {
    return this.authService.isLoggedIn$.pipe(
      map(() => this.authService.isCustomer())
    );
  }

  getUserName(): string {
    const user = this.authService.getUser();
    return user?.name || 'User';
  }

  getInitials(): string {
    const user = this.authService.getUser();
    if (!user?.name) return 'U';
    
    const names = user.name.split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }

  getUserEmail(): string {
    const user = this.authService.getUser();
    return user?.email || 'user@example.com';
  }

  getUserRole(): string {
    if (this.authService.isOwner()) {
      return 'Restaurant Owner';
    }
    if (this.authService.isCustomer()) {
      return 'Customer';
    }
    return 'User';
  }
}