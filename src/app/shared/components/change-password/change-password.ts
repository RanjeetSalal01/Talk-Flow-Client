import { Component } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { API } from '../../../core/config/api';
import { AppService } from '../../../core/services/app.service';
import { AuthService } from '../../../core/services/auth.service';
import { SocketService } from '../../../core/services/socket.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-change-password',
  imports: [SharedModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
})
export class ChangePassword {
  saving = false;
  showCurrent = false;
  showNew = false;
  showConfirm = false;

  form = new FormGroup(
    {
      currentPassword: new FormControl('', Validators.required),
      newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
      confirmPassword: new FormControl('', Validators.required),
    },
    {
      validators: (c: AbstractControl) =>
        c.get('newPassword')?.value === c.get('confirmPassword')?.value ? null : { mismatch: true },
    },
  );

  constructor(
    private ref: MatDialogRef<ChangePassword>,
    private app: AppService,
    private toast: ToastrService,
    private router: Router,
  ) {}

  get currentIcon() {
    return this.showCurrent ? 'eye-off' : 'eye';
  }
  get newIcon() {
    return this.showNew ? 'eye-off' : 'eye';
  }
  get confirmIcon() {
    return this.showConfirm ? 'eye-off' : 'eye';
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.app
      .patch(API.endPoint.changePassword, {
        currentPassword: this.form.value.currentPassword,
        newPassword: this.form.value.newPassword,
      })
      .subscribe({
        next: () => {
          this.ref.close();
          this.router.navigate(['/auth/login']);
          this.toast.success('Password changed successfully');
        },
        error: (err) => {
          this.toast.error(err.error?.message ?? 'Something went wrong');
          this.saving = false;
        },
      });
  }

  close(): void {
    this.ref.close();
  }
}
