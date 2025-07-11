import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Restaurant } from '../../models/booking';

@Component({
    selector: 'app-restaurant-detail',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatChipsModule
    ],
    templateUrl: './restaurant-detail.html',
    styleUrl: './restaurant-detail.scss',
})
export class RestaurantDetailComponent implements OnInit {
    restaurant: Restaurant | null = null;
    loading = false;
    error: string | null = null;
    restaurantId: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private apiService: ApiService,
        private authService: AuthService
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.restaurantId = params.get('id');
            if (this.restaurantId) {
                this.loadRestaurantDetails();
            }
        });
    }

    loadRestaurantDetails() {
        if (!this.restaurantId) return;

        this.loading = true;
        this.error = null;

        // Use the dedicated getRestaurantById API endpoint
        this.apiService.getRestaurantById(this.restaurantId).subscribe({
            next: (restaurant: Restaurant) => {
                this.restaurant = restaurant;
                this.loading = false;
            },
            error: (error: any) => {
                console.error('Error loading restaurant details:', error);
                if (error.status === 404) {
                    this.error = 'Restaurant not found';
                } else {
                    this.error = 'Failed to load restaurant details';
                }
                this.loading = false;
            }
        });
    }

    bookTable() {
        if (!this.restaurant) return;

        if (this.authService.isLoggedIn) {
            this.router.navigate(['/book-table'], {
                queryParams: {
                    restaurantId: this.restaurant._id,
                    restaurantName: this.restaurant.name,
                    cuisine: this.restaurant.cuisine,
                    location: this.restaurant.location,
                    capacity: this.restaurant.capacity,
                    priceRange: this.restaurant.priceRange,
                    // Add source to track where the booking came from
                    source: 'restaurant-detail'
                }
            });
        } else {
            this.router.navigate(['/sign-in']);
        }
    }

    goBack() {
        this.router.navigate(['/restaurants']);
    }

    getStars(rating: number): string[] {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push('star');
            } else if (i === fullStars && hasHalfStar) {
                stars.push('star_half');
            } else {
                stars.push('star_border');
            }
        }
        return stars;
    }

    formatPriceRange(priceRange: number): string {
        const priceRanges = {
            1: "$10-20",
            2: "$20-40",
            3: "$40-60",
            4: "$60+"
        };
        return priceRanges[priceRange as keyof typeof priceRanges] || "Price varies";
    }

    formatOpeningHours(openingHours: any): string {
        if (!openingHours) return 'Hours vary';

        // Simple format - you can enhance this based on your needs
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = days[new Date().getDay()];
        const todayHours = openingHours[today];

        if (todayHours && todayHours.open && todayHours.close) {
            return `Today: ${todayHours.open} - ${todayHours.close}`;
        }

        return 'Hours vary';
    }

    // Helper method to safely get opening hours for a specific day
    getOpeningHoursForDay(day: string): { open: string; close: string } | null {
        if (!this.restaurant?.openingHours) return null;

        const dayKey = day as keyof typeof this.restaurant.openingHours;
        return this.restaurant.openingHours[dayKey] || null;
    }
}
