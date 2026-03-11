import { Component, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../../shared/shared.module';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AppService } from '../../../core/services/app.service';
import { take } from 'rxjs/operators';
import { API } from '../../../core/config/api';
import { ToastrService } from 'ngx-toastr';
import { SocketService } from '../../../core/services/socket.service';
@Component({
  selector: 'app-login',
  imports: [SharedModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  loginForm!: FormGroup;
  isSubmitted = signal(false);
  isLoading = signal(false);
  toggleEye: boolean = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private appService: AppService,
    private toast: ToastrService,
    private socket: SocketService
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
    this.router.navigate(['/auth/register']);
  }

  handleSubmit(): void {
    this.isSubmitted.set(true);

    if (this.loginForm.invalid || this.isLoading()) return;

    this.isLoading.set(true);

    const payload = this.loginForm.getRawValue();

    this.appService.post<{ token: string }>(API.endPoint.login, payload).subscribe({
      next: (res:any) => {
        this.router.navigate(['/chats']);
        this.isLoading.set(false);
        this.toast.success('Login successful');
        this.socket.connect(res.userId);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Login failed');
        this.isLoading.set(false);
      },
    });
  }
}
