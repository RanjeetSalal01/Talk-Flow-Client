import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-name-initials',
  imports: [CommonModule],
  templateUrl: './name-initials.html',
  styleUrl: './name-initials.css',
})
export class NameInitials {
  @Input() name: string = '';
  @Input() isOnline: any;

  getInitials(name: string): string {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
