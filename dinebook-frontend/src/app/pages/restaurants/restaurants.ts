import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { MatButtonModule } from "@angular/material/button"
import { MatIconModule } from "@angular/material/icon"
import { MatInputModule } from "@angular/material/input"
import { MatSelectModule } from "@angular/material/select"
import { MatFormFieldModule } from "@angular/material/form-field"
import { MatChipsModule } from "@angular/material/chips"
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator"
import { ReactiveFormsModule, FormBuilder, FormGroup } from "@angular/forms"
import { Router, RouterLink } from "@angular/router"
import { AuthService } from "../../services/auth.service"
import { BookingService } from "../../services/booking.service"
import { ReviewService } from "../../services/review.service"
import { Restaurant } from "../../models/booking"
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { ApiService } from '../../services/api.service';

interface RestaurantDisplay extends Restaurant {
  badge: string
  badgeClass: string
  stars: string[]
  priceRangeDisplay: string
  isFavorite?: boolean
}

@Component({
  selector: "app-restaurants",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    MatPaginatorModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: "./restaurants.html",
  styleUrl: "./restaurants.scss",
})
export class RestaurantsComponent implements OnInit {
  restaurants: RestaurantDisplay[] = []
  loading = false
  error: string | null = null

  // Filter and pagination properties
  searchForm: FormGroup
  currentPage = 0
  pageSize = 6  // Better page size for grid layout
  totalRestaurants = 0
  totalPages = 0

  // Filter options
  cuisineOptions = [
    'Italian', 'Indian', 'Chinese', 'Mexican', 'American',
    'Thai', 'Japanese', 'Mediterranean', 'French', 'Other'
  ]

  priceRangeOptions = [
    { value: '1', label: '$10-20', icon: '$' },
    { value: '2', label: '$20-40', icon: '$$' },
    { value: '3', label: '$40-60', icon: '$$$' },
    { value: '4', label: '$60+', icon: '$$$$' }
  ]

  // Active filters for display
  activeFilters: { location?: string, cuisine?: string, priceRange?: string } = {}

  constructor(
    public authService: AuthService,
    private router: Router,
    private bookingService: BookingService,
    private fb: FormBuilder,
    private apiService: ApiService,
    private reviewService: ReviewService

  ) {
    this.searchForm = this.fb.group({
      location: [''],
      cuisine: [''],
      priceRange: ['']
    })
  }

  userCoords: { latitude: number; longitude: number; radius: number } | null = null;

  ngOnInit() {
    this.getUserLocation();
    this.loadRestaurants()
    this.setupFormSubscriptions()
  }

