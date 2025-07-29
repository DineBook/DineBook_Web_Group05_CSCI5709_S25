import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ReviewService, Review } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';

interface ImageFile {
  file: File;
  preview: string;
}

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
    MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: './restaurant-reviews.html',
  styleUrl: './restaurant-reviews.scss',
})
export class RestaurantReviewsComponent
  implements OnInit, OnChanges, AfterViewInit, OnDestroy
{
  @Input() restaurantId!: string;
  @Input() restaurantName!: string;
  @Input() restaurantOwnerId!: string;
  @Output() reviewsUpdated = new EventEmitter<{
    totalReviews: number;
    averageRating: number;
  }>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

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
  editingReviewId = '';
  showWriteReviewForm = false;
  editReviewData = { rating: 0, comment: '' };

  // Image upload properties
  selectedImage: ImageFile | null = null;
  isDragOver = false;
  uploadProgress = 0;
  uploadError = '';
  maxFileSize = 5 * 1024 * 1024; // 5MB

  // Image editing properties for inline edit
  currentImageUrl: string | null = null;

  constructor(
    private reviewService: ReviewService,
    public authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

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

    // Add global drag event prevention to prevent browser from opening files
    this.addGlobalDragPrevention();
  }

  ngOnDestroy() {
    // Remove global drag event listeners
    this.removeGlobalDragPrevention();
  }

  private addGlobalDragPrevention() {
    // Prevent browser default drag and drop behavior globally
    // but EXCLUDE our upload area completely
    document.addEventListener('dragover', this.preventDefaultsGlobal, false);
    document.addEventListener('drop', this.preventDefaultsGlobal, false);
    document.addEventListener('dragenter', this.preventDefaultsGlobal, false);
  }

  private removeGlobalDragPrevention() {
    // Clean up global event listeners
    document.removeEventListener('dragover', this.preventDefaultsGlobal, false);
    document.removeEventListener('drop', this.preventDefaultsGlobal, false);
    document.removeEventListener(
      'dragenter',
      this.preventDefaultsGlobal,
      false
    );
  }

  private preventDefaultsGlobal = (e: Event) => {
    // Only prevent defaults if the event is NOT from our upload area or its children
    const target = e.target as HTMLElement;
    const uploadArea = target.closest('.upload-area');
    const uploadSection = target.closest('.image-upload-section');

    // If the event is from upload area or upload section, let it handle its own events
    if (!uploadArea && !uploadSection) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

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
      },
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

    const currentUserId = String(
      currentUser.id || currentUser._id || ''
    ).trim();

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
    this.editingReviewId = review._id;
    this.editReviewData.rating = review.rating;
    this.editReviewData.comment = review.comment;

    // Initialize image data for editing
    this.currentImageUrl = review.imageUrl || null;
    this.selectedImage = null;
    this.uploadError = '';
  }

  cancelEditReviewInList(): void {
    this.editingReviewId = '';
    this.editReviewData = { rating: 0, comment: '' };

    // Reset image editing state
    this.currentImageUrl = null;
    this.selectedImage = null;
    this.uploadError = '';
  }

  cancelWriteReview(): void {
    this.showWriteReviewForm = false;
    this.editReviewData = { rating: 0, comment: '' };
    this.selectedImage = null;
    this.uploadProgress = 0;
    this.uploadError = '';
  }

  async submitNewReview(): Promise<void> {
    if (!this.editReviewData.rating || !this.editReviewData.comment.trim()) {
      return;
    }

    try {
      const reviewData: { restaurantId: string; rating: number; comment: string; image?: File } = {
        restaurantId: this.restaurantId,
        rating: this.editReviewData.rating,
        comment: this.editReviewData.comment.trim(),
      };

      await this.reviewService.createReview(reviewData).toPromise();

      this.snackBar.open('Review submitted successfully!', 'Close', {
        duration: 3000,
      });
      this.cancelWriteReview();
      await this.loadReviews();
      this.reviewsUpdated.emit();
    } catch (error) {
      console.error('Error submitting review:', error);
      this.snackBar.open(
        'Failed to submit review. Please try again.',
        'Close',
        { duration: 3000 }
      );
    }
  }

  async updateReviewInList(): Promise<void> {
    if (!this.editReviewData.rating || !this.editReviewData.comment.trim()) {
      return;
    }

    try {
      const updateData: { rating: number; comment: string; image?: File } = {
        rating: this.editReviewData.rating,
        comment: this.editReviewData.comment.trim(),
      };

      // Add image file if new image selected
      if (this.selectedImage) {
        updateData.image = this.selectedImage.file;
      }

      console.log('Updating review with data:', updateData);
      console.log('Review ID:', this.editingReviewId);

      await this.reviewService
        .updateReview(this.editingReviewId, updateData)
        .toPromise();

      this.snackBar.open('Review updated successfully!', 'Close', {
        duration: 3000,
      });
      this.cancelEditReviewInList();
      await this.loadReviews();
      this.reviewsUpdated.emit();
    } catch (error) {
      console.error('Error updating review:', error);
      this.snackBar.open(
        'Failed to update review. Please try again.',
        'Close',
        { duration: 3000 }
      );
    }
  }

  async deleteReviewInList(review: any): Promise<void> {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      console.log('Deleting review with ID:', review._id);
      await this.reviewService.deleteReview(review._id).toPromise();
      this.snackBar.open('Review deleted successfully!', 'Close', {
        duration: 3000,
      });
      await this.loadReviews();
      this.reviewsUpdated.emit();
    } catch (error) {
      console.error('Error deleting review:', error);
      this.snackBar.open(
        'Failed to delete review. Please try again.',
        'Close',
        { duration: 3000 }
      );
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

    const currentUserId = String(
      currentUser.id || currentUser._id || ''
    ).trim();

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
      const sum = this.reviews.reduce(
        (total, review) => total + review.rating,
        0
      );
      this.averageRating = sum / this.totalReviews;

      this.ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      this.reviews.forEach((review) => {
        this.ratingDistribution[
          review.rating as keyof typeof this.ratingDistribution
        ]++;
      });
    }

    this.reviewsUpdated.emit({
      totalReviews: this.totalReviews,
      averageRating: this.averageRating,
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
    return (
      (this.ratingDistribution[rating as keyof typeof this.ratingDistribution] /
        this.totalReviews) *
      100
    );
  }

  getRatingCount(rating: number): number {
    return this.ratingDistribution[
      rating as keyof typeof this.ratingDistribution
    ];
  }

  // Filter out reviews with empty comments for display
  getFilteredReviews(): Review[] {
    return this.reviews.filter(
      (review) => review.comment && review.comment.trim().length > 0
    );
  }

  startEditUserReview() {
    if (!this.userReview) return;
    this.isEditingReview = true;
    this.editReviewData = {
      rating: this.userReview.rating,
      comment: this.userReview.comment,
    };
  }

  cancelEditUserReview() {
    this.isEditingReview = false;
    this.editReviewData = { rating: 0, comment: '' };

    if (this.userReview) {
      this.editReviewData = {
        rating: this.userReview.rating,
        comment: this.userReview.comment,
      };
    }
  }

  updateUserReview() {
    if (
      !this.userReview ||
      !this.editReviewData.rating ||
      !this.editReviewData.comment.trim()
    ) {
      this.snackBar.open('Please provide both rating and comment', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.reviewService
      .updateReview(this.userReview._id!, {
        rating: this.editReviewData.rating,
        comment: this.editReviewData.comment.trim(),
      })
      .subscribe({
        next: (response) => {
          this.snackBar.open('Review updated successfully!', 'Close', {
            duration: 3000,
          });
          this.isEditingReview = false;
          this.editReviewData = { rating: 0, comment: '' };
          this.loadReviews();
        },
        error: (error) => {
          console.error('Error updating review:', error);
          this.snackBar.open(
            error.error?.error || 'Failed to update review',
            'Close',
            { duration: 3000 }
          );
        },
      });
  }

  deleteUserReview() {
    if (!this.userReview) return;

    if (
      confirm(
        'Are you sure you want to delete your review? This action cannot be undone.'
      )
    ) {
      this.reviewService.deleteReview(this.userReview._id!).subscribe({
        next: (response) => {
          this.snackBar.open('Review deleted successfully', 'Close', {
            duration: 3000,
          });
          this.userReview = null;
          this.isEditingReview = false;
          this.editReviewData = { rating: 0, comment: '' };
          this.loadReviews();
        },
        error: (error) => {
          console.error('Error deleting review:', error);
          this.snackBar.open(
            error.error?.error || 'Failed to delete review',
            'Close',
            { duration: 3000 }
          );
        },
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
    return this.reviews.filter((review) => review._id !== this.userReview!._id);
  }

  startEditReply(review: Review) {
    this.editingReply = review._id!;
    this.newReply = review.ownerReply || '';
  }

  startNewReply(review: Review) {
    console.log('🔥 startNewReply called!', review._id);
    console.log('🔥 Before - editingReply:', this.editingReply);
    this.editingReply = review._id!;
    this.newReply = '';
    console.log('🔥 After - editingReply:', this.editingReply);
    console.log('🔥 newReply:', this.newReply);
  }

  onReplyToReview(reviewId: string, reply: string) {
    if (!reply.trim()) {
      this.snackBar.open('Reply cannot be empty', 'Close', { duration: 3000 });
      return;
    }

    this.reviewService
      .replyToReview(reviewId, { reply: reply.trim() })
      .subscribe({
        next: (response) => {
          this.snackBar.open('Reply added successfully', 'Close', {
            duration: 3000,
          });
          this.loadReviews(); // Reload to show the new reply
          this.editingReply = '';
          this.newReply = '';
        },
        error: (error) => {
          console.error('Error adding reply:', error);
          this.snackBar.open(
            error.error?.error || 'Failed to add reply',
            'Close',
            { duration: 3000 }
          );
        },
      });
  }

  onUpdateReply(reviewId: string, reply: string) {
    if (!reply.trim()) {
      this.snackBar.open('Reply cannot be empty', 'Close', { duration: 3000 });
      return;
    }

    this.reviewService
      .updateReply(reviewId, { reply: reply.trim() })
      .subscribe({
        next: (response) => {
          this.snackBar.open('Reply updated successfully', 'Close', {
            duration: 3000,
          });
          this.loadReviews(); // Reload to show the updated reply
          this.editingReply = '';
          this.newReply = '';
        },
        error: (error) => {
          console.error('Error updating reply:', error);
          this.snackBar.open(
            error.error?.error || 'Failed to update reply',
            'Close',
            { duration: 3000 }
          );
        },
      });
  }

  onDeleteReply(reviewId: string) {
    if (confirm('Are you sure you want to delete this reply?')) {
      this.reviewService.deleteReply(reviewId).subscribe({
        next: (response) => {
          this.snackBar.open('Reply deleted successfully', 'Close', {
            duration: 3000,
          });
          this.loadReviews(); // Reload to show the updated review without reply
          this.editingReply = '';
          this.newReply = '';
        },
        error: (error) => {
          console.error('Error deleting reply:', error);
          this.snackBar.open(
            error.error?.error || 'Failed to delete reply',
            'Close',
            { duration: 3000 }
          );
        },
      });
    }
  }

  trackByReviewId(index: number, review: Review): string {
    return review._id || index.toString();
  }

  get isOwner(): boolean {
    return this.authService.isOwner();
  }

  get isRestaurantOwner(): boolean {
    console.log('🔍 Checking isRestaurantOwner...');
    console.log('🔍 isOwner:', this.isOwner);
    console.log('🔍 restaurantOwnerId:', this.restaurantOwnerId);

    if (!this.isOwner || !this.restaurantOwnerId) {
      console.log('🔍 Early return false - no owner or no restaurantOwnerId');
      return false;
    }

    const currentUser = this.authService.getUser();
    console.log('🔍 currentUser:', currentUser);
    if (!currentUser) {
      console.log('🔍 Early return false - no current user');
      return false;
    }

    const currentUserId = String(
      currentUser.id || currentUser._id || ''
    ).trim();
    const restaurantOwnerIdStr = String(this.restaurantOwnerId).trim();
    console.log('🔍 currentUserId:', currentUserId);
    console.log('🔍 restaurantOwnerIdStr:', restaurantOwnerIdStr);
    console.log('🔍 Match:', currentUserId === restaurantOwnerIdStr);

    return currentUserId === restaurantOwnerIdStr;
  }

  get isCustomer(): boolean {
    return this.authService.isCustomer();
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  getCurrentUserId(): string {
    const user = this.authService.getUser();
    return user ? user.id || user._id || 'NO_ID' : 'NO_USER';
  }

  testClick() {
    alert('🎉 Click event works! Button is responsive.');
    console.log('🎉 Test click works!');
  }

  getRatingText(rating: number): string {
    const ratingTexts = {
      1: '😞 Poor - Needs significant improvement',
      2: '😐 Fair - Below average experience',
      3: '🙂 Good - Average experience',
      4: '😊 Very Good - Above average',
      5: '🤩 Excellent - Outstanding experience!',
    };
    return ratingTexts[rating as keyof typeof ratingTexts] || '';
  }

  // Image upload methods
  onFileSelected(event: Event): void {
    console.log('=== ON FILE SELECTED TRIGGERED ===');
    console.log('Event:', event);
    console.log('Event target:', event.target);

    this.uploadError = '';
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      console.log('File selected from input:', {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      this.handleFile(file);

      // Reset the input value to allow selecting the same file again
      setTimeout(() => {
        input.value = '';
        console.log('Input value reset');
      }, 100);
    } else {
      console.log('No file selected or files array is empty');
      console.log('Input files:', input.files);
      console.log('Input files length:', input.files?.length);
    }

    console.log('=== ON FILE SELECTED COMPLETE ===');
  }

  onUploadKeydown(event: KeyboardEvent): void {
    // Only trigger on Enter or Space key
    if (event.key === 'Enter' || event.key === ' ') {
      this.triggerFileInput(event);
    }
  }

  triggerFileInput(event?: MouseEvent | KeyboardEvent): void {
    console.log('=== TRIGGER FILE INPUT CALLED ===');
    console.log('Event:', event);
    console.log('Event type:', event?.type);

    // Handle keyboard events
    if (event instanceof KeyboardEvent) {
      // Only trigger on Enter or Space key
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      console.log('🎯 Keyboard trigger detected:', event.key);
    } else if (event instanceof MouseEvent) {
      // Only trigger on left-click (button 0)
      if (event.button !== 0) {
        console.log('Non-left click detected, ignoring');
        return;
      }
      console.log('🎯 Mouse click detected');
    }

    // Prevent any default behaviors that might interfere
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Clear any previous errors
    this.uploadError = '';
    console.log('🎯 Click to upload triggered - opening file browser...');

    // Use immediate execution instead of setTimeout to avoid timing issues
    this.executeFileInputClick();
  }

  private executeFileInputClick(): void {
    // Try ViewChild first (most reliable)
    if (this.fileInput?.nativeElement) {
      console.log('Using ViewChild to trigger file input');
      try {
        this.fileInput.nativeElement.click();
        console.log('ViewChild click executed successfully');
        return;
      } catch (error) {
        console.error('ViewChild click failed:', error);
      }
    } else {
      console.log('ViewChild not available');
    }

    // Fallback: Try to find the file input by ID
    try {
      const fileInputById = document.querySelector(
        'input[type="file"]#fileInput'
      ) as HTMLInputElement;
      if (fileInputById) {
        console.log('Using ID selector to trigger file input');
        fileInputById.click();
        console.log('ID selector click executed successfully');
        return;
      } else {
        console.log('File input by ID not found');
      }
    } catch (error) {
      console.error('ID selector click failed:', error);
    }

    // Fallback: Try to find any file input in the upload section
    try {
      const uploadSection = document.querySelector('.image-upload-section');
      const fileInput = uploadSection?.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      if (fileInput) {
        console.log('Using upload section file input');
        fileInput.click();
        console.log('Upload section click executed successfully');
        return;
      } else {
        console.log('File input in upload section not found');
      }
    } catch (error) {
      console.error('Upload section click failed:', error);
    }

    // Last resort: Create temporary input
    console.log('Creating temporary file input as last resort');
    this.createTemporaryFileInput();
  }

  private createTemporaryFileInput(): void {
    const tempInput = document.createElement('input');
    tempInput.type = 'file';
    tempInput.accept = 'image/png,image/jpg,image/jpeg,.png,.jpg,.jpeg';
    tempInput.style.display = 'none';

    tempInput.onchange = (event: Event) => {
      console.log('Temporary file input change event');
      this.onFileSelected(event);
      document.body.removeChild(tempInput);
    };

    document.body.appendChild(tempInput);
    tempInput.click();
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    console.log('Drag enter triggered on upload area');
    this.uploadError = '';
    this.isDragOver = true;

    // Set drag effect to copy
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Don't clear errors or change state repeatedly in dragover
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Only set isDragOver to false if we're actually leaving the upload area
    // Check if the related target is still within our upload area
    const uploadArea = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as HTMLElement;

    if (!relatedTarget || !uploadArea.contains(relatedTarget)) {
      this.isDragOver = false;
      console.log('Drag leave - actually leaving upload area');
    }
  }

  onDrop(event: DragEvent): void {
    // CRITICAL: Prevent all default behaviors immediately
    event.preventDefault();
    event.stopPropagation();

    console.log('=== DROP EVENT TRIGGERED ===');
    console.log('Event type:', event.type);
    console.log('Target:', event.target);
    console.log('Current target:', event.currentTarget);

    // Reset drag state
    this.isDragOver = false;
    this.uploadError = '';

    // Validate that files are being dropped
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      console.log(
        'File dropped successfully:',
        file.name,
        file.type,
        file.size
      );

      // Process the file immediately without additional validation here
      // (validation happens in handleFile)
      this.handleFile(file);
    } else {
      console.log('No files found in drop event');
      this.uploadError =
        'No files detected. Please try dropping a valid image file.';
    }

    console.log('=== DROP EVENT COMPLETE ===');
  }

  private handleFile(file: File): void {
    console.log('=== HANDLE FILE CALLED ===');
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
    });

    // Clear any previous errors
    this.uploadError = '';

    if (!file) {
      this.uploadError = 'No file selected.';
      console.log('No file provided');
      return;
    }

    // Validate file type - specifically check for PNG and JPG/JPEG
    const validTypes = ['image/png', 'image/jpg', 'image/jpeg'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const validExtensions = ['png', 'jpg', 'jpeg'];

    console.log('File validation:', {
      fileType: file.type,
      fileExtension: fileExtension,
      validTypes: validTypes,
      validExtensions: validExtensions,
    });

    // Check MIME type first
    if (!validTypes.includes(file.type)) {
      this.uploadError = `Invalid file type: ${file.type}. Only PNG and JPG files are allowed.`;
      console.log('Invalid MIME type');
      return;
    }

    // Check file extension as secondary validation
    if (!validExtensions.includes(fileExtension || '')) {
      this.uploadError = `Invalid file extension: .${fileExtension}. Only .png, .jpg, and .jpeg files are allowed.`;
      console.log('Invalid file extension');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > this.maxFileSize) {
      this.uploadError = `File size (${this.formatFileSize(
        file.size
      )}) exceeds the ${this.formatFileSize(this.maxFileSize)} limit.`;
      console.log('File too large');
      return;
    }

    // Validate minimum file size (prevent empty files)
    if (file.size < 1024) {
      // 1KB minimum
      this.uploadError = 'File is too small. Please select a valid image file.';
      console.log('❌ File too small');
      return;
    }

    console.log('File validation passed, creating preview...');

    // Create preview
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;

        // Validate that the result is a valid data URL
        if (!result || !result.startsWith('data:image/')) {
          this.uploadError =
            'Failed to process image. Please try a different file.';
          console.log('Invalid data URL result');
          return;
        }

        this.selectedImage = {
          file,
          preview: result,
        };

        // Show success message
        this.snackBar.open(
          `Image "${file.name}" loaded successfully!`,
          'Close',
          {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          }
        );

        console.log('Image preview created successfully');
      } catch (error) {
        console.error('Error processing image:', error);
        this.uploadError = `Failed to process "${file.name}". Please try a different file.`;
      }
    };

    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      this.uploadError = `Failed to read "${file.name}". The file may be corrupted.`;
    };

    // Start reading the file
    console.log('📖 Starting to read file...');
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.selectedImage = null;
    this.uploadProgress = 0;
    this.uploadError = '';

    // Reset the file input
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }

    // Show feedback to user
    this.snackBar.open('Image removed successfully', 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
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
}
