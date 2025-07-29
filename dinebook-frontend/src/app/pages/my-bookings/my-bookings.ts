import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { BookingService } from '../../services/booking.service';
import { BookingResponse, BookingFilter, BookingStats } from '../../models/booking';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './my-bookings.html',
  styleUrls: ['./my-bookings.scss']
})
export class MyBookingsComponent implements OnInit, OnDestroy {
  allBookings: BookingResponse[] = [];
  filteredBookings: BookingResponse[] = [];
  bookingStats: BookingStats | null = null;
  isLoading = true;
  selectedTab = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private bookingService: BookingService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadBookings();
    this.loadBookingStats();
    this.checkForNewBookingMessage();
  }

  private checkForNewBookingMessage(): void {
    this.route.queryParams.subscribe(params => {
      if (params['message'] && params['newBooking']) {
        this.showSuccess(params['message']);
        // Clear the query params to avoid showing the message again
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBookings(): void {
    this.isLoading = true;
    this.bookingService.getUserBookings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bookings) => {
          this.allBookings = bookings;
          this.filterBookings();
          this.isLoading = false;
        },
        error: (error) => {
          this.showError('Failed to load bookings. Please try again.');
          this.isLoading = false;
        }
      });
  }

  private loadBookingStats(): void {
    this.bookingService.getBookingStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.bookingStats = stats;
        },
        error: (error) => {
          console.error('Failed to load booking stats:', error);
        }
      });
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
    this.filterBookings();
  }

  private filterBookings(): void {
    const now = new Date();

    switch (this.selectedTab) {
      case 0: // All
        this.filteredBookings = this.allBookings;
        break;
      case 1: // Upcoming
        this.filteredBookings = this.allBookings.filter(booking => {
          const bookingDate = new Date(`${booking.date}T${booking.time}`);
          return bookingDate > now && booking.status === 'confirmed';
        });
        break;
      case 2: // Past
        this.filteredBookings = this.allBookings.filter(booking => {
          const bookingDate = new Date(`${booking.date}T${booking.time}`);
          return bookingDate <= now || booking.status === 'completed';
        });
        break;
      case 3: // Cancelled
        this.filteredBookings = this.allBookings.filter(booking =>
          booking.status === 'cancelled'
        );
        break;
      default:
        this.filteredBookings = this.allBookings;
    }
  }

  cancelBooking(booking: BookingResponse): void {
    // Open confirmation dialog
    const dialogRef = this.dialog.open(CancelBookingDialogComponent, {
      width: '400px',
      data: { booking }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.performCancelBooking(booking.id);
        }
      });
  }

  private performCancelBooking(bookingId: string): void {
    this.bookingService.cancelBooking(bookingId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Booking cancelled successfully.');
          this.loadBookings(); // Refresh bookings
          this.loadBookingStats(); // Refresh stats
        },
        error: (error) => {
          this.showError(error.message || 'Failed to cancel booking. Please try again.');
        }
      });
  }

  bookNewTable(): void {
    this.router.navigate(['/book-table']);
  }

  viewBookingDetails(booking: BookingResponse): void {
    this.router.navigate(['/booking-confirmation', booking.id]);
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Utility getters
  formatBookingDateTime(booking: BookingResponse): string {
    return this.bookingService.formatBookingDateTime(booking);
  }

  isBookingCancellable(booking: BookingResponse): boolean {
    return this.bookingService.isBookingCancellable(booking);
  }

  isBookingUpcoming(booking: BookingResponse): boolean {
    return this.bookingService.isBookingUpcoming(booking);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'status-confirmed';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      case 'completed':
        return 'status-completed';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'check_circle';
      case 'pending':
        return 'schedule';
      case 'cancelled':
        return 'cancel';
      case 'completed':
        return 'task_alt';
      default:
        return 'help_outline';
    }
  }

  getEmptyStateTitle(): string {
    switch (this.selectedTab) {
      case 0:
        return 'No Bookings Yet';
      case 1:
        return 'No Upcoming Reservations';
      case 2:
        return 'No Past Reservations';
      case 3:
        return 'No Cancelled Reservations';
      default:
        return 'No Bookings Found';
    }
  }

  getEmptyStateDescription(): string {
    switch (this.selectedTab) {
      case 0:
        return 'Start your culinary journey by booking your first dining experience.';
      case 1:
        return 'You don\'t have any upcoming reservations. Ready to plan your next meal?';
      case 2:
        return 'Your dining history will appear here once you complete your reservations.';
      case 3:
        return 'No cancelled reservations found. Great job keeping your commitments!';
      default:
        return 'No reservations found for this category.';
    }
  }


}

// Cancel Booking Dialog Component
@Component({
  selector: 'app-cancel-booking-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="cancel-dialog">
      <div class="dialog-header">
        <h2>Cancel Booking</h2>
      </div>
      <div class="dialog-content">
        <p>Are you sure you want to cancel your booking at <strong>{{ data.booking.restaurantName }}</strong>?</p>
        <p class="booking-details">
          {{ formatDateTime(data.booking) }}
        </p>
        <p class="warning-text">This action cannot be undone.</p>
      </div>
      <div class="dialog-actions">
        <button mat-button mat-dialog-close class="cancel-btn">Keep Booking</button>
        <button mat-raised-button color="warn" [mat-dialog-close]="true" class="confirm-btn">
          Cancel Booking
        </button>
      </div>
    </div>
  `,
  styles: [`
    .cancel-dialog {
      padding: 1rem;
    }
    
    .dialog-header {
      margin-bottom: 1.5rem;
      
      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--gray-900);
      }
    }
    
    .dialog-content {
      margin-bottom: 2rem;
      
      p {
        margin: 0 0 1rem;
        color: var(--gray-700);
        line-height: 1.5;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
      
      .booking-details {
        background: var(--gray-50);
        padding: 0.75rem;
        border-radius: var(--border-radius-md);
        font-weight: 500;
      }
      
      .warning-text {
        color: var(--warning-600);
        font-weight: 500;
        font-size: 0.875rem;
      }
    }
    
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      
      .cancel-btn {
        color: var(--gray-600);
      }
      
      .confirm-btn {
        display: flex;
        align-items: center;
      }
    }
  `]
})
export class CancelBookingDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { booking: BookingResponse }) { }

  formatDateTime(booking: BookingResponse): string {
    const date = new Date(`${booking.date}T${booking.time}`);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}

import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog'; 