  getUserLocation() {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          radius: 5 // Default radius in km
        };
        this.loadRestaurants();
      },
      (error) => {
        console.warn('Location access denied or unavailable', error);
      }
    );
  }

  setupFormSubscriptions() {
    // Subscribe to form changes with debounce for search
    this.searchForm.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 0 // Reset to first page when filters change
        this.loadRestaurants()
      })
  }

  loadRestaurants() {
    this.loading = true
    this.error = null

    const formValues = this.searchForm.value
    this.activeFilters = {
      ...(formValues.location && { location: formValues.location }),
      ...(formValues.cuisine && { cuisine: formValues.cuisine }),
      ...(formValues.priceRange && { priceRange: formValues.priceRange })
    }

    const params = {
      ...this.activeFilters,
      page: (this.currentPage + 1).toString(),
      limit: this.pageSize.toString(),
      latitude: this.userCoords?.latitude ? this.userCoords.latitude.toString().trim() : undefined,
      longitude: this.userCoords?.longitude ? this.userCoords.longitude.toString().trim() : undefined,
      radius: this.userCoords?.radius?.toString() || "5" // Default radius as string
    }

    // Remove undefined values
    Object.keys(params).forEach(key => params[key as keyof typeof params] === undefined && delete params[key as keyof typeof params]);

    this.bookingService.getRestaurants(params).subscribe({
      next: (response) => {
        const restaurants = response.restaurants.map(restaurant => this.transformRestaurant(restaurant))
        if (this.authService.isLoggedIn && this.authService.isCustomer()) {
          const statusRequests = restaurants.map(r =>
            this.apiService.checkFavoriteStatus(r._id).toPromise()
              .then(res => ({ id: r._id, isFavorite: res && typeof res.isFavorite === 'boolean' ? res.isFavorite : false }))
              .catch(() => ({ id: r._id, isFavorite: false }))
          )
          Promise.all(statusRequests).then(statuses => {
            const statusMap = Object.fromEntries(statuses.map(s => [s.id, s.isFavorite]))
            this.restaurants = restaurants.map(r => ({ ...r, isFavorite: statusMap[r._id] }))
            this.totalRestaurants = response.pagination.total
            this.totalPages = response.pagination.pages
            this.loading = false
          })
        } else {
          this.restaurants = restaurants.map(r => ({ ...r, isFavorite: false }))
          this.totalRestaurants = response.pagination.total
          this.totalPages = response.pagination.pages
          this.loading = false
        }
        this.restaurants = response.restaurants.map(restaurant => this.transformRestaurant(restaurant))
        this.totalRestaurants = response.pagination.total
        this.totalPages = response.pagination.pages
        this.loading = false

        // Load review data for each restaurant
        this.loadReviewsForRestaurants();
      },
      error: (error) => {
        console.error('Error loading restaurants:', error)

        // Check if it's a network error (API not available)
        if (error.message.includes('Failed to fetch') || error.status === 0) {
          this.error = 'Unable to connect to the server. Please check your connection and try again.'
        } else {
          this.error = error.message || 'Failed to load restaurants. Please try again later.'
        }

        this.loading = false
        this.restaurants = []
        this.totalRestaurants = 0
      }
    })
  }

  private transformRestaurant(restaurant: Restaurant): RestaurantDisplay {
    return {
      ...restaurant,
      badge: this.getBadge(restaurant),
      badgeClass: this.getBadgeClass(restaurant),
      stars: this.getStars(restaurant.rating || restaurant.averageRating || 0),
      priceRangeDisplay: this.formatPriceRange(restaurant.priceRange),
    }
  }

  private getBadge(restaurant: Restaurant): string {
    // Simple logic for badges - you can enhance this based on your business logic
    if (restaurant.averageRating && restaurant.averageRating >= 4.8) {
      return "Featured"
    } else if (restaurant.averageRating && restaurant.averageRating >= 4.5) {
      return "Popular"
    } else {
      return "New"
    }
  }

  private getBadgeClass(restaurant: Restaurant): string {
    const badge = this.getBadge(restaurant)
    return badge.toLowerCase()
  }

  private getStars(rating: number): string[] {
    const stars: string[] = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < fullStars; i++) {
      stars.push("star")
    }

    if (hasHalfStar) {
      stars.push("star_half")
    }

    // Fill remaining with empty stars up to 5
    while (stars.length < 5) {
      stars.push("star_border")
    }

    return stars
  }

  private formatPriceRange(priceRange: number): string {
    const priceRanges = {
      1: "10-20 $",
      2: "20-40 $",
      3: "40-60 $",
      4: "60+ $"
    }
    return priceRanges[priceRange as keyof typeof priceRanges] || "Price varies"
  }

  bookTable() {
    if (this.authService.isLoggedIn) {
      this.router.navigate(["/book-table"])
    } else {
      this.router.navigate(["/sign-in"])
    }
  }

  bookTableForRestaurant(restaurant: RestaurantDisplay) {
    if (this.authService.isLoggedIn) {
      this.router.navigate(["/book-table"], {
        queryParams: {
          restaurantId: restaurant._id,
          restaurantName: restaurant.name,
          cuisine: restaurant.cuisine,
          location: restaurant.location
        }
      })
    } else {
      this.router.navigate(["/sign-in"])
    }
  }

  viewRestaurantDetails(restaurant: RestaurantDisplay) {
    this.router.navigate(['/restaurants', restaurant._id]);
  }

  retry() {
    this.loadRestaurants()
  }

  onToggleFavorite(restaurant: RestaurantDisplay, event: Event) {
    event.stopPropagation()
    if (!this.authService.isLoggedIn || !this.authService.isCustomer()) return
    this.apiService.toggleFavorite(restaurant._id).subscribe({
      next: (res) => {
        if (res && typeof res.isFavorite === 'boolean') {
          restaurant.isFavorite = res.isFavorite
        }
      },
      error: () => {
      }
    })
  }

  // Pagination methods
  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex
    this.pageSize = event.pageSize
    this.loadRestaurants()
  }

  // Filter methods
  clearFilters() {
    this.searchForm.reset()
    this.activeFilters = {}
    this.currentPage = 0
    this.loadRestaurants()
  }

  removeFilter(filterType: string) {
    this.searchForm.patchValue({ [filterType]: '' })
  }

  getActiveFilterKeys(): string[] {
    return Object.keys(this.activeFilters)
  }

  getFilterDisplayValue(key: string): string {
    const value = this.activeFilters[key as keyof typeof this.activeFilters]
    if (!value) return ''

    switch (key) {
      case 'priceRange':
        const priceOption = this.priceRangeOptions.find(option => option.value === value)
        return priceOption ? priceOption.label : value
      case 'location':
        return value
      case 'cuisine':
        return value
      default:
        return value
    }
  }

  private loadReviewsForRestaurants(): void {
    this.restaurants.forEach((restaurant, index) => {
      if (restaurant._id) {
        this.reviewService.getReviewsByRestaurant(restaurant._id).subscribe({
          next: (response) => {
            const reviews = response.reviews || [];
            const reviewCount = reviews.length;
            const averageRating = reviewCount > 0
              ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviewCount
              : 0;

            // Update the restaurant with review data
            this.restaurants[index] = {
              ...this.restaurants[index],
              reviews: reviewCount,
              averageRating: averageRating,
              rating: averageRating,
              stars: this.getStars(averageRating)
            };
          },
          error: (error) => {
            console.error(`Error loading reviews for restaurant ${restaurant._id}:`, error);
            // Set default values on error
            this.restaurants[index] = {
              ...this.restaurants[index],
              reviews: 0,
              averageRating: 0,
              rating: 0,
              stars: this.getStars(0)
            };
          }
        });
      }
    });
  }
}
