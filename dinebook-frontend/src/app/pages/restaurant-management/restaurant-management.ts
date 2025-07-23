import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
        MatTooltipModule
    ],
    templateUrl: './restaurant-management.html',
    styleUrl: './restaurant-management.scss'
})
export class RestaurantManagementComponent implements OnInit {
    restaurant: Restaurant | null = null;
    restaurantForm: FormGroup;
    loading = true;
    saving = false;
    error: string | null = null;

    cuisineTypes = [
        'Italian', 'Indian', 'Chinese', 'Mexican', 'American',
        'Thai', 'Japanese', 'Mediterranean', 'French', 'Other'
    ];

    priceRanges = [
        { value: 1, label: '$ - Budget Friendly' },
        { value: 2, label: '$$ - Moderate' },
        { value: 3, label: '$$$ - Expensive' },
        { value: 4, label: '$$$$ - Very Expensive' }
    ];

    daysOfWeek = [
        'monday', 'tuesday', 'wednesday', 'thursday',
        'friday', 'saturday', 'sunday'
    ];

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
            priceRange: [1, [Validators.required, Validators.min(1), Validators.max(4)]],
            address: this.fb.group({
                street: [''],
                city: [''],
                province: [''],
                postalCode: ['']
            }),
            openingHours: this.fb.group({
                monday: this.fb.group({ open: [''], close: [''] }),
                tuesday: this.fb.group({ open: [''], close: [''] }),
                wednesday: this.fb.group({ open: [''], close: [''] }),
                thursday: this.fb.group({ open: [''], close: [''] }),
                friday: this.fb.group({ open: [''], close: [''] }),
                saturday: this.fb.group({ open: [''], close: [''] }),
                sunday: this.fb.group({ open: [''], close: [''] })
            })
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
            } else {
                this.error = 'No restaurant found. Please create a restaurant first.';
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
            address: {
                street: (this.restaurant as any).address?.street || '',
                city: (this.restaurant as any).address?.city || '',
                province: (this.restaurant as any).address?.province || '',
                postalCode: (this.restaurant as any).address?.postalCode || ''
            }
        });

        // Populate opening hours
        const openingHours = (this.restaurant as any).openingHours || {};
        this.daysOfWeek.forEach(day => {
            const hours = openingHours[day];
            if (hours) {
                this.restaurantForm.get(`openingHours.${day}`)?.patchValue({
                    open: hours.open || '',
                    close: hours.close || ''
                });
            }
        });
    }

    async onSubmit() {
        if (this.restaurantForm.valid && this.restaurant) {
            try {
                this.saving = true;

                const formData = this.restaurantForm.value;

                // Clean up opening hours - remove empty entries
                Object.keys(formData.openingHours).forEach(day => {
                    const hours = formData.openingHours[day];
                    if (!hours.open || !hours.close) {
                        delete formData.openingHours[day];
                    }
                });

                const response = await this.apiService.updateRestaurant(
                    this.restaurant._id,
                    formData
                ).toPromise();

                this.snackBar.open('Restaurant updated successfully!', 'Close', {
                    duration: 3000,
                    panelClass: ['success-snackbar']
                });

                // Update local restaurant data
                this.restaurant = response.restaurant;

            } catch (error: any) {
                console.error('Error updating restaurant:', error);
                this.snackBar.open(
                    error.error?.error || 'Failed to update restaurant',
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

    copyHours(sourceDay: string) {
        const sourceHours = this.restaurantForm.get(`openingHours.${sourceDay}`)?.value;
        if (sourceHours && sourceHours.open && sourceHours.close) {
            this.daysOfWeek.forEach(day => {
                if (day !== sourceDay) {
                    this.restaurantForm.get(`openingHours.${day}`)?.patchValue(sourceHours);
                }
            });
        }
    }

    clearHours(day: string) {
        this.restaurantForm.get(`openingHours.${day}`)?.patchValue({
            open: '',
            close: ''
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
}
