import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-owner-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './owner-landing.html',
  styleUrl: './owner-landing.scss'
})
export class OwnerLandingComponent implements OnInit {
  ownerName = '';
  restaurant: any = null;
  stats: any = null;
  loading = true;

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadOwnerData();
  }

  async loadOwnerData() {
    try {
      this.loading = true;
      const user = this.authService.getUser();
      this.ownerName = user?.name || 'Owner';

      // Try to get restaurant
      const restaurantsResponse = await this.apiService.getMyRestaurants().toPromise();
      if (restaurantsResponse.restaurants && restaurantsResponse.restaurants.length > 0) {
        this.restaurant = restaurantsResponse.restaurants[0];
        
        // Get basic stats
        const statsResponse = await this.apiService.getRestaurantStats(this.restaurant._id).toPromise();
        this.stats = statsResponse.stats;
      }
    } catch (error) {
      console.error('Error loading owner data:', error);
    } finally {
      this.loading = false;
    }
  }

  getQuickActions() {
    if (this.restaurant) {
      return [
        { 
          title: 'View Dashboard', 
          subtitle: 'Check your restaurant performance', 
          icon: 'dashboard', 
          route: '/owner/dashboard',
          color: 'primary'
        },
        { 
          title: 'Manage Restaurant', 
          subtitle: 'Update restaurant details', 
          icon: 'restaurant', 
          route: '/owner/restaurant',
          color: 'accent'
        },
        { 
          title: 'Manage Menu', 
          subtitle: 'Add, edit, and organize menu items', 
          icon: 'restaurant_menu', 
          route: '/owner/menu',
          color: 'primary'
        },
        { 
          title: 'View Bookings', 
          subtitle: 'Manage customer reservations', 
          icon: 'calendar_today', 
          route: '/owner/bookings',
          color: 'warn'
        }
      ];
    } else {
      return [
        { 
          title: 'Register Restaurant', 
          subtitle: 'Add your restaurant to DineBook', 
          icon: 'add_business', 
          route: '/owner/restaurant',
          color: 'primary'
        }
      ];
    }
  }
}
