import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';

interface ChatRequest {
  id: number;
  name: string;
  avatar: string;
  profession: string;
  emoji: string;
  status: 'online' | 'offline';
  timeAgo: string;
}

@Component({
  selector: 'app-request',
  imports: [CommonModule, SharedModule],
  templateUrl: './request.html',
  styleUrl: './request.css',
})
export class Request {
  activeTab: 'incoming' | 'outgoing' = 'incoming';

  incomingRequests: ChatRequest[] = [
    {
      id: 1,
      name: 'David Lee',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      profession: 'Software Developer',
      emoji: '☕',
      status: 'online',
      timeAgo: '2 hours ago',
    },
    {
      id: 2,
      name: 'Sophie Martin',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      profession: 'Travel lover',
      emoji: '📸',
      status: 'online',
      timeAgo: '5 hours ago',
    },
    {
      id: 3,
      name: 'James Wilson',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
      profession: 'Music producer',
      emoji: '🎵',
      status: 'offline',
      timeAgo: '1 day ago',
    },
  ];

  outgoingRequests: ChatRequest[] = [
    {
      id: 4,
      name: 'Emma Davis',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
      profession: 'Designer',
      emoji: '🎨',
      status: 'online',
      timeAgo: '3 hours ago',
    }
  ];

  setActiveTab(tab: 'incoming' | 'outgoing') {
    this.activeTab = tab;
  }

  acceptRequest(request: ChatRequest) {
    console.log('Accepted request from', request.name);
    if (this.activeTab === 'incoming') {
      this.incomingRequests = this.incomingRequests.filter(r => r.id !== request.id);
    }
  }

  rejectRequest(request: ChatRequest) {
    console.log('Rejected request from', request.name);
    if (this.activeTab === 'incoming') {
      this.incomingRequests = this.incomingRequests.filter(r => r.id !== request.id);
    } else {
      this.outgoingRequests = this.outgoingRequests.filter(r => r.id !== request.id);
    }
  }
}
