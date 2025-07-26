import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './menu-management.html',
  styleUrls: ['./menu-management.scss']
})
export class MenuManagementComponent implements OnInit {
  menuForm: FormGroup;
  menuItems: any[] = [];
  filteredMenuItems: any[] = [];
  categories = ['Appetizers', 'Mains', 'Desserts', 'Beverages', 'Salads', 'Soups', 'Specials', 'Other'];
  selectedCategory = '';
  restaurant: any = null;
  loading = false;
  saving = false;
  showForm = false;
  isEditing = false;
  editingItemId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.menuForm = this.createMenuForm();
  }

  ngOnInit() {
    this.loadRestaurantAndMenu();
  }

  createMenuForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(300)]],
      price: ['', [Validators.required, Validators.min(0.01)]],
      category: ['', Validators.required],
      imageUrl: [''],
      isVegetarian: [false],
      isVegan: [false],
      isGlutenFree: [false],
      isAvailable: [true]
    });
  }

  async loadRestaurantAndMenu() {
    this.loading = true;
    try {
      // First get the restaurant
      console.log('Loading restaurants...');
      const response = await this.apiService.getMyRestaurants().toPromise();
      console.log('Restaurants response:', response);
      
      // Check if response has restaurants array
      const restaurants = response?.restaurants || response;
      console.log('Restaurants array:', restaurants);
      
      if (restaurants && Array.isArray(restaurants) && restaurants.length > 0) {
        this.restaurant = restaurants[0];
        console.log('Restaurant set to:', this.restaurant);
        await this.loadMenuItems();
      } else {
        console.log('No restaurants found for this user');
        this.restaurant = null;
      }
    } catch (error) {
      console.error('Error loading restaurant:', error);
      this.restaurant = null;
    } finally {
      this.loading = false;
    }
  }

  async loadMenuItems() {
    if (!this.restaurant) {
      console.log('No restaurant available for loading menu items');
      return;
    }
    
    try {
      console.log('Loading menu items for restaurant:', this.restaurant._id);
      const response = await this.apiService.getMenuItems(this.restaurant._id).toPromise();
      console.log('Menu items response:', response);
      
      this.menuItems = response?.menuItems || response || [];
      console.log('Menu items loaded:', this.menuItems);
      
      this.filterMenuItems();
    } catch (error) {
      console.error('Error loading menu items:', error);
      this.menuItems = [];
    }
  }

  filterMenuItems() {
    if (!this.selectedCategory) {
      this.filteredMenuItems = this.menuItems;
    } else {
      this.filteredMenuItems = this.menuItems.filter(
        item => item.category === this.selectedCategory
      );
    }
  }

  onCategoryChange() {
    this.filterMenuItems();
  }

  showAddForm() {
    console.log('showAddForm called, current showForm value:', this.showForm);
    this.showForm = true;
    this.isEditing = false;
    this.editingItemId = null;
    this.menuForm.reset({
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      isAvailable: true
    });
    console.log('showForm set to:', this.showForm);
  }

  editItem(item: any) {
    console.log('editItem called with:', item);
    this.showForm = true;
    this.isEditing = true;
    this.editingItemId = item._id;
    this.menuForm.patchValue({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      imageUrl: item.imageUrl,
      isVegetarian: item.isVegetarian,
      isVegan: item.isVegan,
      isGlutenFree: item.isGlutenFree,
      isAvailable: item.isAvailable
    });
    console.log('Form populated for editing');
  }

  async saveItem() {
    console.log('saveItem called');
    console.log('Form valid:', this.menuForm.valid);
    console.log('Restaurant:', this.restaurant);
    console.log('Form value:', this.menuForm.value);
    
    if (this.menuForm.invalid) {
      console.log('Form is invalid');
      alert('Please fill in all required fields correctly.');
      return;
    }

    if (!this.restaurant) {
      console.log('No restaurant found');
      alert('No restaurant found. Please create a restaurant first.');
      return;
    }

    this.saving = true;
    try {
      const formData = this.menuForm.value;
      
      if (this.isEditing && this.editingItemId) {
        console.log('Updating item:', this.editingItemId);
        const result = await this.apiService.updateMenuItem(this.restaurant._id, this.editingItemId, formData).toPromise();
        console.log('Update result:', result);
      } else {
        console.log('Creating new item with data:', formData);
        const result = await this.apiService.createMenuItem(this.restaurant._id, formData).toPromise();
        console.log('Create result:', result);
      }
      
      await this.loadMenuItems();
      this.cancelForm();
      console.log('Item saved successfully');
      
      const action = this.isEditing ? 'updated' : 'created';
      alert(`Menu item ${action} successfully!`);
    } catch (error: any) {
      console.error('Error saving menu item:', error);
      
      // Show more specific error message
      let errorMessage = 'Failed to save menu item. ';
      if (error.error?.error) {
        errorMessage += error.error.error;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      alert(errorMessage);
    } finally {
      this.saving = false;
    }
  }

  async deleteItem(item: any) {
    console.log('deleteItem called with:', item);
    
    if (!this.restaurant) {
      alert('No restaurant found');
      return;
    }

    const confirmDelete = confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`);
    if (!confirmDelete) return;
    
    try {
      console.log('Deleting item:', item._id, 'from restaurant:', this.restaurant._id);
      const result = await this.apiService.deleteMenuItem(this.restaurant._id, item._id).toPromise();
      console.log('Delete result:', result);
      
      // Hide form and reset state
      this.showForm = false;
      this.isEditing = false;
      this.editingItemId = null;
      
      await this.loadMenuItems();
      alert('Menu item deleted successfully!');
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Failed to delete menu item. Please try again.');
    }
  }

  async toggleAvailability(item: any) {
    if (!this.restaurant) {
      alert('No restaurant found');
      return;
    }

    try {
      console.log('Toggling availability for item:', item._id);
      const updatedData = { ...item, isAvailable: !item.isAvailable };
      const result = await this.apiService.updateMenuItem(this.restaurant._id, item._id, updatedData).toPromise();
      console.log('Toggle availability result:', result);
      
      await this.loadMenuItems();
      const status = updatedData.isAvailable ? 'available' : 'unavailable';
      alert(`Menu item marked as ${status}!`);
    } catch (error: any) {
      console.error('Error toggling availability:', error);
      
      let errorMessage = 'Failed to update item availability. ';
      if (error.error?.error) {
        errorMessage += error.error.error;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      alert(errorMessage);
    }
  }

  cancelForm() {
    this.showForm = false;
    this.isEditing = false;
    this.editingItemId = null;
    this.menuForm.reset();
  }

  hasAnyTag(item: any): boolean {
    return item.isVegetarian || item.isVegan || item.isGlutenFree;
  }

  handleImageError(event: any) {
    event.target.style.display = 'none';
    event.target.parentElement.classList.add('placeholder');
  }

  getItemsByCategory(category: string) {
    return this.menuItems.filter(item => item.category === category);
  }
}
