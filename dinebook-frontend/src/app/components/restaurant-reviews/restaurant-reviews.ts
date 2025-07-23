import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReviewService, Review } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-restaurant-reviews',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './restaurant-reviews.html',
  styleUrl: './restaurant-reviews.scss'
})
export class RestaurantReviewsComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() restaurantId!: string;
  @Input() restaurantName!: string;
  @Output() reviewsUpdated = new EventEmitter<{totalReviews: number, averageRating: number}>();

  reviews: Review[] = [];
  userReview: Review | null = null;
  loading = false;
  error: string | null = null;
  averageRating = 0;
  totalReviews = 0;
  ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  
  editingReply = '';
  newReply = '';
  isEditingReview = false;
  editReviewData = { rating: 0, comment: '' };

  constructor(
    private reviewService: ReviewService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
    this.loadReviews();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['restaurantId'] && !changes['restaurantId'].firstChange) {
      this.loadReviews();
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.findUserReview();
    }, 100);
  }

  loadReviews() {
    if (!this.restaurantId) return;
    
    this.loading = true;
    this.error = null;
    
    this.reviewService.getReviewsByRestaurant(this.restaurantId).subscribe({
      next: (response) => {
        this.reviews = response.reviews;
        this.calculateStats();
        
        setTimeout(() => {
          this.findUserReview();
        }, 50);
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        this.error = 'Failed to load reviews';
        this.loading = false;
      }
    });
  }

  /**
   * Check if a review belongs to the current logged-in user
   */
  isCurrentUserReview(review: any): boolean {
    if (!this.isLoggedIn || !this.isCustomer || !review) {
      return false;
    }
    
    const currentUser = this.authService.getUser();
    if (!currentUser) {
      return false;
    }
    
    const currentUserId = String(currentUser.id || currentUser._id || '').trim();
    
    if (!currentUserId) {
      return false;
    }
    
    let customerIdToCheck = null;
    
    if (review.customerId) {
      if (typeof review.customerId === 'string') {
        customerIdToCheck = review.customerId;
      } else if (review.customerId._id) {
        customerIdToCheck = review.customerId._id;
      }
    }
    
    if (customerIdToCheck) {
      const customerIdStr = String(customerIdToCheck).trim();
      return customerIdStr === currentUserId;
    }
    
    return false;
  }

  editReviewInList(review: any): void {
    this.userReview = { ...review };
    this.editReviewData.rating = review.rating;
    this.editReviewData.comment = review.comment;
    this.isEditingReview = true;
    
    const reviewForm = document.querySelector('.review-form');
    if (reviewForm) {
      reviewForm.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async deleteReviewInList(review: any): Promise<void> {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      await this.reviewService.deleteReview(review._id);
      this.snackBar.open('Review deleted successfully!', 'Close', { duration: 3000 });
      this.loadReviews();
      this.reviewsUpdated.emit();
    } catch (error) {
      console.error('Error deleting review:', error);
      this.snackBar.open('Failed to delete review. Please try again.', 'Close', { duration: 3000 });
    }
  }

  private findUserReview() {
    this.userReview = null;
    
    if (!this.isLoggedIn) {
      return;
    }

    const currentUser = this.authService.getUser();
    if (!currentUser) {
      return;
    }

    const currentUserId = String(currentUser.id || currentUser._id || '').trim();

    if (!currentUserId) {
      return;
    }

    for (const review of this.reviews) {
      let customerIdToCheck = null;
      
      if (review.customerId) {
        if (typeof review.customerId === 'string') {
          customerIdToCheck = review.customerId;
        } else if (review.customerId._id) {
          customerIdToCheck = review.customerId._id;
        }
      }
      
      if (customerIdToCheck) {
        const customerIdStr = String(customerIdToCheck).trim();
        
        if (customerIdStr === currentUserId) {
          this.userReview = review;
          break;
        }
      }
    }

    if (this.userReview) {
      this.isEditingReview = false;
    }
  }

  private calculateStats() {
    this.totalReviews = this.reviews.length;
    
    if (this.totalReviews === 0) {
      this.averageRating = 0;
      this.ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    } else {
      const sum = this.reviews.reduce((total, review) => total + review.rating, 0);
      this.averageRating = sum / this.totalReviews;

      this.ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      
      this.reviews.forEach(review => {
        this.ratingDistribution[review.rating as keyof typeof this.ratingDistribution]++;
      });
    }

    this.reviewsUpdated.emit({
      totalReviews: this.totalReviews,
      averageRating: this.averageRating
    });
  }

  getStarArray(rating: number): { icon: string; filled: boolean }[] {
    return this.reviewService.getStarArray(rating);
  }

  formatDate(dateString: string): string {
    return this.reviewService.formatDate(dateString);
  }

  getRatingPercentage(rating: number): number {
    if (this.totalReviews === 0) return 0;
    return (this.ratingDistribution[rating as keyof typeof this.ratingDistribution] / this.totalReviews) * 100;
  }

  startEditUserReview() {
    if (!this.userReview) return;
    this.isEditingReview = true;
    this.editReviewData = {
      rating: this.userReview.rating,
      comment: this.userReview.comment
    };
  }

  cancelEditUserReview() {
    this.isEditingReview = false;
    this.editReviewData = { rating: 0, comment: '' };
    
    if (this.userReview) {
      this.editReviewData = {
        rating: this.userReview.rating,
        comment: this.userReview.comment
      };
    }
  }

  updateUserReview() {
    if (!this.userReview || !this.editReviewData.rating || !this.editReviewData.comment.trim()) {
      this.snackBar.open('Please provide both rating and comment', 'Close', { duration: 3000 });
      return;
    }

    this.reviewService.updateReview(this.userReview._id!, {
      rating: this.editReviewData.rating,
      comment: this.editReviewData.comment.trim()
    }).subscribe({
      next: (response) => {
        this.snackBar.open('Review updated successfully!', 'Close', { duration: 3000 });
        this.isEditingReview = false;
        this.editReviewData = { rating: 0, comment: '' };
        this.loadReviews();
      },
      error: (error) => {
        console.error('Error updating review:', error);
        this.snackBar.open(error.error?.error || 'Failed to update review', 'Close', { duration: 3000 });
      }
    });
  }

  deleteUserReview() {
    if (!this.userReview) return;

    if (confirm('Are you sure you want to delete your review? This action cannot be undone.')) {
      this.reviewService.deleteReview(this.userReview._id!).subscribe({
        next: (response) => {
          this.snackBar.open('Review deleted successfully', 'Close', { duration: 3000 });
          this.userReview = null;
          this.isEditingReview = false;
          this.editReviewData = { rating: 0, comment: '' };
          this.loadReviews();
        },
        error: (error) => {
          console.error('Error deleting review:', error);
          this.snackBar.open(error.error?.error || 'Failed to delete review', 'Close', { duration: 3000 });
        }
      });
    }
  }

  onStarClick(rating: number) {
    this.editReviewData.rating = rating;
  }

  getStarIcon(position: number): string {
    return position <= this.editReviewData.rating ? 'star' : 'star_border';
  }

  getStarClass(position: number): string {
    return position <= this.editReviewData.rating ? 'filled' : 'empty';
  }

  get hasUserReviewed(): boolean {
    const result = this.userReview !== null;
    return result;
  }

  getOtherReviews(): Review[] {
    if (!this.userReview) {
      return this.reviews;
    }
    return this.reviews.filter(review => review._id !== this.userReview!._id);
  }

  submitNewReview() {
    if (!this.editReviewData.rating || !this.editReviewData.comment.trim()) {
      this.snackBar.open('Please provide both rating and comment', 'Close', { duration: 3000 });
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

    if (this.hasUserReviewed) {
      this.snackBar.open('You have already reviewed this restaurant. You can edit your existing review.', 'Close', { duration: 3000 });
      return;
    }

    const reviewData = {
      restaurantId: this.restaurantId,
      rating: this.editReviewData.rating,
      comment: this.editReviewData.comment.trim()
    };

    this.reviewService.createReview(reviewData).subscribe({
      next: (response) => {
        this.snackBar.open('Review submitted successfully!', 'Close', { duration: 3000 });
        this.editReviewData = { rating: 0, comment: '' };
        this.loadReviews();
      },
      error: (error) => {
        console.error('Error submitting review:', error);
        const errorMessage = error.error?.error || 'Failed to submit review';
        
        if (errorMessage.includes('already reviewed') || errorMessage.includes('duplicate')) {
          this.snackBar.open('You have already reviewed this restaurant', 'Close', { duration: 3000 });
          this.loadReviews();
        } else {
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      }
    });
  }

  startEditReply(review: Review) {
    this.editingReply = review._id!;
    this.newReply = review.ownerReply || '';
  }

  onReplyToReview(reviewId: string, reply: string) {
    if (!reply.trim()) {
      this.snackBar.open('Reply cannot be empty', 'Close', { duration: 3000 });
      return;
    }

    this.reviewService.replyToReview(reviewId, { reply: reply.trim() }).subscribe({
      next: (response) => {
        this.snackBar.open('Reply added successfully', 'Close', { duration: 3000 });
        this.loadReviews(); // Reload to show the new reply
        this.editingReply = '';
        this.newReply = '';
      },
      error: (error) => {
        console.error('Error adding reply:', error);
        this.snackBar.open(error.error?.error || 'Failed to add reply', 'Close', { duration: 3000 });
      }
    });
  }

  onUpdateReply(reviewId: string, reply: string) {
    if (!reply.trim()) {
      this.snackBar.open('Reply cannot be empty', 'Close', { duration: 3000 });
      return;
    }

    this.reviewService.replyToReview(reviewId, { reply: reply.trim() }).subscribe({
      next: (response) => {
        this.snackBar.open('Reply updated successfully', 'Close', { duration: 3000 });
        this.loadReviews(); // Reload to show the updated reply
        this.editingReply = '';
        this.newReply = '';
      },
      error: (error) => {
        console.error('Error updating reply:', error);
        this.snackBar.open(error.error?.error || 'Failed to update reply', 'Close', { duration: 3000 });
      }
    });
  }

  onDeleteReply(reviewId: string) {
    // Implement delete reply functionality when backend supports it
    this.snackBar.open('Delete reply functionality not yet implemented', 'Close', { duration: 3000 });
  }

  trackByReviewId(index: number, review: Review): string {
    return review._id || index.toString();
  }

  get isOwner(): boolean {
    return this.authService.isOwner();
  }

  get isCustomer(): boolean {
    return this.authService.isCustomer();
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }
}
