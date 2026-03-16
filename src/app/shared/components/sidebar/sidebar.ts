import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared.module';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BadgeService } from '../../../core/services/badge.service';
import { NameInitials } from '../name-initials/name-initials';
import { MatDialog } from '@angular/material/dialog';
import { SocketService } from '../../../core/services/socket.service';
import { API } from '../../../core/config/api';
import { AppService } from '../../../core/services/app.service';
import { Logout } from '../logout/logout';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, SharedModule, NameInitials],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  selectedItem: string = 'chats';

  navItems: NavItem[] = [
    {
      id: 'chats',
      label: 'Chats',
      icon: 'message-circle',
      badge: 1,
    },
    {
      id: 'requests',
      label: 'Requests',
      icon: 'message-square-plus',
      badge: 2,
    },
    {
      id: 'search',
      label: 'Search',
      icon: 'search',
    },
    {
      id: 'calls',
      label: 'Calls',
      icon: 'phone',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: 'user',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
    },
  ];

  constructor(
    private router: Router,
    private app: AppService,
    private socket: SocketService,
    public auth: AuthService,
    public badge: BadgeService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {}

  isSelected(itemId: string): boolean {
    return this.selectedItem === itemId;
  }

  redirect(item: NavItem) {
    this.selectedItem = item.id;
    // Add navigation logic here if needed
    console.log(`Navigating to /${item.id}`);
    this.router.navigate([`/${item.id}`]);
  }

  openLogoutModal(): void {
    const ref = this.dialog.open(Logout, {
      width: '320px',
      borderRadius: '16px',
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
