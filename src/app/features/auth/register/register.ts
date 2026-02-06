import { Component, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-register',
  imports: [SharedModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  registerForm!: FormGroup;
  isSubmitted = signal(false);
  toggleEye: boolean = false;
  toggleConfirmEye: boolean = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    // Initialize the register form with email and password fields
    this.registerForm = this.fb.group(
      {
        username: new FormControl('', [Validators.required]),
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
    // set the submitted signal to true to trigger validation messages
    console.log('Form submitted with values:', this.registerForm);
    this.isSubmitted.set(true);

    if (this.registerForm.invalid) {
      return;
    }
  }
}
