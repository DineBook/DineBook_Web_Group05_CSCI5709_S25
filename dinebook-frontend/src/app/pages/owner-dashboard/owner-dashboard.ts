import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ReviewService } from '../../services/review.service';
import { Restaurant, RestaurantStats, Booking, Review } from '../../models/owner-dashboard';

@Component({
    selector: "app-owner-dashboard",
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatTabsModule,
        MatChipsModule,
        MatSnackBarModule
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

    // Reply form state
    editingReply = '';
    newReply = '';

    constructor(
        private apiService: ApiService,
        private authService: AuthService,
        private reviewService: ReviewService,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit() {
        this.loadDashboardData();
    }

    async loadDashboardData() {
        try {
            this.loading = true;
            this.error = null;

            const restaurantsResponse = await this.apiService.getMyRestaurants().toPromise();

            if (restaurantsResponse.restaurants && restaurantsResponse.restaurants.length > 0) {
                this.restaurant = this.processRestaurantData(restaurantsResponse.restaurants[0]);

                if (this.restaurant) {
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

    /**
     * Process restaurant data from API to handle incorrectly formatted fields
     */
    private processRestaurantData(rawRestaurant: any): Restaurant {
        const restaurant = { ...rawRestaurant };

        if (restaurant.openingHours && typeof restaurant.openingHours === 'string') {
            try {
                restaurant.openingHours = JSON.parse(restaurant.openingHours);
            } catch (error) {
                console.error('Error parsing opening hours:', error);
                restaurant.openingHours = null;
            }
        }

        if (restaurant.address === '[object Object]' || (typeof restaurant.address === 'string' && restaurant.address.includes('[object'))) {
            restaurant.address = null;
        }

        return restaurant;
    }

    getStatusColor(status: string): string {
        switch (status) {
            case 'confirmed': return '#10b981';
            case 'pending': return '#f59e0b';
            case 'cancelled': return '#ef4444';
            case 'completed': return '#667eea';
            default: return '#64748b';
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

    createRestaurant(): void {
        window.location.href = '/owner/restaurant';
    }

    getPriceRangeDisplay(priceRange: number): string {
        const priceRanges = {
            1: '$10-20',
            2: '$20-40',
            3: '$40-60',
            4: '$60+',
        };
        return (
            priceRanges[priceRange as keyof typeof priceRanges] || 'Price varies'
        );
    }

    getDaysOfWeek(): { key: string; label: string }[] {
        return [
            { key: 'monday', label: 'Monday' },
            { key: 'tuesday', label: 'Tuesday' },
            { key: 'wednesday', label: 'Wednesday' },
            { key: 'thursday', label: 'Thursday' },
            { key: 'friday', label: 'Friday' },
            { key: 'saturday', label: 'Saturday' },
            { key: 'sunday', label: 'Sunday' }
        ];
    }

    getOperatingHours(): { [key: string]: { open: string; close: string } } {
        if (this.restaurant?.openingHours && typeof this.restaurant.openingHours === 'object' && Object.keys(this.restaurant.openingHours).length > 0) {
            return this.restaurant.openingHours;
        }

        return {};
    }

    hasRestaurantHours(): boolean {
        return !!(this.restaurant?.openingHours && typeof this.restaurant.openingHours === 'object' && Object.keys(this.restaurant.openingHours).length > 0);
    }

    formatOperatingTime(time: string): string {
        if (!time) return '';

        if (time.includes(':')) {
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const minutesPart = minutes || '00';

            if (hour === 0) {
                return `12:${minutesPart} AM`;
            } else if (hour < 12) {
                return `${hour}:${minutesPart} AM`;
            } else if (hour === 12) {
                return `12:${minutesPart} PM`;
            } else {
                return `${hour - 12}:${minutesPart} PM`;
            }
        }

        return time;
    }

    startReply(review: Review) {
        this.editingReply = review._id!;
        this.newReply = review.ownerReply || '';
    }

    cancelReply() {
        this.editingReply = '';
        this.newReply = '';
    }

    saveReply(reviewId: string) {
        if (!this.newReply.trim()) {
            this.snackBar.open('Reply cannot be empty', 'Close', { duration: 3000 });
            return;
        }

        const review = this.recentReviews.find(r => r._id === reviewId);

        if (review?.ownerReply) {
            this.updateReply(reviewId);
        } else {
            this.addReply(reviewId);
        }
    }

    addReply(reviewId: string) {
        this.reviewService.replyToReview(reviewId, { reply: this.newReply.trim() }).subscribe({
            next: (response) => {
                this.snackBar.open('Reply added successfully!', 'Close', { duration: 3000 });
                this.editingReply = '';
                this.newReply = '';
                this.loadDashboardData();
            },
            error: (error) => {
                console.error('Error adding reply:', error);
                this.snackBar.open(error.error?.error || 'Failed to add reply', 'Close', { duration: 3000 });
            }
        });
    }

    updateReply(reviewId: string) {
        this.reviewService.updateReply(reviewId, { reply: this.newReply.trim() }).subscribe({
            next: (response) => {
                this.snackBar.open('Reply updated successfully!', 'Close', { duration: 3000 });
                this.editingReply = '';
                this.newReply = '';
                this.loadDashboardData();
            },
            error: (error) => {
                console.error('Error updating reply:', error);
                this.snackBar.open(error.error?.error || 'Failed to update reply', 'Close', { duration: 3000 });
            }
        });
    }

    deleteReply(reviewId: string) {
        if (confirm('Are you sure you want to delete this reply?')) {
            this.reviewService.deleteReply(reviewId).subscribe({
                next: (response) => {
                    this.snackBar.open('Reply deleted successfully!', 'Close', { duration: 3000 });
                    this.loadDashboardData();
                },
                error: (error) => {
                    console.error('Error deleting reply:', error);
                    this.snackBar.open(error.error?.error || 'Failed to delete reply', 'Close', { duration: 3000 });
                }
            });
        }
    }
}
