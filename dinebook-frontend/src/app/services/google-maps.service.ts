import { Injectable } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';
import { environment } from '../../environments/environment';

declare var google: any;
declare var window: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private loader: Loader | null = null;
  private map: any = null;
  private markers: any[] = [];
  private infoWindow: any = null;

  constructor() {
    // Check if Google Maps is already loaded via script tag
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      console.log('Google Maps already loaded via script tag');
      return;
    }
    
    // Fallback to loader if not loaded via script tag
    if (environment.googleMapsApiKey && environment.googleMapsApiKey !== 'AIzaSyDummyKeyForDevelopment') {
      this.loader = new Loader({
        apiKey: environment.googleMapsApiKey,
        version: 'weekly',
        libraries: ['places', 'geometry']
      });
    } else {
      console.warn('Google Maps API key not configured. Maps functionality will be limited.');
    }
  }

  async loadGoogleMaps(): Promise<any> {
    // Check if already loaded via script tag
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      return Promise.resolve(window.google.maps);
    }
    
    // Wait for script tag loading
    if (typeof window !== 'undefined') {
      return new Promise((resolve, reject) => {
        if (window.googleMapsLoaded) {
          resolve(window.google.maps);
          return;
        }
        
        const timeout = setTimeout(() => {
          reject(new Error('Google Maps loading timeout'));
        }, 10000);
        
        window.addEventListener('google-maps-loaded', () => {
          clearTimeout(timeout);
          resolve(window.google.maps);
        });
      });
    }
    
    // Fallback to loader
    if (!this.loader) {
      throw new Error('Google Maps API key not configured');
    }
    return this.loader.load();
  }

  async initMap(element: HTMLElement, center: { lat: number; lng: number }, zoom: number = 12): Promise<any> {
    await this.loadGoogleMaps();
    
    this.map = new google.maps.Map(element, {
      center,
      zoom,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true
    });

    this.infoWindow = new google.maps.InfoWindow();
    return this.map;
  }

  addRestaurantMarkers(restaurants: any[], onMarkerClick?: (restaurant: any) => void): void {
    if (!this.map) return;

    // Clear existing markers
    this.clearMarkers();

    restaurants.forEach(restaurant => {
      if (restaurant.coordinates?.latitude && restaurant.coordinates?.longitude) {
        const marker = new google.maps.Marker({
          position: {
            lat: restaurant.coordinates.latitude,
            lng: restaurant.coordinates.longitude
          },
          map: this.map,
          title: restaurant.name,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="#FF5722" stroke="#fff" stroke-width="2"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">🍽️</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(16, 16)
          }
        });

        // Add click listener
        marker.addListener('click', () => {
          if (this.infoWindow && this.map) {
            const content = this.createInfoWindowContent(restaurant);
            this.infoWindow.setContent(content);
            this.infoWindow.open(this.map, marker);
            
            if (onMarkerClick) {
              onMarkerClick(restaurant);
            }
          }
        });

        this.markers.push(marker);
      }
    });

    // Fit map to show all markers
    if (this.markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      this.markers.forEach(marker => {
        if (marker.getPosition()) {
          bounds.extend(marker.getPosition()!);
        }
      });
      this.map.fitBounds(bounds);
      
      // Ensure minimum zoom level
      const listener = google.maps.event.addListener(this.map, 'idle', () => {
        if (this.map!.getZoom()! > 15) {
          this.map!.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }

  addUserLocationMarker(position: { lat: number; lng: number }): void {
    if (!this.map) return;

    new google.maps.Marker({
      position,
      map: this.map,
      title: 'Your Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="#4285F4" stroke="#fff" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="#fff"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(24, 24),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(12, 12)
      }
    });
  }

  private createInfoWindowContent(restaurant: any): string {
    const stars = this.generateStarsHtml(restaurant.averageRating || restaurant.rating || 0);
    const distance = restaurant.distanceKm ? `${restaurant.distanceKm} km away` : '';
    
    return `
      <div style="max-width: 250px; padding: 10px;">
        <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">${restaurant.name}</h3>
        <div style="margin: 4px 0;">
          <span style="color: #FF5722; font-size: 14px;">${stars}</span>
          <span style="color: #666; font-size: 12px; margin-left: 5px;">(${restaurant.averageRating || restaurant.rating || 0})</span>
        </div>
        <p style="margin: 4px 0; color: #666; font-size: 12px;"><strong>Cuisine:</strong> ${restaurant.cuisine}</p>
        <p style="margin: 4px 0; color: #666; font-size: 12px;"><strong>Location:</strong> ${restaurant.location}</p>
        ${distance ? `<p style="margin: 4px 0; color: #666; font-size: 12px;"><strong>Distance:</strong> ${distance}</p>` : ''}
        <button 
          onclick="window.viewRestaurantDetails('${restaurant._id}')" 
          style="
            background: #FF5722; 
            color: white; 
            border: none; 
            padding: 6px 12px; 
            border-radius: 4px; 
            cursor: pointer;
            font-size: 12px;
            margin-top: 8px;
          "
        >
          View Details
        </button>
      </div>
    `;
  }

  private generateStarsHtml(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';

    for (let i = 0; i < fullStars; i++) {
      stars += '★';
    }
    if (hasHalfStar) {
      stars += '☆';
    }
    while (stars.length < 5) {
      stars += '☆';
    }

    return stars;
  }

  clearMarkers(): void {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
  }

  getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  async searchPlaces(query: string): Promise<any[]> {
    if (!this.map) throw new Error('Map not initialized');

    await this.loadGoogleMaps();
    
    return new Promise((resolve, reject) => {
      const service = new google.maps.places.PlacesService(this.map!);
      const request: any = {
        query,
        fields: ['place_id', 'name', 'geometry', 'formatted_address']
      };

      service.textSearch(request, (results: any, status: any) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else {
          reject(new Error('Places search failed'));
        }
      });
    });
  }

  destroy(): void {
    this.clearMarkers();
    this.map = null;
    this.infoWindow = null;
  }
}
