import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { ReviewService, Review, UpdateReviewRequest } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-my-reviews',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './my-reviews.html',
  styleUrl: './my-reviews.scss'
})
export class MyReviewsComponent implements OnInit {
  reviews: Review[] = [];
  loading = false;
  error: string | null = null;
  editingReview: string | null = null;
  editForm!: FormGroup;
  selectedRating = 0;
  hoverRating = 0;

  constructor(
    private reviewService: ReviewService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.initializeEditForm();
    this.loadMyReviews();
  }

  initializeEditForm() {
    this.editForm = this.fb.group({
      rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    });
  }

  loadMyReviews() {
    if (!this.authService.isLoggedIn) {
      this.error = 'Please log in to view your reviews';
      this.snackBar.open('Please log in to view your reviews', 'Login', { duration: 5000 })
        .onAction().subscribe(() => {
          // Navigate to login page
          window.location.href = '/sign-in';
        });
      return;
    }

    if (!this.authService.isCustomer()) {
      this.error = 'Only customers can view their reviews';
      return;
    }

    this.loading = true;
    this.error = null;

    this.reviewService.getMyReviews().subscribe({
      next: (response) => {
        this.reviews = response.reviews || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        if (error.status === 401) {
          this.error = 'Please log in to view your reviews';
          this.snackBar.open('Session expired. Please log in again.', 'Login', { duration: 5000 })
            .onAction().subscribe(() => {
              window.location.href = '/sign-in';
            });
        } else {
          this.error = 'Failed to load your reviews';
          this.snackBar.open('Failed to load your reviews', 'Close', { duration: 3000 });
        }
        this.loading = false;
      }
    });
  }

  getStarArray(rating: number): { icon: string; filled: boolean }[] {
    return this.reviewService.getStarArray(rating);
  }

  formatDate(dateString: string): string {
    return this.reviewService.formatDate(dateString);
  }

  getRestaurantName(restaurant: any): string {
    if (typeof restaurant === 'string') {
      return 'Restaurant'; // Fallback if restaurant is just an ID
    }
    return restaurant?.name || 'Restaurant';
  }

  startEditReview(review: Review) {
    this.editingReview = review._id!;
    this.selectedRating = review.rating;
    this.editForm.patchValue({
      rating: review.rating,
      comment: review.comment
    });
  }

  cancelEdit() {
    this.editingReview = null;
    this.selectedRating = 0;
    this.hoverRating = 0;
    this.editForm.reset();
  }

  onStarClick(rating: number) {
    this.selectedRating = rating;
    this.editForm.patchValue({ rating });
  }

  onStarHover(rating: number) {
    this.hoverRating = rating;
  }

  onStarLeave() {
    this.hoverRating = 0;
  }

  getStarIcon(position: number): string {
    const displayRating = this.hoverRating || this.selectedRating;
    return position <= displayRating ? 'star' : 'star_border';
  }

  getStarClass(position: number): string {
    const displayRating = this.hoverRating || this.selectedRating;
    return position <= displayRating ? 'filled' : 'empty';
  }

  updateReview(reviewId: string) {
    if (this.editForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const updateData: UpdateReviewRequest = {
      rating: this.editForm.value.rating,
      comment: this.editForm.value.comment.trim()
    };

    this.reviewService.updateReview(reviewId, updateData).subscribe({
      next: (response) => {
        this.snackBar.open('Review updated successfully!', 'Close', { duration: 3000 });
        this.cancelEdit();
        this.loadMyReviews(); // Reload reviews
      },
      error: (error) => {
        console.error('Error updating review:', error);
        const errorMessage = error.error?.error || 'Failed to update review';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  deleteReview(reviewId: string, restaurantName: string) {
    const confirmed = confirm(`Are you sure you want to delete your review for ${restaurantName}?`);
    
    if (confirmed) {
      this.reviewService.deleteReview(reviewId).subscribe({
        next: (response) => {
          this.snackBar.open('Review deleted successfully', 'Close', { duration: 3000 });
          this.loadMyReviews(); // Reload reviews
        },
        error: (error) => {
          console.error('Error deleting review:', error);
          const errorMessage = error.error?.error || 'Failed to delete review';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.editForm.controls).forEach(field => {
      const control = this.editForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.editForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['minlength']) {
        return `Comment must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['maxlength']) {
        return `Comment cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
      }
      if (field.errors['min']) {
        return 'Please select a rating';
      }
    }
    return '';
  }

  get commentCharCount(): number {
    return this.editForm.get('comment')?.value?.length || 0;
  }

  getAverageRating(): number {
    if (this.reviews.length === 0) return 0;
    const sum = this.reviews.reduce((total, review) => total + review.rating, 0);
    return sum / this.reviews.length;
  }

  trackByReviewId(index: number, review: Review): string {
    return review._id || index.toString();
  }

  get isCustomer(): boolean {
    return this.authService.isCustomer();
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }
}
