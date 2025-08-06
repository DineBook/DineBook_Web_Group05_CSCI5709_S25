import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing';
import { PublicGuard } from './guards/public.guard';
import { OwnerGuard } from './guards/owner.guard';
import { CustomerGuard } from './guards/customer.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: 'landing', component: LandingComponent },
  
  // Authentication routes - Lazy Loaded
  { 
    path: 'sign-in', 
    loadComponent: () => import('./pages/sign-in/sign-in').then(m => m.SignInComponent), 
    canActivate: [PublicGuard] 
  },
  { 
    path: 'sign-up', 
    loadComponent: () => import('./pages/sign-up/sign-up').then(m => m.SignUpComponent), 
    canActivate: [PublicGuard] 
  },
  { 
    path: 'verify', 
    loadComponent: () => import('./pages/verify/verify').then(m => m.VerifyComponent) 
  },
  { 
    path: 'forgot-password', 
    loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent), 
    canActivate: [PublicGuard] 
  },
  { 
    path: 'reset-password', 
    loadComponent: () => import('./pages/reset-password/reset-password').then(m => m.ResetPasswordComponent), 
    canActivate: [PublicGuard] 
  },
  
  // Owner routes - Lazy Loaded
  { 
    path: 'owner/dashboard', 
    loadComponent: () => import('./pages/owner-dashboard/owner-dashboard').then(m => m.OwnerDashboardComponent), 
    canActivate: [OwnerGuard] 
  },
  { 
    path: 'owner/restaurant', 
    loadComponent: () => import('./pages/restaurant-management/restaurant-management').then(m => m.RestaurantManagementComponent), 
    canActivate: [OwnerGuard] 
  },
  { 
    path: 'owner/menu', 
    loadComponent: () => import('./pages/menu-management/menu-management').then(m => m.MenuManagementComponent), 
    canActivate: [OwnerGuard] 
  },
  { 
    path: 'owner/bookings', 
    loadComponent: () => import('./pages/owner-bookings/owner-bookings').then(m => m.OwnerBookingsComponent), 
    canActivate: [OwnerGuard] 
  },
  
  // Customer routes - Lazy Loaded
  { 
    path: 'book-table', 
    loadComponent: () => import('./pages/book-table/book-table').then(m => m.BookTableComponent), 
    canActivate: [CustomerGuard] 
  },
  { 
    path: 'book-table/:restaurantId', 
    loadComponent: () => import('./pages/book-table/book-table').then(m => m.BookTableComponent), 
    canActivate: [CustomerGuard] 
  },
  { 
    path: 'my-bookings', 
    loadComponent: () => import('./pages/my-bookings/my-bookings').then(m => m.MyBookingsComponent), 
    canActivate: [CustomerGuard] 
  },
  { 
    path: 'my-reviews', 
    loadComponent: () => import('./pages/my-reviews/my-reviews').then(m => m.MyReviewsComponent), 
    canActivate: [CustomerGuard] 
  },
  { 
    path: 'booking-confirmation/:bookingId', 
    loadComponent: () => import('./pages/booking-confirmation/booking-confirmation').then(m => m.BookingConfirmationComponent), 
    canActivate: [CustomerGuard] 
  },
  { 
    path: 'favorites', 
    loadComponent: () => import('./pages/favorites/favorites-page.component').then(m => m.FavoritesPageComponent), 
    canActivate: [CustomerGuard] 
  },
  
  // Public routes - Lazy Loaded
  { 
    path: 'restaurants', 
    loadComponent: () => import('./pages/restaurants/restaurants').then(m => m.RestaurantsComponent) 
  },
  { 
    path: 'restaurants/:id', 
    loadComponent: () => import('./pages/restaurant-detail/restaurant-detail').then(m => m.RestaurantDetailComponent) 
  },
  { 
    path: 'about', 
    loadComponent: () => import('./pages/about/about').then(m => m.AboutComponent) 
  },
  { 
    path: 'contact', 
    loadComponent: () => import('./pages/contact/contact').then(m => m.ContactComponent) 
  },
  
  { path: '**', redirectTo: '/landing' }
];