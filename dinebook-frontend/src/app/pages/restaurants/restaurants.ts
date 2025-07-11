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
import { Restaurant } from "../../models/booking"
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'

interface RestaurantDisplay extends Restaurant {
  badge: string
  badgeClass: string
  stars: string[]
  priceRangeDisplay: string
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
  pageSize = 2  // Smaller page size for testing with current data
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
    private authService: AuthService,
    private router: Router,
    private bookingService: BookingService,
    private fb: FormBuilder
  ) {
    this.searchForm = this.fb.group({
      location: [''],
      cuisine: [''],
      priceRange: ['']
    })
  }

  ngOnInit() {
    this.loadRestaurants()
    this.setupFormSubscriptions()
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
      limit: this.pageSize.toString()
    }

    this.bookingService.getRestaurants(params).subscribe({
      next: (response) => {
        this.restaurants = response.restaurants.map(restaurant => this.transformRestaurant(restaurant))
        this.totalRestaurants = response.pagination.total
        this.totalPages = response.pagination.pages
        this.loading = false
        console.log('Loaded restaurants:', this.restaurants)
        console.log('Pagination:', response.pagination)
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
}
