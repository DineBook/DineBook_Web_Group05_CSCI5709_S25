import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { BookingService } from '../../services/booking.service';
import { Restaurant, AvailabilityResponse, TimeSlot, CreateBookingRequest } from '../../models/booking';

@Component({
  selector: 'app-book-table',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './book-table.html',
  styleUrls: ['./book-table.scss']
})
export class BookTableComponent implements OnInit, OnDestroy {
  bookingForm: FormGroup;
  restaurants: Restaurant[] = [];
  availability: AvailabilityResponse | null = null;
  selectedTimeSlot: TimeSlot | null = null;
  isLoading = false;
  isSubmitting = false;
  minDate = new Date();
  maxDate = new Date();

  // Store preselected restaurant info from navigation
  preselectedRestaurant: {
    id: string;
    name: string;
    cuisine?: string;
    location?: string;
    capacity?: number;
    priceRange?: number;
    source?: string;
  } | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.maxDate.setMonth(this.maxDate.getMonth() + 3);
    this.bookingForm = this.fb.group({
      restaurantId: ['', [Validators.required]],
      date: ['', [Validators.required]],
      time: ['', [Validators.required]],
      guests: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
      specialRequests: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    this.loadRestaurants();
    this.setupFormWatchers();
    this.handleRouteParams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRestaurants(): void {
    this.setLoading(true);
    this.bookingService.getRestaurants()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.restaurants = response.restaurants;
          this.setLoading(false);
        },
        error: () => {
          this.showError('Failed to load restaurants. Please try again.');
          this.setLoading(false);
        }
      });
  }

  private setupFormWatchers(): void {
    this.bookingForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged((prev, curr) =>
          prev.restaurantId === curr.restaurantId && prev.date === curr.date
        )
      )
      .subscribe(() => this.checkAvailability());
  }

  private handleRouteParams(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['restaurantId']) {
          this.bookingForm.patchValue({ restaurantId: params['restaurantId'] });
        }
      });

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(queryParams => {
        // First try to use the restaurantId directly if available
        if (queryParams['restaurantId']) {
          this.bookingForm.patchValue({ restaurantId: queryParams['restaurantId'] });

          // Store preselected restaurant information
          this.preselectedRestaurant = {
            id: queryParams['restaurantId'],
            name: queryParams['restaurantName'] || 'Selected Restaurant',
            cuisine: queryParams['cuisine'],
            location: queryParams['location'],
            capacity: queryParams['capacity'] ? parseInt(queryParams['capacity']) : undefined,
            priceRange: queryParams['priceRange'] ? parseInt(queryParams['priceRange']) : undefined,
            source: queryParams['source'] || 'unknown'
          };

          // Adjust guest limit based on restaurant capacity if available
          if (this.preselectedRestaurant.capacity) {
            const maxGuests = Math.min(this.preselectedRestaurant.capacity, 20);
            this.bookingForm.get('guests')?.setValidators([
              Validators.required,
              Validators.min(1),
              Validators.max(maxGuests)
            ]);
            this.bookingForm.get('guests')?.updateValueAndValidity();
          }

          // Show a success message indicating the restaurant has been preselected
          let message = `Restaurant "${this.preselectedRestaurant.name}" has been preselected for your booking`;
          if (this.preselectedRestaurant.cuisine) {
            message += ` (${this.preselectedRestaurant.cuisine} cuisine)`;
          }

          this.snackBar.open(message, 'Close', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
        } else if (queryParams['restaurantName']) {
          // Fallback to finding restaurant by name
          const matchingRestaurant = this.restaurants.find(r =>
            r.name === queryParams['restaurantName']
          );
          if (matchingRestaurant) {
            this.bookingForm.patchValue({ restaurantId: matchingRestaurant._id || matchingRestaurant.id });
          }
        }
      });
  }

  private checkAvailability(): void {
    const restaurantId = this.bookingForm.get('restaurantId')?.value;
    const date = this.bookingForm.get('date')?.value;

    if (!restaurantId || !date) {
      this.resetAvailability();
      return;
    }

    this.setLoading(true);
    this.bookingService.checkAvailability({ restaurantId, date: this.formatDate(date) })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (availability) => {
          this.availability = availability;
          this.setLoading(false);
          this.resetTimeSelection();
        },
        error: () => {
          this.showError('Failed to check availability. Please try again.');
          this.resetAvailability();
          this.setLoading(false);
        }
      });
  }

  selectTimeSlot(slot: TimeSlot): void {
    if (!slot.available) return;

    this.selectedTimeSlot = slot;
    this.bookingForm.get('time')?.setValue(slot.time);
  }

  onSubmit(): void {
    if (this.bookingForm.invalid || !this.selectedTimeSlot || this.isSubmitting) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    this.bookingForm.disable();

    const formValue = this.bookingForm.value;
    const bookingRequest: CreateBookingRequest = {
      restaurantId: formValue.restaurantId,
      date: this.formatDate(formValue.date),
      time: formValue.time,
      guests: formValue.guests,
      specialRequests: formValue.specialRequests || undefined
    };

    this.bookingService.createBooking(bookingRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (booking) => {
          this.showSuccess('Booking confirmed! Redirecting to your bookings...');
          setTimeout(() => {
            this.router.navigate(['/my-bookings'], {
              queryParams: {
                newBooking: booking.id,
                message: 'Your booking has been confirmed!'
              }
            });
          }, 1000);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.bookingForm.enable();
          this.checkAvailability();

          const errorMessage = error.message?.includes('Not enough capacity') || error.message?.includes('fully booked')
            ? 'Sorry, this time slot was just booked by someone else. Please select another time.'
            : error.message || 'Failed to create booking. Please try again.';

          this.showError(errorMessage);
        }
      });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.bookingForm.controls).forEach(key => {
      this.bookingForm.get(key)?.markAsTouched();
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private showSuccess(message: string): void {
    this.showMessage(message, 'success-snackbar');
  }

  private showError(message: string): void {
    this.showMessage(message, 'error-snackbar');
  }

  // Getters for template
  get selectedRestaurant(): Restaurant | undefined {
    const restaurantId = this.bookingForm.get('restaurantId')?.value;
    return this.restaurants.find(r => r.id === restaurantId);
  }

  get availableSlots(): TimeSlot[] {
    return this.availability?.availableSlots?.filter(slot => slot.available) || [];
  }

  get isFormValid(): boolean {
    return this.bookingForm.valid && !!this.selectedTimeSlot;
  }

  // Date filter to disable past dates
  dateFilter = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  // Format price range from number to display string
  formatPriceRange(priceRange: number): string {
    const ranges = ['', '$', '$$', '$$$', '$$$$'];
    return ranges[priceRange] || '$';
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
  }

  private showMessage(message: string, panelClass: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: [panelClass]
    });
  }

  private resetAvailability(): void {
    this.availability = null;
    this.resetTimeSelection();
  }

  private resetTimeSelection(): void {
    this.selectedTimeSlot = null;
    this.bookingForm.get('time')?.setValue('');
  }

  // Clear preselected restaurant and show dropdown
  clearPreselection(): void {
    this.preselectedRestaurant = null;
    this.bookingForm.patchValue({ restaurantId: '' });
    this.resetAvailability();

    // Reset guest validation to default
    this.bookingForm.get('guests')?.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(20)
    ]);
    this.bookingForm.get('guests')?.updateValueAndValidity();
  }
} 