import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { SocketService } from './socket.service';
import { BadgeService } from './badge.service';
import { AppService } from './app.service';
import { API } from '../config/api';

// notification.service.ts
@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(
    private socket: SocketService,
    private app: AppService,
    private toast: ToastrService,
    private badge: BadgeService,
  ) {}

  init(): void {
    this.app.get<any>(API.endPoint.getUnreadCount).subscribe({
      next: (res) => {
        this.badge.chatUnread.set(res.chatCount);
        this.badge.requestUnread.set(res.reqCount);
      },
    });

    this.socket.on<any>('friendRequest').subscribe((res) => {
      this.toast.info(`${res.senderId.fullName} sent you a friend request.`);
      this.badge.requestUnread.update((n) => n + 1);
    });

    this.socket.on<any>('friendRequestAccepted').subscribe((res) => {
      this.toast.success(`${res.receiverId.fullName} accepted your friend request!`);
    });

    this.socket.on<any>('friendRequestRejected').subscribe((res) => {
      this.toast.warning(`${res.receiverId.fullName} declined your friend request.`);
    });

    this.socket.on<any>('newMessage').subscribe((data) => {
      this.toast.info(`New message`);
      if (!this.badge.isOnChatPage()) {
        // ✅ only increment badge when user is NOT on chat page
        this.badge.chatUnread.update((count) => count + 1);
      }
    });
  }
}
