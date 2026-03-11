import { Injectable, OnDestroy } from '@angular/core';
import { environment } from '../../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket!: Socket;

  connect(userId: string): void {
    if (this.socket?.connected) return;
    this.socket = io(environment.socketUrl, { auth: { userId } });
    this.socket.on('connect', () => console.log('Socket connected'));
    this.socket.on('disconnect', () => console.log('Socket disconnected'));
  }

  on<T>(event: string): Observable<T> {
    return new Observable((observer) => {
      this.socket.on(event, (data: T) => observer.next(data));
    });
  }

  emit(event: string, payload?: any): void {
    this.socket?.emit(event, payload);
  }

  disconnect(): void {
    this.socket?.disconnect();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}