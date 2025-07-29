import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Restaurant } from '../../models/owner-dashboard';

@Component({
  selector: 'app-restaurant-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatTooltipModule,
  ],
  templateUrl: './restaurant-management.html',
  styleUrl: './restaurant-management.scss',
})
export class RestaurantManagementComponent implements OnInit {
  restaurant: Restaurant | null = null;
  restaurantForm: FormGroup;
  loading = true;
  saving = false;
  error: string | null = null;
  isEditMode = false;
  viewMode = 'details'; // 'details' or 'edit'

  // Image upload properties
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;
  imageUploadError: string | null = null;
  isDragOver = false;
  imageUploadSuccess = false;

  cuisineTypes = [
    'Italian',
    'Indian',
    'Chinese',
    'Mexican',
    'American',
    'Thai',
    'Japanese',
    'Mediterranean',
    'French',
    'Other',
  ];

  priceRanges = [
    { value: 1, label: '$ - Budget Friendly' },
    { value: 2, label: '$$ - Moderate' },
    { value: 3, label: '$$$ - Expensive' },
    { value: 4, label: '$$$$ - Very Expensive' },
  ];

  daysOfWeek = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  // Image upload configuration
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.restaurantForm = this.createForm();
  }

  ngOnInit() {
    this.loadRestaurant();
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      cuisine: ['', Validators.required],
      location: ['', Validators.required],
      description: ['', Validators.maxLength(500)],
      phoneNumber: ['', Validators.pattern(/^\+?[\d\s\-\(\)]+$/)],
      email: ['', [Validators.email]],
      capacity: [50, [Validators.required, Validators.min(1)]],
      priceRange: [
        1,
        [Validators.required, Validators.min(1), Validators.max(4)],
      ],
      coordinates: this.fb.group({
        latitude: ['', [Validators.min(-90), Validators.max(90)]],
        longitude: ['', [Validators.min(-180), Validators.max(180)]],
      }),
      address: this.fb.group({
        street: [''],
        city: [''],
        province: [''],
        postalCode: [''],
      }),
      openingHours: this.fb.group({
        monday: this.fb.group({ open: [''], close: [''] }),
        tuesday: this.fb.group({ open: [''], close: [''] }),
        wednesday: this.fb.group({ open: [''], close: [''] }),
        thursday: this.fb.group({ open: [''], close: [''] }),
        friday: this.fb.group({ open: [''], close: [''] }),
        saturday: this.fb.group({ open: [''], close: [''] }),
        sunday: this.fb.group({ open: [''], close: [''] }),
      }),
    });
  }

  async loadRestaurant() {
    try {
      this.loading = true;
      this.error = null;

      // Get owner's restaurants
      const response = await this.apiService.getMyRestaurants().toPromise();

      if (response.restaurants && response.restaurants.length > 0) {
        this.restaurant = response.restaurants[0];
        this.populateForm();
        this.viewMode = 'details'; // Show details view when restaurant exists
        this.isEditMode = false;
      } else {
        // No restaurant found - show edit form for creation
        this.restaurant = null;
        this.viewMode = 'edit';
        this.isEditMode = true;
      }
    } catch (error) {
      console.error('Error loading restaurant:', error);
      this.error = 'Failed to load restaurant data.';
    } finally {
      this.loading = false;
    }
  }

  populateForm() {
    if (!this.restaurant) return;

    this.restaurantForm.patchValue({
      name: this.restaurant.name,
      cuisine: this.restaurant.cuisine,
      location: this.restaurant.location,
      description: (this.restaurant as any).description || '',
      phoneNumber: (this.restaurant as any).phoneNumber || '',
      email: (this.restaurant as any).email || '',
      capacity: (this.restaurant as any).capacity || 50,
      priceRange: this.restaurant.priceRange,
      coordinates: {
        latitude: (this.restaurant as any).coordinates?.latitude || '',
        longitude: (this.restaurant as any).coordinates?.longitude || '',
      },
      address: {
        street: (this.restaurant as any).address?.street || '',
        city: (this.restaurant as any).address?.city || '',
        province: (this.restaurant as any).address?.province || '',
        postalCode: (this.restaurant as any).address?.postalCode || '',
      },
    });

    // Populate opening hours
    const openingHours = (this.restaurant as any).openingHours || {};
    this.daysOfWeek.forEach((day) => {
      const hours = openingHours[day];
      if (hours) {
        this.restaurantForm.get(`openingHours.${day}`)?.patchValue({
          open: hours.open || '',
          close: hours.close || '',
        });
      }
    });
  }

  async onSubmit() {
    if (this.restaurantForm.valid) {
      try {
        this.saving = true;

        const formData = this.restaurantForm.value;

        // Clean up opening hours - remove empty entries
        Object.keys(formData.openingHours).forEach((day) => {
          const hours = formData.openingHours[day];
          if (!hours.open || !hours.close) {
            delete formData.openingHours[day];
          }
        });

        // Prepare FormData for image upload
        const submitData = new FormData();

        // Add all form fields to FormData
        Object.keys(formData).forEach((key) => {
          if (key === 'openingHours') {
            submitData.append(key, JSON.stringify(formData[key]));
          } else {
            submitData.append(key, formData[key]);
          }
        });

        // Add image file if selected
        if (this.selectedImageFile) {
          submitData.append('image', this.selectedImageFile);
        }

        let response;
        if (this.restaurant) {
          // Update existing restaurant
          response = await this.apiService
            .updateRestaurant(this.restaurant._id, submitData)
            .toPromise();

          this.snackBar.open('Restaurant updated successfully!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });

          // Navigate back to dashboard after successful update
          setTimeout(() => {
            this.router.navigate(['/owner/dashboard']);
          }, 1500);
        } else {
          // Create new restaurant
          response = await this.apiService
            .createRestaurant(submitData)
            .toPromise();

          this.snackBar.open('Restaurant created successfully!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });

          // Navigate to dashboard after successful creation
          setTimeout(() => {
            this.router.navigate(['/owner/dashboard']);
          }, 1500);
        }
      } catch (error: any) {
        console.error('Error saving restaurant:', error);
        const action = this.restaurant ? 'update' : 'create';
        // Specific error message for image upload issues
        let errorMessage =
          error.error?.error || `Failed to ${action} restaurant`;
        if (error.status === 413) {
          errorMessage =
            'Image file is too large. Please choose a smaller image.';
        } else if (
          error.status === 400 &&
          error.error?.error?.includes('image')
        ) {
          errorMessage =
            'Invalid image file. Please choose a valid image file.';
        } else if (
          this.selectedImageFile &&
          error.error?.error?.includes('AWS')
        ) {
          errorMessage = `Restaurant ${action}d successfully, but image upload failed. You can add an image later.`;
        }
        this.snackBar.open(
          error.error?.error || `Failed to ${action} restaurant`,
          'Close',
          { duration: 5000, panelClass: ['error-snackbar'] }
        );
      } finally {
        this.saving = false;
      }
    }
  }

  onCancel() {
    this.router.navigate(['/owner/dashboard']);
  }

  async deleteRestaurant() {
    if (!this.restaurant) return;

    const confirmed = confirm(
      'Are you sure you want to delete this restaurant? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      this.saving = true;
      await this.apiService.deleteRestaurant(this.restaurant._id).toPromise();

      this.snackBar.open('Restaurant deleted successfully!', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar'],
      });

      // Navigate to dashboard after successful deletion
      setTimeout(() => {
        this.router.navigate(['/owner/dashboard']);
      }, 1500);
    } catch (error: any) {
      console.error('Error deleting restaurant:', error);
      this.snackBar.open(
        error.error?.error || 'Failed to delete restaurant',
        'Close',
        { duration: 5000, panelClass: ['error-snackbar'] }
      );
    } finally {
      this.saving = false;
    }
  }

  getCurrentLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.restaurantForm.patchValue({
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          });
          this.snackBar.open('Location detected successfully!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          this.snackBar.open(
            'Could not detect location. Please enter manually.',
            'Close',
            {
              duration: 3000,
              panelClass: ['error-snackbar'],
            }
          );
        }
      );
    } else {
      this.snackBar.open(
        'Geolocation is not supported by this browser.',
        'Close',
        {
          duration: 3000,
          panelClass: ['error-snackbar'],
        }
      );
    }
  }

  copyHours(sourceDay: string) {
    const sourceHours = this.restaurantForm.get(
      `openingHours.${sourceDay}`
    )?.value;
    if (sourceHours && sourceHours.open && sourceHours.close) {
      this.daysOfWeek.forEach((day) => {
        if (day !== sourceDay) {
          this.restaurantForm
            .get(`openingHours.${day}`)
            ?.patchValue(sourceHours);
        }
      });
    }
  }

  clearHours(day: string) {
    this.restaurantForm.get(`openingHours.${day}`)?.patchValue({
      open: '',
      close: '',
    });
  }

  getErrorMessage(fieldName: string): string {
    const field = this.restaurantForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['pattern']) return 'Please enter a valid format';
      if (field.errors['min']) return 'Value too small';
      if (field.errors['max']) return 'Value too large';
    }
    return '';
  }

  formatDayName(day: string): string {
    return day.charAt(0).toUpperCase() + day.slice(1);
  }

  // View mode methods
  switchToEditMode() {
    this.viewMode = 'edit';
    this.isEditMode = true;
  }

  switchToViewMode() {
    this.viewMode = 'details';
    this.isEditMode = false;
  }

  getPriceRangeDisplay(priceRange: number): string {
    return '$'.repeat(priceRange);
  }

  getDaysOfWeek(): { key: string; label: string }[] {
    return [
      { key: 'monday', label: 'Monday' },
      { key: 'tuesday', label: 'Tuesday' },
      { key: 'wednesday', label: 'Wednesday' },
      { key: 'thursday', label: 'Thursday' },
      { key: 'friday', label: 'Friday' },
      { key: 'saturday', label: 'Saturday' },
      { key: 'sunday', label: 'Sunday' },
    ];
  }

  isRestaurantOpen(hours: any): boolean {
    if (!hours?.open || !hours?.close) return false;
    // Simple check - could be enhanced with current time logic
    return true;
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    try {
      // Convert 24-hour time to 12-hour format
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeStr; // Return original if parsing fails
    }
  }

  // Image upload methods
  onImageFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.handleSelectedFile(target.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onImageDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleSelectedFile(files[0]);
    }
  }

  private handleSelectedFile(file: File): void {
    this.imageUploadError = null;
    this.imageUploadSuccess = false;

    // Validate file type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      this.imageUploadError =
        'Please select a valid image file (JPG, PNG, GIF, or WebP).';
      return;
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      this.imageUploadError = 'File size must be less than 5MB.';
      return;
    }

    this.selectedImageFile = file;
    this.createImagePreview(file);

    // Show success feedback
    this.imageUploadSuccess = true;
    setTimeout(() => {
      this.imageUploadSuccess = false;
    }, 2000);
  }

  private createImagePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreviewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeSelectedImage(): void {
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
    this.imageUploadError = null;
    this.imageUploadSuccess = false;

    // Clear the file input
    const fileInput = document.getElementById(
      'imageFileInput'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById(
      'imageFileInput'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onKeyboardActivate(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.triggerFileInput();
    }
  }

  getRestaurantImageUrl(): string | null {
    return (this.restaurant as any)?.imageUrl || null;
  }
}
