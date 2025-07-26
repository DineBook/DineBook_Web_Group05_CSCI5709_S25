import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '../../services/api.service';
import { Booking } from '../../models/owner-dashboard';

@Component({
  selector: 'app-owner-bookings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTabsModule
  ],
  templateUrl: './owner-bookings.html',
  styleUrl: './owner-bookings.scss'
})
export class OwnerBookingsComponent implements OnInit {
  allBookings: Booking[] = [];
  todayBookings: Booking[] = [];
  upcomingBookings: Booking[] = [];
  loading = true;
  error: string | null = null;
  restaurant: any = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadBookingsData();
  }

  async loadBookingsData() {
    try {
      this.loading = true;
      this.error = null;

      // First get owner's restaurant
      const restaurantsResponse = await this.apiService.getMyRestaurants().toPromise();
      
      if (restaurantsResponse.restaurants && restaurantsResponse.restaurants.length > 0) {
        this.restaurant = restaurantsResponse.restaurants[0];
        
        // Load all bookings for the restaurant
        const bookingsResponse = await this.apiService.getRestaurantBookings(this.restaurant._id, 100).toPromise();
        this.allBookings = bookingsResponse.bookings || [];
        
        // Filter bookings by date
        const today = new Date().toDateString();
        this.todayBookings = this.allBookings.filter(booking => 
          new Date(booking.date).toDateString() === today
        );
        
        this.upcomingBookings = this.allBookings.filter(booking => 
          new Date(booking.date) > new Date()
        );
      }
    } catch (error) {
      console.error('Error loading bookings data:', error);
      this.error = 'Failed to load bookings data. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed': return 'primary';
      case 'pending': return 'accent';
      case 'cancelled': return 'warn';
      case 'completed': return 'primary';
      default: return '';
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(timeStr: string): string {
    return timeStr;
  }

  getBookingsByStatus(status: string): Booking[] {
    return this.allBookings.filter(booking => booking.status === status);
  }
}
