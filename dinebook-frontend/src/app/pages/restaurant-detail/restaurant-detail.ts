import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Restaurant } from '../../models/booking';
import { RestaurantReviewsComponent } from '../../components/restaurant-reviews/restaurant-reviews';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTabsModule,
    MatSnackBarModule,
    RestaurantReviewsComponent,
  ],
  templateUrl: './restaurant-detail.html',
  styleUrl: './restaurant-detail.scss',
})
export class RestaurantDetailComponent implements OnInit {
  restaurant: Restaurant | null = null;
  loading = false;
  error: string | null = null;
  restaurantId: string | null = null;
  isFavorite: boolean = false;
  favoriteLoading: boolean = false;
  selectedTabIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    public authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.restaurantId = params.get('id');
      if (this.restaurantId) {
        this.loadRestaurantDetails();
        this.checkFavoriteStatus();
      }
    });

    // Handle query parameters for tab selection
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'reviews') {
        this.selectedTabIndex = 1; // Switch to reviews tab
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
        console.log('🍽️ Restaurant loaded:', restaurant);
        console.log('🍽️ Restaurant ownerId:', restaurant.ownerId);
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
      },
    });
  }

  checkFavoriteStatus() {
    if (
      !this.restaurantId ||
      !this.authService.isLoggedIn ||
      !this.authService.isCustomer()
    ) {
      this.isFavorite = false;
      return;
    }
    this.apiService.checkFavoriteStatus(this.restaurantId).subscribe({
      next: (res) => {
        this.isFavorite =
          res && typeof (res as any).isFavorited === 'boolean'
            ? (res as any).isFavorited
            : res && typeof res.isFavorite === 'boolean'
            ? res.isFavorite
            : false;
      },
      error: () => {
        this.isFavorite = false;
      },
    });
  }

  onToggleFavorite() {
    if (
      !this.restaurantId ||
      !this.authService.isLoggedIn ||
      !this.authService.isCustomer()
    )
      return;
    this.favoriteLoading = true;
    this.apiService.toggleFavorite(this.restaurantId).subscribe({
      next: (res) => {
        this.isFavorite =
          res && typeof (res as any).isFavorited === 'boolean'
            ? (res as any).isFavorited
            : res && typeof res.isFavorite === 'boolean'
            ? res.isFavorite
            : false;
        this.favoriteLoading = false;
      },
      error: () => {
        this.favoriteLoading = false;
      },
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
          source: 'restaurant-detail',
        },
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
      1: '$10-20',
      2: '$20-40',
      3: '$40-60',
      4: '$60+',
    };
    return (
      priceRanges[priceRange as keyof typeof priceRanges] || 'Price varies'
    );
  }

  formatOpeningHours(openingHours: any): string {
    if (!openingHours) return 'Hours vary';

    // Simple format - you can enhance this based on your needs
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
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

  onReviewSubmitted() {
    // Refresh the reviews section by switching tab
    this.selectedTabIndex = 0; // Switch to overview tab first
    setTimeout(() => {
      this.selectedTabIndex = 1; // Then switch back to reviews tab
    }, 100);
  }

  onReviewsUpdated(reviewStats: {
    totalReviews: number;
    averageRating: number;
  }) {
    if (this.restaurant) {
      this.restaurant.reviews = reviewStats.totalReviews;
      this.restaurant.averageRating = reviewStats.averageRating;
    }
  }

  // Helper method to check if a day is today
  isToday(day: string): boolean {
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const today = days[new Date().getDay()];
    return day.toLowerCase() === today;
  }

  // Helper method to check if restaurant is currently open
  isCurrentlyOpen(day: string): boolean {
    if (!this.restaurant?.openingHours || !this.isToday(day)) return false;

    const dayHours = this.getOpeningHoursForDay(day);
    if (!dayHours?.open || !dayHours?.close) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes(); // Convert to HHMM format

    // Convert time strings to numbers (assuming format like "10:00" or "22:30")
    const openTime = parseInt(dayHours.open.replace(':', ''));
    const closeTime = parseInt(dayHours.close.replace(':', ''));

    return currentTime >= openTime && currentTime <= closeTime;
  }

  // Share restaurant functionality
  async shareRestaurant() {
    if (!this.restaurant) return;

    const currentUrl = window.location.href;
    const shareText = `Check out ${this.restaurant.name} - ${this.restaurant.cuisine} restaurant in ${this.restaurant.location}`;

    try {
      // Try to use the Web Share API first (if available, mainly on mobile)
      if (navigator.share) {
        await navigator.share({
          title: `${this.restaurant.name} - DineBook`,
          text: shareText,
          url: currentUrl,
        });

        this.snackBar.open('Restaurant shared successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(currentUrl);

        this.snackBar.open('Restaurant link copied to clipboard!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
      }
    } catch (error) {
      // Fallback for older browsers or if clipboard fails
      try {
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          this.snackBar.open('Restaurant link copied to clipboard!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
        } else {
          throw new Error('Copy command failed');
        }
      } catch (fallbackError) {
        console.error('Failed to copy to clipboard:', fallbackError);
        this.snackBar.open(
          'Unable to copy link. Please copy the URL manually.',
          'Close',
          {
            duration: 4000,
            panelClass: ['error-snackbar'],
          }
        );
      }
    }
  }

  onImageError(event: any): void {
    // Set fallback image when restaurant image fails to load
    event.target.src =
      'https://cdn.pixabay.com/photo/2019/09/12/15/21/resort-4471852_1280.jpg';
  }
}
