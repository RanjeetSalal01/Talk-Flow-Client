import { Component, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AppService } from '../../../core/services/app.service';
import { API } from '../../../core/config/api';
import { Toast, ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  imports: [SharedModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  registerForm!: FormGroup;
  isSubmitted = signal(false);
  isLoading = signal(false);
  toggleEye: boolean = false;
  toggleConfirmEye: boolean = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private appService: AppService,
    private toast: ToastrService
  ) {}

  ngOnInit(): void {
    // Initialize the register form with email and password fields
    this.registerForm = this.fb.group(
      {
        username: new FormControl('', [Validators.required]),
        fullName: new FormControl('', [Validators.required]),
        email: new FormControl('', [
          Validators.required,
          Validators.email,
          Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'),
        ]),
        password: new FormControl('', [
          Validators.required,
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/),
        ]),
        confirmPassword: new FormControl('', [Validators.required]),
      },
      { validators: this.passwordMatchValidator },
    );

    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      this.registerForm.get('confirmPassword')?.updateValueAndValidity();
    });
  }

  get form() {
    return this.registerForm.controls;
  }

  toggleEyeIcon(): void {
    this.toggleEye = !this.toggleEye;
  }
  toggleConfirmEyeIcon(): void {
    this.toggleConfirmEye = !this.toggleConfirmEye;
  }

  redirectToLogin(): void {
    console.log('Navigating to login page');
    this.router.navigate(['/auth/login']);
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirm = form.get('confirmPassword');

    if (!confirm) return null;

    // If confirmPassword has required error, don't touch it
    if (confirm.errors && !confirm.errors['passwordMismatch']) {
      return null;
    }

    if (password !== confirm.value) {
      confirm.setErrors({ passwordMismatch: true });
    } else {
      confirm.setErrors(null);
    }

    return null;
  }

  handleSubmit(): void {
    this.isSubmitted.set(true);

    if (this.registerForm.invalid || this.isLoading()) return;

    this.isLoading.set(true);

    const payload = this.registerForm.getRawValue();

    this.appService.post(API.endPoint.register, payload).subscribe({
      next: (res:any) => {
        this.router.navigate(['/auth/login']);
        this.isLoading.set(false);
        this.toast.success('Registration successful');
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Registration failed');
        this.isLoading.set(false);
      },
    });
  }
}
