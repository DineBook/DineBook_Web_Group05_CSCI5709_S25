import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
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
import {
  ReviewService,
  Review,
  UpdateReviewRequest,
} from '../../services/review.service';
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
    MatTooltipModule,
  ],
  templateUrl: './my-reviews.html',
  styleUrl: './my-reviews.scss',
})
export class MyReviewsComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  reviews: Review[] = [];
  loading = false;
  error: string | null = null;
  editingReview: string | null = null;
  editForm!: FormGroup;
  selectedRating = 0;
  hoverRating = 0;

  // Image upload properties for editing
  selectedImage: { file: File; preview: string } | null = null;
  currentImageUrl: string | null = null;
  isDragOver = false;
  uploadError = '';
  maxFileSize = 5 * 1024 * 1024; // 5MB

  constructor(
    private reviewService: ReviewService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.initializeEditForm();
    this.loadMyReviews();
  }

  initializeEditForm() {
    this.editForm = this.fb.group({
      rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(500),
        ],
      ],
    });
  }

  loadMyReviews() {
    if (!this.authService.isLoggedIn) {
      this.error = 'Please log in to view your reviews';
      this.snackBar
        .open('Please log in to view your reviews', 'Login', { duration: 5000 })
        .onAction()
        .subscribe(() => {
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
          this.snackBar
            .open('Session expired. Please log in again.', 'Login', {
              duration: 5000,
            })
            .onAction()
            .subscribe(() => {
              window.location.href = '/sign-in';
            });
        } else {
          this.error = 'Failed to load your reviews';
          this.snackBar.open('Failed to load your reviews', 'Close', {
            duration: 3000,
          });
        }
        this.loading = false;
      },
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
    this.currentImageUrl = review.imageUrl || null;
    this.selectedImage = null;
    this.uploadError = '';

    this.editForm.patchValue({
      rating: review.rating,
      comment: review.comment,
    });
  }

  cancelEdit() {
    this.editingReview = null;
    this.selectedRating = 0;
    this.hoverRating = 0;
    this.currentImageUrl = null;
    this.selectedImage = null;
    this.uploadError = '';
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
      comment: this.editForm.value.comment.trim(),
    };

    // Add image if selected
    if (this.selectedImage) {
      updateData.image = this.selectedImage.file;
    }

    this.reviewService.updateReview(reviewId, updateData).subscribe({
      next: (response) => {
        this.snackBar.open('Review updated successfully!', 'Close', {
          duration: 3000,
        });
        this.cancelEdit();
        this.loadMyReviews(); // Reload reviews
      },
      error: (error) => {
        console.error('Error updating review:', error);
        const errorMessage = error.error?.error || 'Failed to update review';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      },
    });
  }

  deleteReview(reviewId: string, restaurantName: string) {
    const confirmed = confirm(
      `Are you sure you want to delete your review for ${restaurantName}?`
    );

    if (confirmed) {
      this.reviewService.deleteReview(reviewId).subscribe({
        next: (response) => {
          this.snackBar.open('Review deleted successfully', 'Close', {
            duration: 3000,
          });
          this.loadMyReviews(); // Reload reviews
        },
        error: (error) => {
          console.error('Error deleting review:', error);
          const errorMessage = error.error?.error || 'Failed to delete review';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        },
      });
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.editForm.controls).forEach((field) => {
      const control = this.editForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.editForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${
          fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        } is required`;
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
    const sum = this.reviews.reduce(
      (total, review) => total + review.rating,
      0
    );
    return sum / this.reviews.length;
  }

  trackByReviewId(index: number, review: Review): string {
    return review._id || index.toString();
  }

  // Image upload methods
  onFileSelected(event: Event): void {
    this.uploadError = '';
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.handleFile(file);
      // Reset input value
      setTimeout(() => {
        input.value = '';
      }, 100);
    }
  }

  triggerFileInput(): void {
    this.uploadError = '';

    // Try ViewChild first (most reliable)
    if (this.fileInput?.nativeElement) {
      try {
        this.fileInput.nativeElement.click();
        return;
      } catch (error) {
        console.error('ViewChild click failed:', error);
      }
    }

    // Fallback: Create temporary input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpg,image/jpeg,.png,.jpg,.jpeg';
    input.style.display = 'none';

    input.onchange = (event: Event) => {
      this.onFileSelected(event);
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.uploadError = '';
    this.isDragOver = true;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const uploadArea = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as HTMLElement;

    if (!relatedTarget || !uploadArea.contains(relatedTarget)) {
      this.isDragOver = false;
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    this.uploadError = '';

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handleFile(file);
    }
  }

  private handleFile(file: File): void {
    this.uploadError = '';

    if (!file) {
      this.uploadError = 'No file selected.';
      return;
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpg', 'image/jpeg'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const validExtensions = ['png', 'jpg', 'jpeg'];

    if (!validTypes.includes(file.type)) {
      this.uploadError = `Invalid file type: ${file.type}. Only PNG and JPG files are allowed.`;
      return;
    }

    if (!validExtensions.includes(fileExtension || '')) {
      this.uploadError = `Invalid file extension: .${fileExtension}. Only .png, .jpg, and .jpeg files are allowed.`;
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > this.maxFileSize) {
      this.uploadError = `File size (${this.formatFileSize(
        file.size
      )}) exceeds the ${this.formatFileSize(this.maxFileSize)} limit.`;
      return;
    }

    // Validate minimum file size
    if (file.size < 1024) {
      this.uploadError = 'File is too small. Please select a valid image file.';
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        if (!result || !result.startsWith('data:image/')) {
          this.uploadError =
            'Failed to process image. Please try a different file.';
          return;
        }

        this.selectedImage = {
          file,
          preview: result,
        };

        this.snackBar.open(
          `Image "${file.name}" loaded successfully!`,
          'Close',
          {
            duration: 3000,
          }
        );
      } catch (error) {
        this.uploadError = `Failed to process "${file.name}". Please try a different file.`;
      }
    };

    reader.onerror = () => {
      this.uploadError = `Failed to read "${file.name}". The file may be corrupted.`;
    };

    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.selectedImage = null;
    this.uploadError = '';
    this.snackBar.open('Image removed successfully', 'Close', {
      duration: 3000,
    });
  }

  removeCurrentImage(): void {
    this.currentImageUrl = null;
    this.snackBar.open(
      'Current image will be removed when you save changes',
      'Close',
      {
        duration: 3000,
      }
    );
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Handle image loading errors
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;

    // Hide the image container completely
    const container = img.closest('.review-image-container');
    if (container && container instanceof HTMLElement) {
      container.style.display = 'none';
    }
  }

  // Handle image click to open in new tab
  onImageClick(imageUrl: string): void {
    window.open(imageUrl, '_blank');
  }

  get isCustomer(): boolean {
    return this.authService.isCustomer();
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }
}
