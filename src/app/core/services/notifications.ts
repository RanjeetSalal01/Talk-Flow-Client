import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { SocketService } from './socket.service';

// notification.service.ts
@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(
    private socket: SocketService,
    private toast: ToastrService,
  ) {}

  init(): void {
    this.socket.on<any>('friendRequest').subscribe(() => {
      this.toast.info('You have a new friend request!');
    });

    this.socket.on<any>('friendRequestAccepted').subscribe(() => {
      this.toast.success('Your friend request was accepted!');
    });

    this.socket.on<any>('friendRequestRejected').subscribe(() => {
      this.toast.warning('Your friend request was declined.');
    });

    this.socket.on<any>('newMessage').subscribe((data) => {
      this.toast.info(`New message`);
    });
  }
}
