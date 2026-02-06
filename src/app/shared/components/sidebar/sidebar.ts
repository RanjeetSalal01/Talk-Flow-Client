import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared.module';
import { Router } from '@angular/router';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, SharedModule],
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

  constructor(private router: Router) {}

  ngOnInit(): void {}

  isSelected(itemId: string): boolean {
    return this.selectedItem === itemId;
  }

  redirect(item: NavItem){
    this.selectedItem = item.id;
    // Add navigation logic here if needed
    console.log(`Navigating to /${item.id}`);
    this.router.navigate([`/${item.id}`]);
  }
}
