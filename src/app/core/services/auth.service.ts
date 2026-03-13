import { Injectable, signal } from '@angular/core';
import { tap, map } from 'rxjs/operators';
import { API } from '../config/api';
import { AppService } from './app.service';
import { SocketService } from './socket.service';
import { NotificationService } from './notifications';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<any>(null);
  checked = signal<boolean>(false);
  userId = signal<string | null>(null);

  constructor(
    private app: AppService,
    private socket: SocketService,
    private notification: NotificationService,
  ) {}

  checkAuth() {
    return this.app.get<any>(API.endPoint.me).pipe(
      tap((res) => {
        this.user.set(res.data);
        this.userId.set(res.data._id);
        this.checked.set(true);
        this.socket.connect(res.data._id); // ✅ connect with userId in handshake
        this.notification.init(); // ✅ socket is ready, safe to listen
      }),
      map(() => true),
    );
  }

  logout() {
    return this.app.post(API.endPoint.logout, {}).pipe(
      tap(() => {
        this.user.set(null);
        this.userId.set(null);
        this.socket.disconnect(); // ✅ clean up on logout
      }),
    );
  }

  isLoggedIn(): boolean {
    return !!this.user();
  }
}
