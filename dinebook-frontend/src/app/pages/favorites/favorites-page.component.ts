import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Restaurant } from '../../models/booking';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-favorites-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <div class="favorites-page">
      <div class="container">
        <h1 class="favorites-title">My Favorite Restaurants</h1>
        <div *ngIf="loading" class="favorites-loading">
          <mat-icon class="spinning">refresh</mat-icon> Loading favorites...
        </div>
        <div *ngIf="error" class="favorites-error">
          <mat-icon>error_outline</mat-icon> {{ error }}
        </div>
        <div *ngIf="!loading && !error && favorites.length === 0" class="favorites-empty">
          <mat-icon>star_border</mat-icon> No favorites yet. Start adding your favorite restaurants!
        </div>
        <div *ngIf="!loading && !error && favorites.length > 0" class="favorites-grid">
          <div class="restaurant-card" *ngFor="let restaurant of favorites">
            <div class="restaurant-image">
              <img [src]="restaurant.image || 'https://cdn.pixabay.com/photo/2019/09/12/15/21/resort-4471852_1280.jpg'" alt="{{ restaurant.name }}" />
            </div>
            <div class="restaurant-info">
              <div class="restaurant-header">
                <h3 class="restaurant-name">{{ restaurant.name }}</h3>
                <span class="price-indicator">{{ restaurant.priceRange | number:'1.0-0' }}</span>
              </div>
              <p class="restaurant-cuisine">{{ restaurant.cuisine }}</p>
              <div class="restaurant-details">
                <div class="detail-item">
                  <mat-icon class="detail-icon">location_on</mat-icon>
                  <span>{{ restaurant.location }}</span>
                </div>
              </div>
              <div class="restaurant-actions">
                <button mat-button class="view-menu-btn" [routerLink]="['/restaurants', restaurant._id]">
                  <mat-icon>menu_book</mat-icon>
                  View
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./favorites-page.component.scss']
})
export class FavoritesPageComponent implements OnInit {
  favorites: Restaurant[] = [];
  loading = false;
  error: string | null = null;

  constructor(private apiService: ApiService, public authService: AuthService) {}

  ngOnInit() {
    if (!this.authService.isLoggedIn || !this.authService.isCustomer()) {
      this.error = 'You must be logged in as a customer to view favorites.';
      return;
    }
    this.fetchFavorites();
  }

  fetchFavorites() {
    this.loading = true;
    this.error = null;
    this.apiService.getFavorites().subscribe({
      next: (favorites) => {
        this.favorites = favorites || [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load favorites.';
        this.loading = false;
      }
    });
  }
} 