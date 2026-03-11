import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationService } from './core/services/notifications';
import { SocketService } from './core/services/socket.service';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  socket = inject(SocketService);
  protected readonly title = signal('client');

  constructor() {}

  ngOnInit(): void {}
}
