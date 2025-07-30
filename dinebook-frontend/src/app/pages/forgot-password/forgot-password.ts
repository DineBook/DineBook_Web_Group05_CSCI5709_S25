import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { MatButtonModule } from "@angular/material/button"
import { MatFormFieldModule } from "@angular/material/form-field"
import { MatInputModule } from "@angular/material/input"
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner"
import { MatIconModule } from "@angular/material/icon"
import { ApiService } from "../../services/api.service"
import { Router, RouterLink } from "@angular/router"

@Component({
    selector: "app-forgot-password",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatIconModule,
        RouterLink,
    ],
    templateUrl: "./forgot-password.html",
    styleUrl: "./forgot-password.scss",
})
export class ForgotPasswordComponent {
    forgotPasswordForm: FormGroup
    message = ""
    isLoading = false
    isSuccess = false

    constructor(
        private fb: FormBuilder,
        private apiService: ApiService,
        private router: Router,
    ) {
        this.forgotPasswordForm = this.fb.group({
            email: [
                "",
                [
                    Validators.required,
                    Validators.email,
                ],
            ],
        })
    }

    getEmailErrorId(): string {
        return "email-error-" + Math.random().toString(36).substr(2, 9)
    }

    onSubmit() {
        if (this.forgotPasswordForm.valid) {
            this.isLoading = true
            this.message = ""
            this.apiService.forgotPassword(this.forgotPasswordForm.value).subscribe({
                next: (response) => {
                    this.isLoading = false
                    this.isSuccess = true
                    this.message = response.message || "If an account with that email exists, we have sent a password reset link."
                },
                error: (err) => {
                    this.isLoading = false
                    this.isSuccess = false
                    this.message = err.error.message || "An error occurred. Please try again."
                },
            })
        }
    }
}
