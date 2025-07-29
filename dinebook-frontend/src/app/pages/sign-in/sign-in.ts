import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { MatButtonModule } from "@angular/material/button"
import { MatFormFieldModule } from "@angular/material/form-field"
import { MatInputModule } from "@angular/material/input"
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner"
import { MatIconModule } from "@angular/material/icon"
import { MatCheckboxModule } from "@angular/material/checkbox"
import { ApiService } from "../../services/api.service"
import { Router, RouterLink } from "@angular/router"
import { AuthService } from "../../services/auth.service"

@Component({
  selector: "app-sign-in",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCheckboxModule,
    RouterLink,
  ],
  templateUrl: "./sign-in.html",
  styleUrl: "./sign-in.scss",
})
export class SignInComponent {
  loginForm: FormGroup
  errorMessage = ""
  isLoading = false
  hidePassword = true

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private authService: AuthService,
  ) {
    this.loginForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", Validators.required],
    })
  }

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword
  }

  getEmailErrorId(): string {
    return "email-error-" + Math.random().toString(36).substr(2, 9)
  }

  getPasswordErrorId(): string {
    return "password-error-" + Math.random().toString(36).substr(2, 9)
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true
      this.errorMessage = ""
      this.apiService.login(this.loginForm.value).subscribe({
        next: (response) => {
          localStorage.setItem("token", response.token)
          localStorage.setItem("user", JSON.stringify(response.user))
          this.authService.login()
          this.isLoading = false

          const userRole = response.user?.role
          if (userRole === 'customer') {
            this.router.navigate(["/dashboard"])
          } else if (userRole === 'owner') {
            this.router.navigate(["/owner/dashboard"])
          } else {
            this.router.navigate(["/dashboard"])
          }
        },
        error: (err) => {
          this.isLoading = false
          this.errorMessage = err.error.message || "Login failed"
        },
      })
    }
  }
}
