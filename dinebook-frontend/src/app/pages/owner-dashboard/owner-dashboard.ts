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

    createRestaurant(): void {
        // Navigate to restaurant management page to create a new restaurant
        window.location.href = '/owner/restaurant';
    }

    getPriceRangeDisplay(priceRange: number): string {
        return '$'.repeat(priceRange);
    }

    getDaysOfWeek(): { key: string; label: string }[] {
        return [
            { key: 'monday', label: 'Mon' },
            { key: 'tuesday', label: 'Tue' },
            { key: 'wednesday', label: 'Wed' },
            { key: 'thursday', label: 'Thu' },
            { key: 'friday', label: 'Fri' },
            { key: 'saturday', label: 'Sat' },
            { key: 'sunday', label: 'Sun' }
        ];
    }

    startReply(review: Review) {
        console.log('🔥 Starting reply for review:', review._id);
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

        // Check if this is a new reply or editing existing one
        const review = this.recentReviews.find(r => r._id === reviewId);
        
        if (review?.ownerReply) {
            // Update existing reply
            this.updateReply(reviewId);
        } else {
            // Add new reply
            this.addReply(reviewId);
        }
    }

    addReply(reviewId: string) {
        this.reviewService.replyToReview(reviewId, { reply: this.newReply.trim() }).subscribe({
            next: (response) => {
                this.snackBar.open('Reply added successfully!', 'Close', { duration: 3000 });
                this.editingReply = '';
                this.newReply = '';
                this.loadDashboardData(); // Reload to show the new reply
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
                this.loadDashboardData(); // Reload to show the updated reply
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
                    this.loadDashboardData(); // Reload to remove the reply
                },
                error: (error) => {
                    console.error('Error deleting reply:', error);
                    this.snackBar.open(error.error?.error || 'Failed to delete reply', 'Close', { duration: 3000 });
                }
            });
        }
    }
}
