import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReviewService, CreateReviewRequest } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-write-review',
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
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './write-review.html',
  styleUrl: './write-review.scss'
})
export class WriteReviewComponent implements OnInit {
  @Input() restaurantId!: string;
  @Input() restaurantName!: string;
  @Output() reviewSubmitted = new EventEmitter<void>();

  reviewForm!: FormGroup;
  submitting = false;
  selectedRating = 0;
  hoverRating = 0;

  constructor(
    private fb: FormBuilder,
    private reviewService: ReviewService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
    this.initializeForm();
  }

  initializeForm() {
    this.reviewForm = this.fb.group({
      rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    });
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  get isCustomer(): boolean {
    return this.authService.isCustomer();
  }

  onStarClick(rating: number) {
    this.selectedRating = rating;
    this.reviewForm.patchValue({ rating });
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

  onSubmit() {
    if (this.reviewForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (!this.isLoggedIn) {
      this.snackBar.open('Please sign in to write a review', 'Close', { duration: 3000 });
      return;
    }

    if (!this.isCustomer) {
      this.snackBar.open('Only customers can write reviews', 'Close', { duration: 3000 });
      return;
    }

    this.submitting = true;

    const reviewData: CreateReviewRequest = {
      restaurantId: this.restaurantId,
      rating: this.reviewForm.value.rating,
      comment: this.reviewForm.value.comment.trim()
    };

    this.reviewService.createReview(reviewData).subscribe({
      next: (response) => {
        this.snackBar.open('Review submitted successfully!', 'Close', { duration: 3000 });
        this.resetForm();
        this.reviewSubmitted.emit();
        this.submitting = false;
      },
      error: (error) => {
        console.error('Error submitting review:', error);
        const errorMessage = error.error?.error || 'Failed to submit review';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        this.submitting = false;
      }
    });
  }

  resetForm() {
    this.reviewForm.reset();
    this.selectedRating = 0;
    this.hoverRating = 0;
    this.reviewForm.patchValue({ rating: 0, comment: '' });
  }

  private markFormGroupTouched() {
    Object.keys(this.reviewForm.controls).forEach(field => {
      const control = this.reviewForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.reviewForm.get(fieldName);
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
    return this.reviewForm.get('comment')?.value?.length || 0;
  }
}
