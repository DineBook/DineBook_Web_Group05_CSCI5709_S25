import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { MatButtonModule } from "@angular/material/button"
import { MatFormFieldModule } from "@angular/material/form-field"
import { MatInputModule } from "@angular/material/input"
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner"
import { MatIconModule } from "@angular/material/icon"
import { ApiService } from "../../services/api.service"
import { Router, RouterLink, ActivatedRoute } from "@angular/router"

@Component({
    selector: "app-reset-password",
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
    templateUrl: "./reset-password.html",
    styleUrl: "./reset-password.scss",
})
export class ResetPasswordComponent implements OnInit {
    resetPasswordForm: FormGroup
    message = ""
    isLoading = false
    isSuccess = false
    hidePassword = true
    hideConfirmPassword = true
    token = ""

    constructor(
        private fb: FormBuilder,
        private apiService: ApiService,
        private router: Router,
        private route: ActivatedRoute,
    ) {
        this.resetPasswordForm = this.fb.group({
            password: [
                "",
                [
                    Validators.required,
                    Validators.minLength(8),
                    Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=]{8,}$/),
                ],
            ],
            confirmPassword: [
                "",
                [Validators.required],
            ],
        }, { validators: this.passwordMatchValidator })
    }

    ngOnInit() {
        this.token = this.route.snapshot.queryParamMap.get("token") || ""
        if (!this.token) {
            this.message = "Invalid or missing reset token."
            this.isSuccess = false
        }
    }

    passwordMatchValidator(form: FormGroup) {
        const password = form.get('password')
        const confirmPassword = form.get('confirmPassword')

        if (password && confirmPassword && password.value !== confirmPassword.value) {
            confirmPassword.setErrors({ passwordMismatch: true })
        } else if (confirmPassword?.hasError('passwordMismatch')) {
            delete confirmPassword.errors?.['passwordMismatch']
            if (Object.keys(confirmPassword.errors || {}).length === 0) {
                confirmPassword.setErrors(null)
            }
        }
        return null
    }

    togglePasswordVisibility() {
        this.hidePassword = !this.hidePassword
    }

    toggleConfirmPasswordVisibility() {
        this.hideConfirmPassword = !this.hideConfirmPassword
    }

    getPasswordErrorId(): string {
        return "password-error-" + Math.random().toString(36).substr(2, 9)
    }

    getConfirmPasswordErrorId(): string {
        return "confirm-password-error-" + Math.random().toString(36).substr(2, 9)
    }

    onSubmit() {
        if (this.resetPasswordForm.valid && this.token) {
            this.isLoading = true
            this.message = ""

            const data = {
                token: this.token,
                newPassword: this.resetPasswordForm.get('password')?.value
            }

            this.apiService.resetPassword(data).subscribe({
                next: (response: any) => {
                    this.isLoading = false
                    this.isSuccess = true
                    this.message = response.message || "Your password has been reset successfully."
                    setTimeout(() => this.router.navigate(["/sign-in"]), 3000)
                },
                error: (err: any) => {
                    this.isLoading = false
                    this.isSuccess = false
                    this.message = err.error.message || "An error occurred. Please try again."
                },
            })
        }
    }
}
