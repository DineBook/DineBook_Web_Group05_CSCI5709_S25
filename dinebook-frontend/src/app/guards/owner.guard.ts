import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class OwnerGuard implements CanActivate {

    constructor(private authService: AuthService, private router: Router) { }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): boolean {
        if (this.authService.isLoggedIn && this.authService.isOwner()) {
            return true;
        } else {
            // Not logged in or not an owner, redirect to sign-in
            this.router.navigate(['/sign-in'], { queryParams: { returnUrl: state.url } });
            return false;
        }
    }
}
