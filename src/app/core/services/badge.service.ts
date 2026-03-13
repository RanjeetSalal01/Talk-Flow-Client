import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BadgeService {
  chatUnread = signal<number>(0);
  requestUnread = signal<number>(0);
  isOnChatPage = signal<boolean>(false);
}
