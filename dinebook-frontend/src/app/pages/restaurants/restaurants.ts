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
import { RestaurantMapComponent } from '../../components/restaurant-map/restaurant-map.component';

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
    RouterLink,
    RestaurantMapComponent
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
        // First, load restaurants with basic data and set loading to false
        this.restaurants = response.restaurants.map(restaurant =>
          ({ ...this.transformRestaurant(restaurant), isFavorite: false })
        )
        this.totalRestaurants = response.pagination.total
        this.totalPages = response.pagination.pages
        this.loading = false

        // Load review data for each restaurant
        this.loadReviewsForRestaurants();

        // Then asynchronously load favorite status if user is logged in as customer
        if (this.authService.isLoggedIn && this.authService.isCustomer()) {
          this.loadFavoriteStatus();
        }
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
      this.router.navigate(["/book-table"]).then(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else {
      this.router.navigate(["/sign-in"]).then(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
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
      }).then(() => {
        // Ensure page scrolls to top after navigation
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else {
      this.router.navigate(["/sign-in"]).then(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  viewRestaurantDetails(restaurant: RestaurantDisplay) {
    this.router.navigate(['/restaurants', restaurant._id]).then(() => {
      // Ensure page scrolls to top after navigation
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  retry() {
    this.loadRestaurants()
  }

  onToggleFavorite(restaurant: RestaurantDisplay, event: Event) {
    event.stopPropagation()
    if (!this.authService.isLoggedIn || !this.authService.isCustomer()) return

    // Optimistically update the UI
    const previousState = restaurant.isFavorite
    restaurant.isFavorite = !restaurant.isFavorite

    this.apiService.toggleFavorite(restaurant._id).subscribe({
      next: (res: any) => {
        // Confirm the state based on server response
        if (res && typeof res.isFavorited === 'boolean') {
          restaurant.isFavorite = res.isFavorited
        } else {
          // If response doesn't have the expected format, keep the optimistic update
          console.warn('Unexpected response format from toggleFavorite API:', res);
        }
      },
      error: (error) => {
        // Revert the optimistic update on error
        restaurant.isFavorite = previousState
        console.error('Error toggling favorite:', error)
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

            // Update the restaurant with review data while preserving favorite status
            this.restaurants[index] = {
              ...this.restaurants[index],
              reviews: reviewCount,
              averageRating: averageRating,
              rating: averageRating,
              stars: this.getStars(averageRating)
              // isFavorite is preserved from the existing object
            };
          },
          error: (error) => {
            console.error(`Error loading reviews for restaurant ${restaurant._id}:`, error);
            // Set default values on error while preserving favorite status
            this.restaurants[index] = {
              ...this.restaurants[index],
              reviews: 0,
              averageRating: 0,
              rating: 0,
              stars: this.getStars(0)
              // isFavorite is preserved from the existing object
            };
          }
        });
      }
    });
  }

  private loadFavoriteStatus(): void {
    console.log('Loading favorite status for restaurants:', this.restaurants.length);
    // Load favorite status asynchronously for each restaurant
    this.restaurants.forEach((restaurant, index) => {
      console.log(`Checking favorite status for restaurant: ${restaurant.name} (${restaurant._id})`);
      this.apiService.checkFavoriteStatus(restaurant._id).subscribe({
        next: (res: any) => {
          console.log(`Favorite status response for ${restaurant.name}:`, res);
          if (res && typeof res.isFavorited === 'boolean') {
            // Update only the favorite status without affecting other properties
            this.restaurants[index] = {
              ...this.restaurants[index],
              isFavorite: res.isFavorited
            };
            console.log(`Updated restaurant ${restaurant.name} isFavorite to:`, res.isFavorited);
          } else {
            console.warn(`Invalid response format for ${restaurant.name}:`, res);
          }
        },
        error: (error) => {
          console.error(`Error checking favorite status for restaurant ${restaurant._id}:`, error);
          // Keep isFavorite as false (default) on error
        }
      });
    });
  }
   onImageError(event: any): void {
    // Set fallback image when restaurant image fails to load
    event.target.src =
      'https://cdn.pixabay.com/photo/2019/09/12/15/21/resort-4471852_1280.jpg';
  }
}

