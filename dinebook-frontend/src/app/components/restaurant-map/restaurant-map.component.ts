import { Component, OnInit, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

// Declare Google Maps types
declare global {
  interface Window {
    google: any;
    googleMapsLoaded: boolean;
  }
  const google: any;
}

interface Restaurant {
  _id: string;
  id?: string; // For compatibility
  name: string;
  cuisine: string;
  location: string;
  coordinates?: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  address?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  } | string;
  priceRange: number | string; // Backend uses number (1-4)
  averageRating?: number;
  rating?: number;
  description?: string;
  phoneNumber?: string;
  email?: string;
  capacity?: number;
  isDineBookRestaurant?: boolean;
}

interface RestaurantType {
  name: string;
  count: number;
  color: string;
}

@Component({
  selector: 'app-restaurant-map',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="map-container" [class.fullscreen]="isFullscreen">
      <div class="map-controls-top">
        <div class="map-controls-left">
          <button mat-raised-button class="location-btn" (click)="getUserLocation()" title="Find your current location">
            <mat-icon>location_searching</mat-icon>
            <span class="btn-text">Find Me</span>
          </button>
        </div>

        <div class="map-controls-right">
          <div class="map-legend">
            <div class="legend-item">
              <div class="legend-pointer your-location"></div>
              <span>Your Location</span>
            </div>
            <div class="legend-item">
              <div class="legend-pointer dinebook-restaurants"></div>
              <span>DineBook</span>
            </div>
            <div class="legend-item">
              <div class="legend-pointer nearby-restaurants"></div>
              <span>Nearby Restaurants</span>
            </div>
          </div>
        </div>
      </div>

      <div class="map-controls-bottom" *ngIf="mapLoaded">
        <div class="restaurant-counter">
          <mat-icon>restaurant</mat-icon>
          <span>{{ (restaurants.length || 0) }} DineBook | {{ (realWorldMarkers.length || 0) }} Nearby Restaurants</span>
        </div>
        <button mat-raised-button 
                class="view-all-btn"
                (click)="viewAllRestaurants()"
                title="View all restaurants in list format">
          <mat-icon>list</mat-icon>
          <span>View All Restaurants</span>
        </button>
      </div>

      <div #mapElement class="google-map" [class.loading]="!mapLoaded">
        <div *ngIf="!mapLoaded" class="loading-overlay">
          <mat-icon class="loading-icon">location_on</mat-icon>
          <div>Loading map...</div>
          <div class="loading-spinner"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .map-container {
      width: 100%;
      height: 600px;
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.15);
      background: #ffffff;
      border: 2px solid #e9ecef;
      transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .map-container.fullscreen {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 10000 !important;
      border-radius: 0 !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      transform: none !important;
    }
    
    .map-controls-top {
      position: absolute;
      top: 16px;
      left: 16px;
      right: 16px;
      z-index: 1001;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: nowrap;
      pointer-events: none;
    }

    .map-controls-left {
      display: flex;
      align-items: center;
      gap: 12px;
      pointer-events: auto;
      justify-content: flex-start;
      margin-left: 190px;
    }

    .map-controls-bottom {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .restaurant-counter {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      padding: 12px 18px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #2d3748;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border: 1px solid rgba(255,255,255,0.8);
      font-size: 14px;
    }

    .restaurant-counter mat-icon {
      color: #28a745;
      font-size: 20px;
    }
    
    .view-all-btn {
      background: #f8f9fa;
      color: #495057;
      border: 2px solid #007bff;
      padding: 12px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
      min-height: 44px;
      font-size: 14px;
    }
    
    .view-all-btn:hover {
      background: #e3f2fd;
      border-color: #0056b3;
      color: #0056b3;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    
    .location-btn {
      background: #f8f9fa;
      color: #495057;
      border: 2px solid #28a745;
      border-radius: 6px;
      font-weight: 500;
      padding: 8px 12px;
      transition: all 0.2s ease;
      min-width: 100px;
      height: 38px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 4px;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      pointer-events: auto;
      z-index: 1002;
      position: relative;
    }
    
    .location-btn:hover {
      background: #28a745;
      color: white;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(40, 167, 69, 0.2);
    }
    
    .toggle-btn {
      background: #f8f9fa;
      color: #495057;
      border: 2px solid #6c757d;
      border-radius: 8px;
      min-width: 120px;
      height: 42px;
      font-weight: 500;
      transition: all 0.2s ease;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: center;
      padding: 10px 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      pointer-events: auto;
      z-index: 1002;
      position: relative;
    }
    
    .toggle-btn:hover {
      background: #6c757d;
      color: white;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(108, 117, 125, 0.2);
    }

    .view-all-btn {
      background: #f8f9fa;
      color: #495057;
      border: 2px solid #007bff;
      padding: 12px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      transition: all 0.2s ease;
      min-height: 42px;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .view-all-btn:hover {
      background: #e3f2fd;
      border-color: #0056b3;
      color: #0056b3;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .map-controls-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: nowrap;
      min-width: fit-content;
      flex-shrink: 0;
      justify-content: flex-end;
      pointer-events: auto;
      margin-right: 50px;
    }

    .btn-text {
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
    }

    /* Responsive adjustments for button text */
    @media (max-width: 1024px) {
      .btn-text {
        display: none;
      }
      
      .location-btn, .refresh-btn, .toggle-btn {
        min-width: 44px;
        padding: 10px;
      }
    }

    .map-legend {
      background: rgba(255, 255, 255, 0.95);
      padding: 6px 10px;
      border-radius: 6px;
      display: flex;
      flex-direction: row;
      gap: 8px;
      font-size: 10px;
      font-weight: 500;
      color: #2d3748;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 1px solid rgba(255,255,255,0.8);
      min-width: auto;
      max-width: none;
      flex-shrink: 0;
      pointer-events: auto;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }

    .legend-pointer {
      width: 16px;
      height: 16px;
      background: currentColor;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      position: relative;
      flex-shrink: 0;
      margin: 2px 6px 2px 2px;
      display: inline-block;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .legend-pointer::after {
      content: '';
      position: absolute;
      top: 4px;
      left: 4px;
      width: 6px;
      height: 6px;
      background: white;
      border-radius: 50%;
      transform: rotate(45deg);
    }

    .legend-pointer.your-location {
      color: #dc3545;
    }

    .legend-pointer.dinebook-restaurants {
      color: #28a745;
    }

    .legend-pointer.nearby-restaurants {
      color: #ff6b35;
    }

    .google-map {
      width: 100%;
      height: 100%;
      border-radius: 16px;
      position: relative;
    }

    .google-map.loading {
      background: #f8f9fa;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #e9ecef;
    }

    .loading-overlay {
      color: #495057;
      text-align: center;
      font-size: 18px;
      font-weight: 500;
    }

    .loading-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #007bff;
      animation: pulse 2s infinite;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e9ecef;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 24px auto 0;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }
    
    @keyframes userLocationPulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
      100% { transform: scale(1); opacity: 1; }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .map-container {
        height: 500px;
        border-radius: 12px;
      }

      .map-controls-top {
        top: 12px;
        left: 12px;
        right: 12px;
        gap: 8px;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }

      .map-controls-left {
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
        order: 1;
        margin-left: 0;
      }

      .map-controls-right {
        gap: 6px;
        flex-wrap: nowrap;
        justify-content: flex-end;
        align-items: center;
        order: 2;
        margin-right: 0;
      }

      .map-legend {
        padding: 4px 8px;
        gap: 6px;
        font-size: 9px;
        flex-direction: row;
        justify-content: space-around;
        min-width: auto;
        max-width: none;
        flex: 1;
      }

      .legend-item {
        font-size: 11px;
        gap: 6px;
        flex: 1;
        justify-content: center;
      }

      .legend-pointer {
        width: 8px;
        height: 8px;
      }

      .location-btn, .toggle-btn {
        padding: 8px 12px;
        min-width: 90px;
        height: 40px;
        font-size: 12px;
        flex: 1 1 auto;
        margin: 2px;
      }

      .btn-text {
        font-size: 11px;
        display: inline;
      }

      .restaurant-counter {
        font-size: 12px;
        padding: 10px 14px;
        max-width: 90%;
        text-align: center;
      }
      
      .view-all-btn {
        font-size: 12px;
        padding: 10px 16px;
        max-width: 90%;
        min-height: 40px;
      }

      .map-controls-bottom {
        bottom: 12px;
        left: 12px;
        right: 12px;
        transform: none;
        display: flex;
        justify-content: center;
        flex-direction: column;
        gap: 8px;
        align-items: center;
      }
    }

    @media (max-width: 480px) {
      .map-container {
        height: 450px;
      }
      
      .map-controls-top {
        left: 8px;
        right: 8px;
        top: 8px;
        gap: 8px;
      }
      
      .map-controls-bottom {
        bottom: 8px;
        left: 8px;
        right: 8px;
      }

      .map-controls-right {
        gap: 6px;
        flex-wrap: wrap;
        justify-content: space-between;
      }
      
      .map-legend {
        padding: 8px 10px;
        font-size: 10px;
        gap: 6px;
      }
      
      .legend-item {
        font-size: 10px;
        gap: 4px;
        min-width: 30%;
      }
      
      .legend-pointer {
        width: 6px;
        height: 6px;
      }

      .restaurant-counter {
        font-size: 11px;
        padding: 8px 12px;
      }
      
      .view-all-btn {
        font-size: 11px;
        padding: 8px 12px;
        min-height: 36px;
      }

      .location-btn, .toggle-btn {
        padding: 6px 8px;
        min-width: 80px;
        height: 36px;
        font-size: 11px;
        flex: 1 1 auto;
        margin: 1px;
      }
      
      .btn-text {
        font-size: 10px;
        display: inline;
      }
    }
  `]
})
export class RestaurantMapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() restaurants: Restaurant[] = [];
  @ViewChild('mapElement') mapElement!: ElementRef;
  
  map: any = null;
  mapLoaded = false;
  restaurantsLoaded = false;
  nearbyRestaurantsLoading = false;
  viewType = 'roadmap';
  isFullscreen = false;
  markers: any[] = [];
  realWorldMarkers: any[] = [];
  userLocationMarker: any = null;
  placesService: any = null;
  isGettingLocation = false; // Track if location request is in progress
  
  // Track marker positions to avoid overlaps
  private existingMarkerPositions: { lat: number, lng: number, isDineBook: boolean }[] = [];
  
  defaultCenter = { lat: 44.6488, lng: -63.5752 }; // Halifax, NS
  currentPosition: any = null;

  constructor(private router: Router, private snackBar: MatSnackBar) {}

  ngOnInit() {
    console.log('RestaurantMapComponent ngOnInit called');
    console.log('Initial restaurants data:', this.restaurants?.length || 0);
    
    // Set up global reference for info window callbacks
    (window as any).restaurantMapComponent = this;
    this.getUserLocationOnInit();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('RestaurantMapComponent ngOnChanges called with:', changes);
    
    if (changes['restaurants'] && !changes['restaurants'].firstChange) {
      console.log('Restaurants changed from:', changes['restaurants'].previousValue?.length || 0, 'to:', changes['restaurants'].currentValue?.length || 0);
      console.log('New restaurants data:', changes['restaurants'].currentValue);
      this.updateRestaurantMarkers();
    }
    
    // If this is the first change and we have restaurants data
    if (changes['restaurants'] && changes['restaurants'].firstChange && this.restaurants && this.restaurants.length > 0) {
      console.log('First time receiving restaurants data:', this.restaurants.length, 'restaurants');
      // If map is already loaded, add markers immediately
      if (this.mapLoaded) {
        setTimeout(() => {
          this.addRestaurantMarkers();
        }, 100);
      }
    }
  }

  private updateRestaurantMarkers() {
    if (this.map) {
      // Clear existing markers
      this.markers.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      this.markers = [];
      
      // Clear the marker position tracking
      this.existingMarkerPositions = [];

      // Add new markers
      this.addRestaurantMarkers();
    }
  }

  viewRestaurantDetails(restaurantId: string) {
    console.log('=== VIEW RESTAURANT DETAILS CALLED ===');
    console.log('Restaurant ID:', restaurantId);
    console.log('Router available:', !!this.router);
    
    if (!restaurantId) {
      console.error('No restaurant ID provided');
      return;
    }
    
    try {
      console.log('Attempting navigation to:', `/restaurants/${restaurantId}`);
      this.router.navigate(['/restaurants', restaurantId]).then((success) => {
        console.log('Navigation result:', success);
        if (success) {
          console.log('Navigation successful - scrolling to top');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          console.error('Navigation failed - router returned false');
        }
      }).catch(error => {
        console.error('Navigation promise rejected:', error);
      });
    } catch (error) {
      console.error('Exception during navigation:', error);
    }
  }

  bookTable(restaurantId: string) {
    console.log('Booking table for restaurant ID:', restaurantId);
    const restaurant = this.restaurants.find(r => r._id === restaurantId);
    if (restaurant) {
      try {
        this.router.navigate(['/book-table'], {
          queryParams: {
            restaurantId: restaurant._id,
            restaurantName: restaurant.name,
            cuisine: restaurant.cuisine,
            location: restaurant.location
          }
        }).then((success) => {
          if (success) {
            console.log('Navigation to booking successful');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            console.error('Navigation to booking failed');
          }
        }).catch(error => {
          console.error('Booking navigation error:', error);
        });
      } catch (error) {
        console.error('Error during booking navigation:', error);
      }
    } else {
      console.error('Restaurant not found for booking:', restaurantId);
    }
  }

  closeInfoWindow(type: string, restaurantId: string) {
    console.log(`Closing info window for ${type} restaurant:`, restaurantId);
    
    // Close all open info windows
    if (this.markers && this.realWorldMarkers) {
      [...this.markers, ...this.realWorldMarkers].forEach((marker: any) => {
        if (marker.infoWindow) {
          marker.infoWindow.close();
        }
      });
    }
  }

  viewAllRestaurants() {
    this.router.navigate(['/restaurants']);
  }

  toggleMapType() {
    if (this.map) {
      this.viewType = this.viewType === 'roadmap' ? 'satellite' : 'roadmap';
      this.map.setMapTypeId(this.viewType);
      console.log('Map type changed to:', this.viewType);
    }
  }

  formatAddress(address: any): string {
    if (typeof address === 'string') {
      return address;
    }
    
    if (address && typeof address === 'object') {
      const parts = [
        address.street,
        address.city,
        address.province,
        address.postalCode
      ].filter(part => part && part.trim());
      
      return parts.length > 0 ? parts.join(', ') : 'Address not available';
    }
    
    return 'Address not available';
  }

  useDefaultLocation() {
    console.log('Using default location: Halifax, NS');
    this.currentPosition = { lat: 44.6488, lng: -63.5752 }; // Halifax coordinates
    
    if (this.map) {
      this.map.setCenter(this.currentPosition);
      this.map.setZoom(13);
      
      // Remove existing user location marker
      if (this.userLocationMarker) {
        this.userLocationMarker.setMap(null);
      }
      
      // Add default location marker
      this.createUserLocationMarker();
      
      // Load nearby restaurants at default location
      this.loadNearbyRestaurants();
    }
  }

  toggleFullscreen() {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  private enterFullscreen() {
    this.isFullscreen = true;
    
    const mapContainer = document.querySelector('.map-container') as HTMLElement;
    const body = document.body;
    const html = document.documentElement;
    
    if (mapContainer) {
      // Store original styles and position
      (mapContainer as any)._originalStyles = {
        position: mapContainer.style.position,
        top: mapContainer.style.top,
        left: mapContainer.style.left,
        width: mapContainer.style.width,
        height: mapContainer.style.height,
        zIndex: mapContainer.style.zIndex
      };
      
      // Store scroll position
      (mapContainer as any)._originalScrollY = window.scrollY;
      (mapContainer as any)._originalScrollX = window.scrollX;
      
      // Add fullscreen class
      mapContainer.classList.add('fullscreen');
      
      // Lock body scroll
      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = `-${window.scrollY}px`;
      body.style.left = '0';
      body.style.width = '100%';
      body.style.height = '100%';
      
      // Prevent any additional styles interference
      html.style.overflow = 'hidden';
      
      // Trigger map resize after DOM changes
      this.scheduleMapResize();
    }
  }

  private exitFullscreen() {
    this.isFullscreen = false;
    
    const mapContainer = document.querySelector('.map-container') as HTMLElement;
    const body = document.body;
    const html = document.documentElement;
    
    if (mapContainer) {
      // Remove fullscreen class
      mapContainer.classList.remove('fullscreen');
      
      // Restore body styles
      const scrollY = (mapContainer as any)._originalScrollY || 0;
      body.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.width = '';
      body.style.height = '';
      
      // Restore html styles
      html.style.overflow = '';
      
      // Restore scroll position
      window.scrollTo({
        top: scrollY,
        left: (mapContainer as any)._originalScrollX || 0,
        behavior: 'instant'
      });
      
      // Trigger map resize after DOM changes
      this.scheduleMapResize();
    }
  }

  private scheduleMapResize() {
    if (this.map) {
      // Multiple resize triggers for stability
      const resizeTimes = [50, 150, 300, 500, 800];
      
      resizeTimes.forEach((delay) => {
        setTimeout(() => {
          if (this.map) {
            google.maps.event.trigger(this.map, 'resize');
            if (this.currentPosition) {
              this.map.setCenter(this.currentPosition);
            }
          }
        }, delay);
      });
    }
  }

  ngAfterViewInit() {
    // Initialize map after a short delay to ensure the element is ready
    setTimeout(() => {
      if (this.mapElement?.nativeElement) {
        this.initializeMap();
      }
    }, 100);
  }

  ngOnDestroy() {
    // Clean up fullscreen state
    if (this.isFullscreen) {
      const body = document.body;
      const mapContainer = document.querySelector('.map-container') as HTMLElement;
      
      mapContainer?.classList.remove('fullscreen');
      body.style.overflow = '';
      body.style.position = '';
      body.style.width = '';
      body.style.height = '';
      
      // Restore scroll position if stored
      if ((mapContainer as any)?._originalScrollY !== undefined) {
        window.scrollTo((mapContainer as any)._originalScrollX || 0, (mapContainer as any)._originalScrollY || 0);
      }
    }
    
    // Clean up markers
    if (this.markers) {
      this.markers.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
    }
    if (this.realWorldMarkers) {
      this.realWorldMarkers.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
    }
    if (this.userLocationMarker && this.userLocationMarker.setMap) {
      this.userLocationMarker.setMap(null);
    }
    
    // Clear arrays
    this.markers = [];
    this.realWorldMarkers = [];
    this.userLocationMarker = null;
    
    // Clean up global reference
    delete (window as any).restaurantMapComponent;
  }

  private getUserLocationOnInit() {
    if (navigator.geolocation) {
      console.log('Attempting to get user location on init...');
      
      // Try multiple approaches for initial location
      const tryLocationDetection = (attempt: number = 1) => {
        if (attempt > 3) {
          console.log('All location detection attempts failed, using default Halifax location');
          return;
        }
        
        const options = {
          enableHighAccuracy: attempt === 1, // First try high accuracy
          timeout: attempt === 1 ? 8000 : 5000, // Shorter timeouts for subsequent attempts
          maximumAge: attempt === 1 ? 0 : 300000 // Allow cache for later attempts
        };
        
        console.log(`Location detection attempt ${attempt}:`, options);
        
        navigator.geolocation.getCurrentPosition((position) => {
          if (position) {
            const newPosition = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            console.log(`Location obtained on attempt ${attempt}:`, newPosition);
            this.defaultCenter = newPosition;
            this.currentPosition = newPosition;
            
            // Immediately load nearby restaurants if location obtained and map is ready
            if (this.map && this.placesService) {
              console.log('Loading nearby restaurants at actual location');
              this.loadNearbyRestaurants();
            }
          }
        }, (error) => {
          console.log(`Location attempt ${attempt} failed:`, error.message);
          // Try next method
          setTimeout(() => tryLocationDetection(attempt + 1), 1000);
        }, options);
      };
      
      tryLocationDetection();
    }
  }

  private async initializeMap() {
    try {
      console.log('Starting map initialization...');
      
      // Initialize Google Maps
      const { Map } = await google.maps.importLibrary("maps") as any;
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as any;
      const { PlacesService } = await google.maps.importLibrary("places") as any;

      console.log('Google Maps libraries loaded successfully');

      this.map = new Map(this.mapElement.nativeElement, {
        center: this.currentPosition || this.defaultCenter,
        zoom: 13,
        mapTypeId: this.viewType,
        mapId: 'RESTAURANT_MAP', // Required for AdvancedMarkerElement
        zoomControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        mapTypeControl: true,
        styles: [
          {
            featureType: 'poi.business',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      console.log('Map created successfully:', this.map);

      this.placesService = new PlacesService(this.map);

      // Wait for map to be fully loaded
      google.maps.event.addListenerOnce(this.map, 'idle', () => {
        console.log('Map is idle, proceeding with markers...');
        console.log('Available restaurants when map is ready:', this.restaurants?.length || 0);
        this.mapLoaded = true;
        
        // Add restaurant markers first (if we have restaurants)
        if (this.restaurants && this.restaurants.length > 0) {
          this.addRestaurantMarkers();
        } else {
          console.log('No restaurants available yet, will add when data arrives');
        }
        
        // Add user location marker if available
        if (this.currentPosition) {
          this.addUserLocationMarker();
        }
        
        // Load nearby restaurants with enhanced search immediately
        console.log('Starting comprehensive nearby restaurant search...');
        setTimeout(() => {
          this.loadNearbyRestaurants();
        }, 500);
      });

      console.log('Map initialization complete');

    } catch (error) {
      console.error('Error in initializeMap:', error);
    }
  }

  private addRestaurantMarkers() {
    console.log('Adding restaurant markers. Total restaurants:', this.restaurants?.length || 0);
    
    if (!this.restaurants || this.restaurants.length === 0) {
      console.log('No restaurants to display');
      this.restaurantsLoaded = true;
      return;
    }
    
    let markersAdded = 0;
    this.restaurants.forEach((restaurant: Restaurant, index: number) => {
      console.log(`Restaurant ${index + 1}: ${restaurant.name}`);
      
      // Check for coordinates in multiple formats
      let lat: number | null = null;
      let lng: number | null = null;
      
      // First check for GeoJSON format (coordinates.coordinates)
      if (restaurant.coordinates && restaurant.coordinates.coordinates && Array.isArray(restaurant.coordinates.coordinates)) {
        lng = restaurant.coordinates.coordinates[0];
        lat = restaurant.coordinates.coordinates[1];
        console.log('Using GeoJSON coordinates:', { lat, lng });
      }
      // Then check for geometry format (geometry.coordinates)
      else if ((restaurant as any).geometry && (restaurant as any).geometry.coordinates && Array.isArray((restaurant as any).geometry.coordinates)) {
        lng = (restaurant as any).geometry.coordinates[0];
        lat = (restaurant as any).geometry.coordinates[1];
        console.log('Using geometry coordinates:', { lat, lng });
      }
      // Finally check for lat/lng format (coordinates.latitude, coordinates.longitude)
      else if (restaurant.coordinates && typeof restaurant.coordinates === 'object' && 
               'latitude' in restaurant.coordinates && 'longitude' in restaurant.coordinates) {
        lat = (restaurant.coordinates as any).latitude;
        lng = (restaurant.coordinates as any).longitude;
        console.log('Using lat/lng coordinates:', { lat, lng });
      }
      
      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        console.log(`✅ Creating marker for ${restaurant.name} at lat: ${lat}, lng: ${lng}`);
        
        // Create a normalized restaurant object with proper coordinates
        const normalizedRestaurant = {
          ...restaurant,
          coordinates: {
            type: 'Point',
            coordinates: [lng, lat] as [number, number]
          }
        };
        this.createAdvancedMarker(normalizedRestaurant, '#28a745', true);
        markersAdded++;
      } else {
        console.warn(`❌ Restaurant ${restaurant.name} missing valid coordinates - skipping`);
      }
    });
    
    console.log(`Finished adding ${markersAdded} restaurant markers`);
    this.restaurantsLoaded = true;
  }

  private addUserLocationMarker() {
    if (this.currentPosition && this.map) {
      this.createUserLocationMarker();
    }
  }

  private createAdvancedMarker(restaurant: Restaurant, color: string, isDineBook: boolean = false) {
    if (!this.map) return;
    
    // Create a slim pointer-style marker like Google Maps
    const markerElement = document.createElement('div');
    markerElement.className = 'custom-marker';
    markerElement.style.cursor = 'pointer';
    markerElement.innerHTML = `
      <div style="
        width: 20px;
        height: 32px;
        background-color: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        cursor: pointer;
        position: relative;
        margin: 0;
        padding: 0;
        transition: all 0.2s ease;
      ">
        <div style="
          position: absolute;
          top: 6px;
          left: 6px;
          width: 6px;
          height: 6px;
          background-color: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `;

    // Add hover effect
    markerElement.addEventListener('mouseenter', () => {
      const markerDiv = markerElement.querySelector('div') as HTMLElement;
      if (markerDiv) {
        markerDiv.style.transform = 'rotate(-45deg) scale(1.1)';
        markerDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5)';
      }
    });

    markerElement.addEventListener('mouseleave', () => {
      const markerDiv = markerElement.querySelector('div') as HTMLElement;
      if (markerDiv) {
        markerDiv.style.transform = 'rotate(-45deg) scale(1)';
        markerDiv.style.boxShadow = '0 3px 6px rgba(0,0,0,0.4)';
      }
    });

    // Get coordinates and check for overlapping markers
    let lat = restaurant.coordinates?.coordinates[1] || 0;
    let lng = restaurant.coordinates?.coordinates[0] || 0;
    
    // Check if there's already a marker very close to this position
    const position = this.avoidMarkerOverlap(lat, lng, isDineBook);
    lat = position.lat;
    lng = position.lng;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map: this.map,
      position: { lat, lng },
      content: markerElement,
      title: restaurant.name
    });

    console.log(`Created ${isDineBook ? 'DineBook' : 'nearby'} marker for ${restaurant.name} at:`, { lat, lng });

    // Create info window with improved styling
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 16px; max-width: 320px; font-family: 'Segoe UI', system-ui, sans-serif; position: relative; z-index: 1000;">
          <h3 style="margin: 0 0 12px 0; color: #333; font-size: 18px; font-weight: 600;">${restaurant.name}</h3>
          <div style="margin-bottom: 16px;">
            <p style="margin: 6px 0; color: #666; font-size: 14px;">
              <strong>Cuisine:</strong> ${restaurant.cuisine || 'N/A'}
            </p>
            <p style="margin: 6px 0; color: #666; font-size: 14px;">
              <strong>Price:</strong> ${restaurant.priceRange || 'N/A'}
            </p>
            <p style="margin: 6px 0; color: #666; font-size: 14px;">
              <strong>Rating:</strong> ${this.formatRatingDisplay(restaurant)}
            </p>
            <p style="margin: 6px 0; color: #666; font-size: 14px;">
              <strong>Address:</strong> ${this.formatAddress(restaurant.address)}
            </p>
          </div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: space-between; margin-top: 16px;">
            ${isDineBook ? `
            <button onclick="console.log('View Details button clicked for ID: ${restaurant._id}'); window.restaurantMapComponent.viewRestaurantDetails('${restaurant._id}')" 
                    style="
                      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); 
                      color: #1565c0; 
                      border: 2px solid #2196f3; 
                      padding: 12px 18px; 
                      border-radius: 8px; 
                      cursor: pointer; 
                      font-size: 14px; 
                      font-weight: 600; 
                      transition: all 0.3s ease; 
                      user-select: none;
                      flex: 1;
                      min-width: 120px;
                      text-align: center;
                      box-shadow: 0 3px 6px rgba(33, 150, 243, 0.25);
                      position: relative;
                      z-index: 1001;
                    "
                    onmouseover="
                      this.style.background='linear-gradient(135deg, #2196f3 0%, #1976d2 100%)'; 
                      this.style.color='white';
                      this.style.transform='translateY(-2px)';
                      this.style.boxShadow='0 6px 12px rgba(33, 150, 243, 0.4)';
                    "
                    onmouseout="
                      this.style.background='linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'; 
                      this.style.color='#1565c0';
                      this.style.transform='translateY(0)';
                      this.style.boxShadow='0 3px 6px rgba(33, 150, 243, 0.25)';
                    ">
              📋 View Details
            </button>
            <button onclick="console.log('Book Table button clicked for ID: ${restaurant._id}'); window.restaurantMapComponent.bookTable('${restaurant._id}')" 
                    style="
                      background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%); 
                      color: #2e7d32; 
                      border: 2px solid #4caf50; 
                      padding: 12px 18px; 
                      border-radius: 8px; 
                      cursor: pointer; 
                      font-size: 14px; 
                      font-weight: 600; 
                      transition: all 0.3s ease; 
                      user-select: none;
                      flex: 1;
                      min-width: 120px;
                      text-align: center;
                      box-shadow: 0 3px 6px rgba(76, 175, 80, 0.25);
                      position: relative;
                      z-index: 1001;
                    "
                    onmouseover="
                      this.style.background='linear-gradient(135deg, #4caf50 0%, #388e3c 100%)'; 
                      this.style.color='white';
                      this.style.transform='translateY(-2px)';
                      this.style.boxShadow='0 6px 12px rgba(76, 175, 80, 0.4)';
                    "
                    onmouseout="
                      this.style.background='linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)'; 
                      this.style.color='#2e7d32';
                      this.style.transform='translateY(0)';
                      this.style.boxShadow='0 3px 6px rgba(76, 175, 80, 0.25)';
                    ">
              🍽️ Book Table
            </button>
            ` : `
            <div style="
              background: linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%); 
              border: 2px solid #00acc1; 
              padding: 14px 18px; 
              border-radius: 8px; 
              font-size: 14px; 
              color: #006064;
              text-align: center;
              width: 100%;
              box-shadow: 0 3px 6px rgba(0, 172, 193, 0.25);
            ">
              <strong>🌟 Nearby Restaurant</strong><br>
              <small style="color: #00838f;">Contact directly for reservations</small>
            </div>
            `}
          </div>
        </div>
      `
    });

    // Add click event listener
    marker.addListener('click', () => {
      console.log(`Clicked on ${isDineBook ? 'DineBook' : 'nearby'} restaurant: ${restaurant.name}`);
      
      // Close other info windows
      if (this.markers && this.realWorldMarkers) {
        [...this.markers, ...this.realWorldMarkers].forEach((m: any) => {
          if (m.infoWindow && m.infoWindow !== infoWindow) {
            m.infoWindow.close();
          }
        });
      }
      
      infoWindow.open(this.map, marker);
    });

    // Store reference to info window
    (marker as any).infoWindow = infoWindow;
    
    // Add to appropriate array
    if (isDineBook) {
      this.markers?.push(marker as any);
    } else {
      this.realWorldMarkers?.push(marker as any);
    }

    // Make methods globally accessible for info window buttons
    (window as any).restaurantMapComponent = this;
  }

  private createUserLocationMarker() {
    if (!this.map || !this.currentPosition) return;
    
    const markerElement = document.createElement('div');
    markerElement.innerHTML = `
      <div style="
        width: 20px;
        height: 32px;
        background-color: #dc3545;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        position: relative;
        animation: userLocationPulse 2s infinite;
      ">
        <div style="
          position: absolute;
          top: 6px;
          left: 6px;
          width: 6px;
          height: 6px;
          background-color: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `;

    this.userLocationMarker = new google.maps.marker.AdvancedMarkerElement({
      map: this.map,
      position: this.currentPosition,
      content: markerElement,
      title: 'Your Location'
    });
    
    console.log('User location marker created at:', this.currentPosition);
  }

  private loadNearbyRestaurants() {
    if (!this.placesService || !this.map) {
      console.log('Places service or map not ready yet');
      return;
    }

    const center = this.currentPosition || this.defaultCenter;
    if (!center) {
      console.log('No center position available');
      return;
    }
    
    console.log('Searching for nearby restaurants around:', center);
    this.nearbyRestaurantsLoading = true;
    
    // Clear existing nearby restaurants first
    this.realWorldMarkers.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    this.realWorldMarkers = [];
    
    // Enhanced search with multiple strategies
    this.performComprehensiveRestaurantSearch(center);
  }

  private performComprehensiveRestaurantSearch(center: any) {
    console.log('Starting comprehensive restaurant search...');
    let totalFound = 0;
    const maxTotalResults = 150; // Increased to show more restaurants
    const allFoundPlaces = new Set<string>(); // Properly typed as Set<string>
    
    // Strategy 1: Basic restaurant search with larger radius
    const primaryRequest = {
      location: new google.maps.LatLng(center.lat, center.lng),
      radius: 15000, // Increased to 15km radius for broader coverage
      type: 'restaurant'
    };

    this.placesService.nearbySearch(primaryRequest, (results: any[], status: any) => {
      console.log('Primary restaurant search - Status:', status, 'Results:', results?.length || 0);
      
      if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
        const processed = this.processAndAddRestaurants(results, '#ff6b35', 'Restaurant', 50, allFoundPlaces);
        totalFound += processed;
        console.log(`Primary search added: ${processed} restaurants`);
      }
      
      // Strategy 2: Food establishments
      setTimeout(() => {
        const foodRequest = {
          location: new google.maps.LatLng(center.lat, center.lng),
          radius: 12000, // Increased radius
          type: 'food'
        };

        this.placesService.nearbySearch(foodRequest, (foodResults: any[], foodStatus: any) => {
          console.log('Food search - Status:', foodStatus, 'Results:', foodResults?.length || 0);
          
          if (foodStatus === google.maps.places.PlacesServiceStatus.OK && foodResults && totalFound < maxTotalResults) {
            const processed = this.processAndAddRestaurants(foodResults, '#ff8c42', 'Food Establishment', 30, allFoundPlaces);
            totalFound += processed;
            console.log(`Food search added: ${processed} establishments`);
          }
          
          // Strategy 3: Meal delivery and takeaway
          setTimeout(() => {
            this.searchMealServices(center, totalFound, maxTotalResults, allFoundPlaces);
          }, 1000);
          
          // Strategy 4: Text search for local restaurants
          setTimeout(() => {
            this.performTextSearches(center, totalFound, maxTotalResults, allFoundPlaces);
          }, 2000);
        });
      }, 1000);
      
      // Strategy 5: Search for specific restaurant types
      setTimeout(() => {
        this.searchSpecificRestaurantTypes(center, totalFound, maxTotalResults, allFoundPlaces);
      }, 3000);
      
      // Strategy 6: Broad establishment search to catch everything
      setTimeout(() => {
        this.searchAllEstablishments(center, totalFound, maxTotalResults, allFoundPlaces);
      }, 4000);
      
      this.nearbyRestaurantsLoading = false;
    });
  }

  private searchAllEstablishments(center: any, currentTotal: number, maxTotal: number, allFoundPlaces: Set<string>) {
    // Final comprehensive search for any establishment that might be food-related
    const request = {
      location: new google.maps.LatLng(center.lat, center.lng),
      radius: 5000, // Closer radius but all establishments
      type: 'establishment'
    };

    this.placesService.nearbySearch(request, (results: any[], status: any) => {
      console.log('All establishments search - Status:', status, 'Results:', results?.length || 0);
      
      if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
        // Filter for food-related establishments that we might have missed
        const foodRelatedResults = results.filter((place: any) => {
          if (!place.name) return false;
          
          const name = place.name.toLowerCase();
          const foodKeywords = [
            'restaurant', 'pizza', 'cafe', 'diner', 'grill', 'kitchen', 
            'bistro', 'pub', 'bar', 'food', 'thai', 'chinese', 'italian', 
            'indian', 'mexican', 'sushi', 'ramen', 'bbq', 'steakhouse', 
            'seafood', 'burgers', 'wings', 'noodles', 'curry', 'tacos',
            'bagels', 'donuts', 'coffee', 'tea', 'sandwich', 'salad',
            'soup', 'breakfast', 'lunch', 'dinner', 'brunch', 'buffet',
            'takeout', 'delivery', 'fried', 'grilled', 'roasted', 'baked'
          ];
          
          return foodKeywords.some(keyword => name.includes(keyword));
        });
        
        console.log(`Found ${foodRelatedResults.length} food-related establishments out of ${results.length} total`);
        
        if (foodRelatedResults.length > 0) {
          const processed = this.processAndAddRestaurants(foodRelatedResults, '#ff8a50', 'Local Establishment', 20, allFoundPlaces);
          console.log(`All establishments search added: ${processed} food places`);
        }
      }
    });
  }

  private searchMealServices(center: any, currentTotal: number, maxTotal: number, allFoundPlaces: Set<string>) {
    const mealTypes = ['meal_takeaway', 'meal_delivery'];
    
    mealTypes.forEach((type, index) => {
      if ((currentTotal + this.realWorldMarkers.length) >= maxTotal) return;
      
      setTimeout(() => {
        const request = {
          location: new google.maps.LatLng(center.lat, center.lng),
          radius: 8000,
          type: type
        };

        this.placesService.nearbySearch(request, (results: any[], status: any) => {
          console.log(`${type} search - Status:`, status, 'Results:', results?.length || 0);
          
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            const processed = this.processAndAddRestaurants(results, '#ff7043', type.replace('_', ' '), 15, allFoundPlaces);
            console.log(`${type} search added: ${processed} establishments`);
          }
        });
      }, index * 500);
    });
  }

  private performTextSearches(center: any, currentTotal: number, maxTotal: number, allFoundPlaces: Set<string>) {
    const searchTerms = [
      'restaurant',
      'dining',
      'food',
      'cafe',
      'pizza',
      'chinese restaurant',
      'italian restaurant',
      'seafood restaurant',
      'pub',
      'fast food',
      'steakhouse',
      'sushi',
      'indian restaurant',
      'mexican restaurant'
    ];

    let searchIndex = 0;
    let textSearchAdded = 0;

    const performNextTextSearch = () => {
      if (searchIndex >= searchTerms.length || (currentTotal + textSearchAdded) >= maxTotal) {
        console.log(`Text searches complete. Added ${textSearchAdded} restaurants via text search.`);
        return;
      }

      const request = {
        location: new google.maps.LatLng(center.lat, center.lng),
        radius: 20000, // Larger radius for text search
        query: searchTerms[searchIndex]
      };

      this.placesService.textSearch(request, (results: any[], status: any) => {
        console.log(`Text search "${searchTerms[searchIndex]}" - Status:`, status, 'Results:', results?.length || 0);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          const processed = this.processAndAddRestaurants(results, '#ff9966', 'Local Restaurant', 12, allFoundPlaces);
          textSearchAdded += processed;
          console.log(`Text search "${searchTerms[searchIndex]}" added: ${processed} restaurants`);
        }
        
        searchIndex++;
        if (searchIndex < searchTerms.length && (currentTotal + textSearchAdded) < maxTotal) {
          setTimeout(performNextTextSearch, 1000); // Increased delay between searches
        }
      });
    };

    performNextTextSearch();
  }

  private searchSpecificRestaurantTypes(center: any, currentTotal: number, maxTotal: number, allFoundPlaces: Set<string>) {
    const restaurantTypes = [
      'cafe',
      'bakery',
      'bar',
      'night_club'
    ];

    restaurantTypes.forEach((type, index) => {
      if ((currentTotal + this.realWorldMarkers.length) >= maxTotal) return;
      
      setTimeout(() => {
        const request = {
          location: new google.maps.LatLng(center.lat, center.lng),
          radius: 10000, // Increased radius
          type: type
        };

        this.placesService.nearbySearch(request, (results: any[], status: any) => {
          console.log(`${type} search - Status:`, status, 'Results:', results?.length || 0);
          
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            const processed = this.processAndAddRestaurants(results, '#ff7f50', type.replace('_', ' '), 15, allFoundPlaces);
            console.log(`${type} search added: ${processed} establishments`);
          }
        });
      }, index * 1200);
    });
  }

  private processAndAddRestaurants(results: any[], markerColor: string, type: string, maxToAdd: number, allFoundPlaces?: Set<string>): number {
    if (!results || results.length === 0) return 0;
    
    let processed = 0;
    const existingPositions = new Set<string>();
    
    // Track existing DineBook restaurants
    this.restaurants?.forEach((r: any) => {
      if (r.coordinates?.coordinates) {
        const key = `${r.coordinates.coordinates[1].toFixed(4)},${r.coordinates.coordinates[0].toFixed(4)}`;
        existingPositions.add(key);
      }
    });
    
    // Track existing nearby restaurants
    this.realWorldMarkers.forEach((marker: any) => {
      if (marker.position) {
        const key = `${marker.position.lat().toFixed(4)},${marker.position.lng().toFixed(4)}`;
        existingPositions.add(key);
      }
    });

    for (const place of results) {
      if (processed >= maxToAdd) break;
      
      if (!place.geometry?.location || !place.name || 
          place.business_status === 'CLOSED_PERMANENTLY' ||
          place.permanently_closed) {
        continue;
      }

      // Check for duplicates using place_id
      if (allFoundPlaces && place.place_id) {
        if (allFoundPlaces.has(place.place_id)) {
          continue;
        }
        allFoundPlaces.add(place.place_id);
      }

      // Create position key
      const posKey = `${place.geometry.location.lat().toFixed(4)},${place.geometry.location.lng().toFixed(4)}`;
      
      if (existingPositions.has(posKey)) {
        continue;
      }

      // Enhanced validation for restaurant-like establishments
      if (!this.isValidRestaurant(place)) {
        continue;
      }

      const nearbyRestaurant: Restaurant = {
        _id: place.place_id || `nearby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: place.name || 'Unknown Restaurant',
        location: place.vicinity || place.formatted_address || 'Halifax, NS',
        coordinates: {
          type: 'Point',
          coordinates: [place.geometry.location.lng(), place.geometry.location.lat()] as [number, number]
        },
        address: place.vicinity || place.formatted_address || 'Address not available',
        cuisine: this.getCuisineType(place.types) || type,
        priceRange: this.getPriceRange(place.price_level),
        rating: place.rating || 0,
        description: this.formatPlaceDescription(place),
        isDineBookRestaurant: false
      };

      console.log(`Adding ${type}: ${nearbyRestaurant.name} at [${place.geometry.location.lat()}, ${place.geometry.location.lng()}]`);
      
      this.createAdvancedMarker(nearbyRestaurant, markerColor, false);
      existingPositions.add(posKey);
      processed++;
    }
    
    return processed;
  }

  private isValidRestaurant(place: any): boolean {
    if (!place.types || !Array.isArray(place.types)) {
      // If no types but has food-related name, still consider it
      const nameIndicatesFood = place.name && (
        place.name.toLowerCase().includes('restaurant') ||
        place.name.toLowerCase().includes('pizza') ||
        place.name.toLowerCase().includes('cafe') ||
        place.name.toLowerCase().includes('diner') ||
        place.name.toLowerCase().includes('grill') ||
        place.name.toLowerCase().includes('kitchen') ||
        place.name.toLowerCase().includes('bistro') ||
        place.name.toLowerCase().includes('pub') ||
        place.name.toLowerCase().includes('bar') ||
        place.name.toLowerCase().includes('food')
      );
      return nameIndicatesFood;
    }
    
    // Valid restaurant types - expanded list
    const validTypes = [
      'restaurant', 'food', 'establishment', 'meal_takeaway', 
      'meal_delivery', 'cafe', 'bakery', 'bar', 'night_club',
      'pizza_restaurant', 'chinese_restaurant', 'italian_restaurant',
      'japanese_restaurant', 'mexican_restaurant', 'indian_restaurant',
      'thai_restaurant', 'french_restaurant', 'american_restaurant',
      'seafood_restaurant', 'steakhouse', 'fast_food_restaurant',
      'sandwich_shop', 'ice_cream_shop', 'donut_shop', 'coffee_shop',
      'breakfast_restaurant', 'brunch_restaurant', 'lunch_restaurant',
      'dinner_restaurant', 'buffet_restaurant', 'fine_dining_restaurant',
      'casual_dining_restaurant', 'family_restaurant', 'ethnic_restaurant',
      'vegetarian_restaurant', 'vegan_restaurant', 'halal_restaurant',
      'kosher_restaurant', 'organic_restaurant', 'farm_to_table_restaurant'
    ];
    
    // More restrictive invalid types to exclude
    const invalidTypes = [
      'gas_station', 'hospital', 'pharmacy', 'bank', 'atm',
      'grocery_or_supermarket', 'shopping_mall', 'department_store',
      'school', 'university', 'library', 'church', 'mosque', 'temple',
      'park', 'cemetery', 'government', 'post_office', 'police',
      'fire_station', 'hospital', 'dentist', 'doctor', 'veterinarian',
      'car_dealer', 'car_repair', 'hair_care', 'beauty_salon',
      'gym', 'spa', 'laundry', 'real_estate_agency'
    ];
    
    const hasValidType = place.types.some((type: string) => {
      return validTypes.includes(type) || 
             type.includes('restaurant') || 
             type.includes('food') ||
             type.includes('cafe') ||
             type.includes('pizza') ||
             type.includes('bar') ||
             type.includes('pub') ||
             type.includes('grill') ||
             type.includes('diner') ||
             type.includes('bistro') ||
             type.includes('eatery');
    });
    
    const hasInvalidType = place.types.some((type: string) => 
      invalidTypes.includes(type)
    );
    
    // If it has establishment type and food-related name, include it
    const hasEstablishment = place.types.includes('establishment');
    const nameIndicatesFood = place.name && (
      place.name.toLowerCase().includes('restaurant') ||
      place.name.toLowerCase().includes('pizza') ||
      place.name.toLowerCase().includes('cafe') ||
      place.name.toLowerCase().includes('diner') ||
      place.name.toLowerCase().includes('grill') ||
      place.name.toLowerCase().includes('kitchen') ||
      place.name.toLowerCase().includes('bistro') ||
      place.name.toLowerCase().includes('pub') ||
      place.name.toLowerCase().includes('bar') ||
      place.name.toLowerCase().includes('food') ||
      place.name.toLowerCase().includes('thai') ||
      place.name.toLowerCase().includes('chinese') ||
      place.name.toLowerCase().includes('italian') ||
      place.name.toLowerCase().includes('indian') ||
      place.name.toLowerCase().includes('mexican') ||
      place.name.toLowerCase().includes('sushi') ||
      place.name.toLowerCase().includes('ramen') ||
      place.name.toLowerCase().includes('bbq') ||
      place.name.toLowerCase().includes('steakhouse') ||
      place.name.toLowerCase().includes('seafood')
    );
    
    return (hasValidType || (hasEstablishment && nameIndicatesFood)) && !hasInvalidType;
  }

  private formatPlaceDescription(place: any): string {
    const parts = [];
    
    if (place.user_ratings_total) {
      parts.push(`${place.user_ratings_total} reviews`);
    }
    
    if (place.opening_hours?.open_now !== undefined) {
      parts.push(place.opening_hours.open_now ? 'Open now' : 'Closed');
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Local restaurant';
  }

  private searchPopularChains(center: any) {
    // Search for popular restaurant chains specifically
    const popularChains = [
      'Tim Hortons', 'McDonald\'s', 'Subway', 'Starbucks', 'KFC',
      'Pizza Hut', 'Domino\'s', 'Wendy\'s', 'A&W', 'Boston Pizza',
      'Swiss Chalet', 'The Keg', 'Earl\'s', 'White Spot', 'Denny\'s'
    ];

    let searchIndex = 0;
    const searchNext = () => {
      if (searchIndex >= popularChains.length) return;
      
      const request = {
        location: new google.maps.LatLng(center.lat, center.lng),
        radius: 5000,
        query: popularChains[searchIndex]
      };

      this.placesService.textSearch(request, (results: any[], status: any) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          results.slice(0, 3).forEach((place) => { // Limit to 3 per chain
            if (place.geometry?.location && place.name) {
              const nearbyRestaurant: Restaurant = {
                _id: place.place_id || `chain_${Math.random().toString(36).substr(2, 9)}`,
                name: place.name,
                location: place.formatted_address || 'Address not available',
                coordinates: {
                  type: 'Point',
                  coordinates: [place.geometry.location.lng(), place.geometry.location.lat()] as [number, number]
                },
                address: place.formatted_address || 'Address not available',
                cuisine: 'Chain Restaurant',
                priceRange: this.getPriceRange(place.price_level),
                rating: place.rating || 0,
                description: `Popular chain restaurant${place.user_ratings_total ? ` • ${place.user_ratings_total} reviews` : ''}`,
                isDineBookRestaurant: false
              };

              console.log(`Adding chain restaurant:`, nearbyRestaurant.name);
              this.createAdvancedMarker(nearbyRestaurant, '#ffc107', false); // Amber color for chains
              this.realWorldMarkers?.push(nearbyRestaurant as any);
            }
          });
        }
        
        searchIndex++;
        if (searchIndex < popularChains.length) {
          setTimeout(searchNext, 200); // Small delay between searches
        }
      });
    };

    searchNext();
  }

  private searchAdditionalRestaurants() {
    if (!this.placesService || !this.map) return;

    const center = this.currentPosition || this.defaultCenter;
    if (!center) return;

    // Search for specific food types
    const foodTypes = ['meal_takeaway', 'cafe', 'bakery', 'food'];
    
    foodTypes.forEach((type, index) => {
      setTimeout(() => {
        const request = {
          location: new google.maps.LatLng(center.lat, center.lng),
          radius: 2000,
          type: type
        };

        this.placesService.nearbySearch(request, (results: any[], status: any) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            console.log(`Found ${results.length} ${type} establishments`);
            
            results.slice(0, 5).forEach((place) => {
              if (place.geometry?.location && place.name && place.business_status === 'OPERATIONAL') {
                // Check if we already have this place
                const existingMarker = this.realWorldMarkers.find((marker: any) => 
                  marker.position && 
                  Math.abs(marker.position.lat() - place.geometry.location.lat()) < 0.0001 &&
                  Math.abs(marker.position.lng() - place.geometry.location.lng()) < 0.0001
                );

                if (!existingMarker) {
                  const nearbyRestaurant: Restaurant = {
                    _id: place.place_id || `${type}_${Math.random().toString(36).substr(2, 9)}`,
                    name: place.name,
                    location: place.vicinity || place.formatted_address || 'Address not available',
                    coordinates: {
                      type: 'Point',
                      coordinates: [place.geometry.location.lng(), place.geometry.location.lat()] as [number, number]
                    },
                    address: place.vicinity || place.formatted_address || 'Address not available',
                    cuisine: this.getCuisineType(place.types) || type.replace('_', ' '),
                    priceRange: this.getPriceRange(place.price_level),
                    rating: place.rating || 0,
                    description: `${place.user_ratings_total ? `${place.user_ratings_total} reviews` : 'Local establishment'}`,
                    isDineBookRestaurant: false
                  };

                  console.log(`Adding ${type}:`, nearbyRestaurant.name);
                  this.createAdvancedMarker(nearbyRestaurant, '#ff6b35', false);
                }
              }
            });
          }
        });
      }, index * 500); // Stagger requests
    });
  }

  private getCuisineType(types: string[]): string {
    if (!types) return 'Restaurant';
    
    const cuisineMap: { [key: string]: string } = {
      'chinese_restaurant': 'Chinese',
      'italian_restaurant': 'Italian',
      'japanese_restaurant': 'Japanese',
      'mexican_restaurant': 'Mexican',
      'indian_restaurant': 'Indian',
      'thai_restaurant': 'Thai',
      'french_restaurant': 'French',
      'american_restaurant': 'American',
      'pizza_restaurant': 'Pizza',
      'seafood_restaurant': 'Seafood',
      'steakhouse': 'Steakhouse',
      'fast_food_restaurant': 'Fast Food',
      'cafe': 'Cafe',
      'bakery': 'Bakery'
    };
    
    for (const type of types) {
      if (cuisineMap[type]) {
        return cuisineMap[type];
      }
    }
    
    return 'Restaurant';
  }

  private getPriceRange(priceLevel: number | undefined): string {
    if (priceLevel === undefined || priceLevel === null) return '$$';
    
    switch (priceLevel) {
      case 0: return '$';
      case 1: return '$';
      case 2: return '$$';
      case 3: return '$$$';
      case 4: return '$$$$';
      default: return '$$';
    }
  }

  private handlePlacesApiError(status: any) {
    switch (status) {
      case google.maps.places.PlacesServiceStatus.ZERO_RESULTS:
        console.log('No nearby restaurants found in this area');
        break;
      case google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT:
        console.log('Query limit exceeded for Places API - please try again later');
        break;
      case google.maps.places.PlacesServiceStatus.REQUEST_DENIED:
        console.log('Places API request denied - check API key and permissions');
        break;
      case google.maps.places.PlacesServiceStatus.INVALID_REQUEST:
        console.log('Invalid request for Places API');
        break;
      default:
        console.log('Places API error:', status);
    }
  }

  getUserLocation() {
    console.log('Find Me button clicked - Getting user location...');
    
    // Prevent multiple simultaneous location requests
    if (this.isGettingLocation) {
      console.log('Location request already in progress, ignoring click');
      return;
    }
    
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      this.showLocationError('Geolocation is not supported by your browser. Using Halifax as default location.');
      this.useDefaultLocation();
      return;
    }

    this.isGettingLocation = true;

    // Find the button and manage its state more reliably
    const locationBtn = document.querySelector('.location-btn') as HTMLElement;
    
    // Set loading state - only change visual state, keep text the same
    if (locationBtn) {
      locationBtn.style.opacity = '0.7';
      locationBtn.style.pointerEvents = 'none';
      // Don't change the text, just the visual state
    }

    // Reset button function
    const resetButton = () => {
      this.isGettingLocation = false;
      if (locationBtn) {
        locationBtn.style.opacity = '1';
        locationBtn.style.pointerEvents = 'auto';
        // Text stays the same, just reset the visual state
      }
    };

    // Try multiple location methods for better reliability
    this.tryMultipleLocationMethods(resetButton);
  }

  private tryMultipleLocationMethods(resetButton: () => void) {
    console.log('Trying high accuracy location first...');
    
    // Method 1: High accuracy GPS
    const highAccuracyOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.handleLocationSuccess(position, resetButton);
      },
      (error) => {
        console.log('High accuracy failed, trying medium accuracy...');
        
        // Method 2: Medium accuracy (faster)
        const mediumAccuracyOptions: PositionOptions = {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60000 // 1 minute cache
        };
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.handleLocationSuccess(position, resetButton);
          },
          (error) => {
            console.log('Medium accuracy failed, trying cached location...');
            
            // Method 3: Allow cached location (fastest)
            const cachedOptions: PositionOptions = {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 300000 // 5 minutes cache
            };
            
            navigator.geolocation.getCurrentPosition(
              (position) => {
                this.handleLocationSuccess(position, resetButton);
              },
              (error) => {
                console.error('All location methods failed:', error);
                this.handleGeolocationError(error);
                resetButton();
              },
              cachedOptions
            );
          },
          mediumAccuracyOptions
        );
      },
      highAccuracyOptions
    );
  }

  private handleLocationSuccess(position: GeolocationPosition, resetButton: () => void) {
    const newPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    
    console.log('Successfully got user location:', newPosition);
    console.log('Location accuracy:', position.coords.accuracy, 'meters');
    this.currentPosition = newPosition;
    
    // Show success notification
    this.showLocationSuccess('📍 Found your location! Centering map and loading nearby restaurants...');
    
    if (this.map) {
      // Smooth pan to user location
      this.map.panTo(newPosition);
      this.map.setZoom(16); // Closer zoom for better detail
      
      // Remove existing user location marker
      if (this.userLocationMarker) {
        this.userLocationMarker.setMap(null);
      }
      
      // Add new user location marker with animation
      this.createUserLocationMarker();
      
      // Clear existing nearby restaurants
      this.realWorldMarkers.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      this.realWorldMarkers = [];
      
      // Search for nearby restaurants at new location
      console.log('Performing comprehensive search at user location:', newPosition);
      this.loadNearbyRestaurants();
    }
    
    // Reset button state
    resetButton();
  }

  private handleGeolocationError(error: GeolocationPositionError) {
    let message = '';
    switch(error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location access denied. Using Halifax as default location.';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable. Using Halifax as default location.';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out. Using Halifax as default location.';
        break;
      default:
        message = 'Unable to get location. Using Halifax as default location.';
        break;
    }
    
    console.log('Geolocation fallback:', message);
    this.showLocationError(message);
    this.useDefaultLocation();
  }

  private showLocationError(message: string) {
    // Create a simple toast-like notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 10001;
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      max-width: 350px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.parentElement.removeChild(notification);
      }
    }, 5000);
  }

  private showLocationSuccess(message: string) {
    // Create a success toast notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 10001;
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      max-width: 350px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.parentElement.removeChild(notification);
      }
    }, 4000);
  }

  refreshMap() {
    console.log('Refreshing map...');
    console.log('Current restaurants:', this.restaurants?.length || 0);
    console.log('Current markers:', this.markers?.length || 0);
    console.log('Current real world markers:', this.realWorldMarkers?.length || 0);
    
    // Clear and re-add DineBook restaurant markers
    this.updateRestaurantMarkers();
    
    // Reload nearby restaurants with enhanced search
    if (this.mapLoaded) {
      // Clear existing nearby markers
      this.realWorldMarkers.forEach((marker: any) => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      this.realWorldMarkers = [];
      
      // Reload with enhanced search strategies
      setTimeout(() => {
        this.loadNearbyRestaurants();
      }, 500);
    }
    
    // Trigger map resize to ensure proper display
    this.scheduleMapResize();
  }

  // Debug method to test coordinates
  testCoordinates() {
    const testRestaurant = {
      _id: 'test-1',
      name: 'Test Restaurant',
      cuisine: 'Italian',
      location: 'Halifax, NS',
      priceRange: 2,
      coordinates: {
        type: 'Point',
        coordinates: [-63.5752, 44.6488] as [number, number]
      }
    };
    
    console.log('Testing coordinates with:', testRestaurant);
    this.createAdvancedMarker(testRestaurant, '#FF0000', true);
  }

  // Helper method to format rating display with stars and number
  private formatRatingDisplay(restaurant: any): string {
    // Try to get rating from different possible properties
    const rating = restaurant.rating || restaurant.averageRating || restaurant.ratingAverage || 0;
    
    if (!rating || rating === 0) {
      return 'No rating yet';
    }
    
    const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    if (isNaN(numericRating)) {
      return 'No rating yet';
    }
    
    // Create star display
    const fullStars = Math.floor(numericRating);
    const hasHalfStar = numericRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsDisplay = '⭐'.repeat(fullStars);
    if (hasHalfStar) {
      starsDisplay += '✨'; // Half star
    }
    starsDisplay += '☆'.repeat(emptyStars);
    
    return `${starsDisplay} (${numericRating.toFixed(1)})`;
  }

  // Helper method to avoid marker overlap by adjusting position if needed
  private avoidMarkerOverlap(lat: number, lng: number, isDineBook: boolean): { lat: number, lng: number } {
    const minDistance = 0.0005; // Minimum distance between markers (~50 meters)
    let adjustedLat = lat;
    let adjustedLng = lng;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      let tooClose = false;
      
      // Check distance to all existing markers
      for (const existingPos of this.existingMarkerPositions) {
        const distance = this.calculateDistanceBetweenPoints(
          adjustedLat, adjustedLng, 
          existingPos.lat, existingPos.lng
        );
        
        if (distance < minDistance) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        // Position is good, record it and return
        this.existingMarkerPositions.push({ lat: adjustedLat, lng: adjustedLng, isDineBook });
        return { lat: adjustedLat, lng: adjustedLng };
      }
      
      // Adjust position in a spiral pattern
      const angle = (attempts * 60) * (Math.PI / 180); // 60 degree increments
      const radius = minDistance * (1 + attempts * 0.5);
      adjustedLat = lat + (radius * Math.cos(angle));
      adjustedLng = lng + (radius * Math.sin(angle));
      
      attempts++;
    }
    
    // If we couldn't find a good position, use the adjusted one anyway
    this.existingMarkerPositions.push({ lat: adjustedLat, lng: adjustedLng, isDineBook });
    return { lat: adjustedLat, lng: adjustedLng };
  }

  // Helper method to calculate distance between two points
  private calculateDistanceBetweenPoints(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
