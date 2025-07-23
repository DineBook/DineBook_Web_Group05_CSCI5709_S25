import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

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
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  templateUrl: './restaurant-detail.html',
  styleUrl: './restaurant-detail.scss',
})
export class RestaurantDetailComponent implements OnInit {
  restaurant: Restaurant | null = null;
  loading = false;
  error: string | null = null;
  restaurantId: string | null = null;

  // Review logic
  reviewForm!: FormGroup;
  loadingReview = false;
  reviewMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

get isCustomer(): boolean {
  return this.authService.isCustomer();
}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.restaurantId = params.get('id');
      if (this.restaurantId) {
        this.loadRestaurantDetails();
      }
    });

    // Initialize review form
    this.reviewForm = this.fb.group({
      text: ['', Validators.required],
      rating: ['', Validators.required]
    });
  }

  loadRestaurantDetails() {
    if (!this.restaurantId) return;

    this.loading = true;
    this.error = null;

    this.apiService.getRestaurantById(this.restaurantId).subscribe({
      next: (restaurant: Restaurant) => {
        this.restaurant = restaurant;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading restaurant details:', error);
        this.error = error.status === 404 ? 'Restaurant not found' : 'Failed to load restaurant details';
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
      if (i < fullStars) stars.push('star');
      else if (i === fullStars && hasHalfStar) stars.push('star_half');
      else stars.push('star_border');
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
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    const todayHours = openingHours[today];
    if (todayHours?.open && todayHours?.close) {
      return `Today: ${todayHours.open} - ${todayHours.close}`;
    }
    return 'Hours vary';
  }

  getOpeningHoursForDay(day: string): { open: string; close: string } | null {
    if (!this.restaurant?.openingHours) return null;
    return this.restaurant.openingHours[day as keyof typeof this.restaurant.openingHours] || null;
  }

  //submit review
 submitReview() {
  if (!this.restaurantId || this.reviewForm.invalid) return;

  const reviewData = {
  comment: this.reviewForm.value.text, // frontend form still uses "text"
  rating: this.reviewForm.value.rating
};

  this.loadingReview = true;
  this.reviewMessage = null;

 this.apiService.submitReview(this.restaurantId!, reviewData).subscribe({
    next: () => {
      this.loadingReview = false;
      this.reviewForm.reset();
      this.reviewMessage = 'Review submitted successfully!';
      this.snackBar.open('Thank you for your review!', 'Close', { duration: 3000 });
      this.loadRestaurantDetails();
    },
    error: (err) => {
      this.loadingReview = false;
      console.error(err);
      this.snackBar.open('Failed to submit review. Please try again.', 'Close', { duration: 3000 });
    }
  });
}

setRating(rating: number): void {
  this.reviewForm.get('rating')?.setValue(rating);
}


}
