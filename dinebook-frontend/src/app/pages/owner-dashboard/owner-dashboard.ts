import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Restaurant, RestaurantStats, Booking, Review } from '../../models/owner-dashboard';

@Component({
    selector: "app-owner-dashboard",
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatTabsModule,
        MatChipsModule
    ],
    templateUrl: "./owner-dashboard.html",
    styleUrl: "./owner-dashboard.scss",
})
export class OwnerDashboardComponent implements OnInit {
    restaurant: Restaurant | null = null;
    stats: RestaurantStats | null = null;
    recentBookings: Booking[] = [];
    recentReviews: Review[] = [];
    loading = true;
    error: string | null = null;

    constructor(
        private apiService: ApiService,
        private authService: AuthService
    ) { }

    ngOnInit() {
        this.loadDashboardData();
    }

    async loadDashboardData() {
        try {
            this.loading = true;
            this.error = null;

            // First get owner's restaurants (assuming one restaurant per owner)
            const restaurantsResponse = await this.apiService.getMyRestaurants().toPromise();

            if (restaurantsResponse.restaurants && restaurantsResponse.restaurants.length > 0) {
                this.restaurant = restaurantsResponse.restaurants[0];

                if (this.restaurant) {
                    // Load restaurant data in parallel
                    const restaurantId = this.restaurant._id;
                    const [statsResponse, bookingsResponse, reviewsResponse] = await Promise.all([
                        this.apiService.getRestaurantStats(restaurantId).toPromise(),
                        this.apiService.getRestaurantBookings(restaurantId, 5).toPromise(),
                        this.apiService.getRestaurantReviews(restaurantId).toPromise()
                    ]);

                    this.stats = statsResponse.stats;
                    this.recentBookings = bookingsResponse.bookings || [];
                    this.recentReviews = reviewsResponse.reviews?.slice(0, 5) || [];
                }
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.error = 'Failed to load dashboard data. Please try again.';
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
        return new Date(dateStr).toLocaleDateString();
    }

    formatTime(timeStr: string): string {
        return timeStr;
    }

    getStarArray(rating: number): number[] {
        return Array(5).fill(0).map((_, i) => i < Math.floor(rating) ? 1 : 0);
    }
}
