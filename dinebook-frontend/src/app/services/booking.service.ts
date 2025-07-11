import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import {
  BookingAvailabilityQuery,
  CreateBookingRequest,
  BookingResponse,
  AvailabilityResponse,
  Restaurant,
  BookingFilter,
  BookingStats
} from '../models/booking';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiUrl = 'http://localhost:3000/api';
  private bookingsSubject = new BehaviorSubject<BookingResponse[]>([]);
  public bookings$ = this.bookingsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  private handleError(error: any): Observable<never> {
    console.error('BookingService Error:', error);
    let errorMessage = 'An unexpected error occurred';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }

  getRestaurants(params?: {
    location?: string;
    cuisine?: string;
    priceRange?: string;
    page?: string;
    limit?: string;
  }): Observable<{ restaurants: Restaurant[], pagination: any, filters: any }> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.location) httpParams = httpParams.set('location', params.location);
      if (params.cuisine) httpParams = httpParams.set('cuisine', params.cuisine);
      if (params.priceRange) httpParams = httpParams.set('priceRange', params.priceRange);
      if (params.page) httpParams = httpParams.set('page', params.page);
      if (params.limit) httpParams = httpParams.set('limit', params.limit);
    }

    return this.http.get<any>(`${this.apiUrl}/restaurants`, { params: httpParams })
      .pipe(
        map((response: any) => {
          console.log('API Response:', response);

          let restaurants: Restaurant[] = [];
          if (Array.isArray(response)) {
            restaurants = response;
          } else if (response.restaurants && Array.isArray(response.restaurants)) {
            restaurants = response.restaurants;
          } else if (response.data && Array.isArray(response.data)) {
            restaurants = response.data;
          } else {
            console.error('Invalid response format:', response);
            throw new Error('Invalid response format from server');
          }

          const transformedRestaurants = restaurants.map(restaurant => ({
            ...restaurant,
            id: restaurant._id,
            rating: restaurant.averageRating || 0,
            timing: this.formatOpeningHours(restaurant.openingHours),
            reviews: 0
          }));

          return {
            restaurants: transformedRestaurants,
            pagination: response.pagination || { page: 1, limit: 10, total: restaurants.length, pages: 1 },
            filters: response.filters || {}
          };
        }),
        catchError(this.handleError)
      );
  }

  private formatOpeningHours(openingHours: Restaurant['openingHours']): string {
    if (!openingHours) {
      return 'Hours vary';
    }

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = daysOfWeek[new Date().getDay()] as keyof typeof openingHours;
    const todayHours = openingHours[today];

    if (todayHours?.open && todayHours?.close) {
      return `Open until ${todayHours.close}`;
    }

    return 'Hours vary';
  }

  checkAvailability(query: BookingAvailabilityQuery): Observable<AvailabilityResponse> {
    this.loadingSubject.next(true);

    let params = new HttpParams()
      .set('restaurantId', query.restaurantId)
      .set('date', query.date);

    return this.http.get<AvailabilityResponse>(`${this.apiUrl}/bookings/availability`, {
      params,
      headers: this.getHeaders()
    }).pipe(
      tap(() => this.loadingSubject.next(false)),
      catchError((error) => {
        this.loadingSubject.next(false);
        return this.handleError(error);
      })
    );
  }


  createBooking(booking: CreateBookingRequest): Observable<BookingResponse> {
    this.loadingSubject.next(true);

    return this.http.post<BookingResponse>(`${this.apiUrl}/bookings`, booking, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => {
        this.loadingSubject.next(false);
        this.refreshUserBookings();
      }),
      catchError((error) => {
        this.loadingSubject.next(false);
        return this.handleError(error);
      })
    );
  }


  getUserBookings(filter?: BookingFilter): Observable<BookingResponse[]> {
    this.loadingSubject.next(true);

    let params = new HttpParams();
    if (filter?.status && filter.status !== 'all') {
      params = params.set('status', filter.status);
    }
    if (filter?.dateFrom) {
      params = params.set('dateFrom', filter.dateFrom);
    }
    if (filter?.dateTo) {
      params = params.set('dateTo', filter.dateTo);
    }

    return this.http.get<BookingResponse[]>(`${this.apiUrl}/bookings/my`, {
      params,
      headers: this.getHeaders()
    }).pipe(
      tap((bookings) => {
        this.loadingSubject.next(false);
        this.bookingsSubject.next(bookings);
      }),
      catchError((error) => {
        this.loadingSubject.next(false);
        return this.handleError(error);
      })
    );
  }


  getBooking(bookingId: string): Observable<BookingResponse> {
    return this.http.get<BookingResponse>(`${this.apiUrl}/bookings/${bookingId}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }


  cancelBooking(bookingId: string): Observable<void> {
    this.loadingSubject.next(true);

    return this.http.delete<void>(`${this.apiUrl}/bookings/${bookingId}`, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => {
        this.loadingSubject.next(false);
        this.refreshUserBookings();
      }),
      catchError((error) => {
        this.loadingSubject.next(false);
        return this.handleError(error);
      })
    );
  }


  getBookingStats(): Observable<BookingStats> {
    return this.http.get<BookingStats>(`${this.apiUrl}/bookings/stats`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }


  refreshUserBookings(): void {
    this.getUserBookings().subscribe({
      next: () => {

      },
      error: (error) => {
        console.error('Failed to refresh user bookings:', error);
      }
    });
  }


  isBookingCancellable(booking: BookingResponse): boolean {
    const bookingDateTime = new Date(`${booking.date}T${booking.time}`);
    const now = new Date();
    const timeDifference = bookingDateTime.getTime() - now.getTime();
    const hoursDifference = timeDifference / (1000 * 3600);

    return hoursDifference > 2 && booking.status === 'confirmed';
  }

  isBookingUpcoming(booking: BookingResponse): boolean {
    const bookingDateTime = new Date(`${booking.date}T${booking.time}`);
    const now = new Date();

    return bookingDateTime > now && booking.status === 'confirmed';
  }

  formatBookingDateTime(booking: BookingResponse): string {
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