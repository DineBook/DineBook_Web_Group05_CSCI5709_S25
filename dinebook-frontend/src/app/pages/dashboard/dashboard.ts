import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Restaurant } from '../../models/booking';
import { OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  favorites: Restaurant[] = [];
  loadingFavorites = false;
  errorFavorites: string | null = null;

  constructor(public authService: AuthService, private apiService: ApiService) {}

  ngOnInit() {
    if (this.authService.isLoggedIn && this.authService.isCustomer()) {
      this.fetchFavorites();
    }
  }

  fetchFavorites() {
    this.loadingFavorites = true;
    this.errorFavorites = null;
    this.apiService.getFavorites().subscribe({
      next: (favorites) => {
        this.favorites = favorites || [];
        this.loadingFavorites = false;
      },
      error: (err) => {
        this.errorFavorites = 'Failed to load favorites.';
        this.loadingFavorites = false;
      }
    });
  }

  viewRestaurant(restaurant: Restaurant) {
    window.location.href = `/restaurants/${restaurant._id}`;
  }
}