import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class PublicGuard implements CanActivate {

    constructor(private authService: AuthService, private router: Router) { }

    canActivate(): boolean {
        if (!this.authService.isLoggedIn) {
            return true;
        } else if (this.authService.isLoggedIn && this.authService.isOwner()) {
            this.router.navigate(['/owner/dashboard']);
            return false;
        } else if (this.authService.isLoggedIn && this.authService.isCustomer()) {
            this.router.navigate(['/dashboard']);
            return false;
        } else {
            this.router.navigate(['/']);
            return false;
        }
    }
}
