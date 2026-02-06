import { Component, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [SharedModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  loginForm!: FormGroup;
  isSubmitted = signal(false);
  toggleEye: boolean = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    // Initialize the login form with email and password fields
    this.loginForm = this.fb.group({
      email: new FormControl('', [
        Validators.required,
        Validators.email,
        Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'),
      ]),
      password: new FormControl('', [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/),
      ]),
    });
  }

  get form() {
    return this.loginForm.controls;
  }

  toggleEyeIcon(): void {
    this.toggleEye = !this.toggleEye;
  }

  navigateToRegister(): void {
    console.log('Navigating to register page');
    this.router.navigate(['/auth/register']);
  }

  handleSubmit(): void {
    // set the submitted signal to true to trigger validation messages
    console.log('Form submitted with values:', this.loginForm);
    this.isSubmitted.set(true);

    if (this.loginForm.invalid) {
      return;
    }
  }
}
