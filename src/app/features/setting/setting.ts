import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { API } from '../../core/config/api';
import { AppService } from '../../core/services/app.service';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { SharedModule } from '../../shared/shared.module';
import { Logout } from '../../shared/components/logout/logout';
import { ChangePassword } from '../../shared/components/change-password/change-password';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-setting',
  imports: [CommonModule, SharedModule, LucideAngularModule],
  templateUrl: './setting.html',
  styleUrl: './setting.css',
})
export class Setting {
  constructor(
    private auth: AuthService,
    private app: AppService,
    private socket: SocketService,
    private router: Router,
    private dialog: MatDialog,
  ) {}

  openChangePassword(): void {
    this.dialog.open(ChangePassword, {
      panelClass: 'rounded-xl',
      minWidth: '0',
      width: 'auto',
    } as any);
  }

  openLogoutModal(): void {
    const ref = this.dialog.open(Logout, {
      width: '320px',
      panelClass: 'rounded-2xl',
    } as any);
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.logOut();
    });
  }

  logOut(): void {
    this.app.post(API.endPoint.logout, {}).subscribe({
      next: () => {
        this.auth.user.set(null);
        this.socket.disconnect();
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.auth.user.set(null);
        this.socket.disconnect();
        this.router.navigate(['/auth/login']);
      },
    });
  }
}
