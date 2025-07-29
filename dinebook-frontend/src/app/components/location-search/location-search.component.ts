import { 
  Component, 
  OnInit, 
  AfterViewInit,
  Output, 
  EventEmitter, 
  ViewChild, 
  ElementRef,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { GoogleMapsService } from '../../services/google-maps.service';

declare var google: any;

interface PlaceResult {
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  placeId: string;
}

@Component({
  selector: 'app-location-search',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    FormsModule
  ],
  template: `
    <div class="location-search-container">
      <mat-form-field appearance="outline" class="location-search-field">
        <mat-label>{{ label }}</mat-label>
        <input 
          matInput 
          #searchInput
          [(ngModel)]="searchValue"
          [placeholder]="placeholder"
          type="text"
          (focus)="onInputFocus()"
        >
        <mat-icon matSuffix class="search-icon">{{ icon }}</mat-icon>
      </mat-form-field>
      
      <button 
        mat-icon-button 
        type="button"
        class="current-location-btn"
        (click)="useCurrentLocation()"
        [disabled]="loading"
        matTooltip="Use current location"
      >
        <mat-icon>{{ loading ? 'hourglass_empty' : 'my_location' }}</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .location-search-container {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      width: 100%;
    }

    .location-search-field {
      flex: 1;
    }

    .current-location-btn {
      margin-top: 8px;
      color: #FF5722;
      
      &:hover {
        background-color: rgba(255, 87, 34, 0.04);
      }
      
      &:disabled {
        color: #ccc;
      }
    }

    .search-icon {
      color: #64748b;
    }
  `]
})
export class LocationSearchComponent implements OnInit, AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  
  @Input() label: string = 'Search Location';
  @Input() placeholder: string = 'Enter address or city...';
  @Input() icon: string = 'search';
  @Input() initialValue: string = '';
  
  @Output() locationSelected = new EventEmitter<PlaceResult>();
  @Output() currentLocationRequested = new EventEmitter<{lat: number, lng: number}>();

  searchValue: string = '';
  loading: boolean = false;
  private autocomplete: any;

  constructor(private googleMapsService: GoogleMapsService) {}

  ngOnInit() {
    this.searchValue = this.initialValue;
  }

  ngAfterViewInit() {
    this.initializeAutocomplete();
  }

  private async initializeAutocomplete() {
    try {
      // Only initialize autocomplete if Google Maps is available
      if (this.googleMapsService) {
        await this.googleMapsService.loadGoogleMaps();
        
        this.autocomplete = new google.maps.places.Autocomplete(
          this.searchInput.nativeElement,
          {
            types: ['(cities)'],
            fields: ['place_id', 'formatted_address', 'geometry']
          }
        );

        this.autocomplete.addListener('place_changed', () => {
          const place = this.autocomplete.getPlace();
          
          if (place.geometry && place.geometry.location) {
            const result: PlaceResult = {
              address: place.formatted_address,
              location: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              },
              placeId: place.place_id
            };
            
            this.locationSelected.emit(result);
          }
        });
      }
    } catch (error) {
      console.warn('Google Places autocomplete not available:', error);
      // Fallback to basic text input
    }
  }

  onInputFocus() {
    // Clear the field to show suggestions
    if (this.searchValue) {
      this.searchInput.nativeElement.select();
    }
  }

  async useCurrentLocation() {
    try {
      this.loading = true;
      
      // Try to get current location using browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            // Update the input with "Current Location"
            this.searchValue = 'Current Location';
            
            this.currentLocationRequested.emit(location);
            this.locationSelected.emit({
              address: 'Current Location',
              location,
              placeId: 'current-location'
            });
            
            this.loading = false;
          },
          (error) => {
            console.error('Error getting current location:', error);
            this.loading = false;
          }
        );
      } else {
        // Fallback to Google Maps geolocation if available
        if (this.googleMapsService) {
          const location = await this.googleMapsService.getCurrentLocation();
          
          // Update the input with "Current Location"
          this.searchValue = 'Current Location';
          
          this.currentLocationRequested.emit(location);
          this.locationSelected.emit({
            address: 'Current Location',
            location,
            placeId: 'current-location'
          });
        }
      }
      
    } catch (error) {
      console.error('Error getting current location:', error);
      // You might want to show an error message to the user
    } finally {
      this.loading = false;
    }
  }

  clearLocation() {
    this.searchValue = '';
    this.locationSelected.emit({
      address: '',
      location: { lat: 0, lng: 0 },
      placeId: ''
    });
  }
}
