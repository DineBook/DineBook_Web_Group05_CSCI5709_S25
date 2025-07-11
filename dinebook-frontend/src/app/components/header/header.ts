import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, MatButtonModule, CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent {
  constructor(public authService: AuthService) { }

  get isOwner(): boolean {
    return this.authService.isOwner();
  }

  get isCustomer(): boolean {
    return this.authService.isCustomer();
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  // Observable versions for reactive updates
  get isLoggedIn$(): Observable<boolean> {
    return this.authService.isLoggedIn$;
  }

  get isOwner$(): Observable<boolean> {
    return this.authService.isLoggedIn$.pipe(
      map(() => this.authService.isOwner())
    );
  }

  get isCustomer$(): Observable<boolean> {
    return this.authService.isLoggedIn$.pipe(
      map(() => this.authService.isCustomer())
    );
  }
}