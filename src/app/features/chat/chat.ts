import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';

interface Conversation {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isTyping?: boolean;
}

interface Message {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
  isSent: boolean;
  avatar?: string;
}

@Component({
  selector: 'app-chat',
  imports: [CommonModule, SharedModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat {
  conversations: Conversation[] = [
    {
      id: 1,
      name: 'Sarah Wilson',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      lastMessage: 'typing ...',
      timestamp: '2m ago',
      unreadCount: 3,
      isTyping: true,
    },
    {
      id: 2,
      name: 'Alex Thompson',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      lastMessage: "Let's catch up tomorrow!",
      timestamp: '15m ago',
      unreadCount: 0,
    },
    {
      id: 3,
      name: 'Emma Davis',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
      lastMessage: 'Thanks for sharing that!',
      timestamp: '1h ago',
      unreadCount: 1,
    },
    {
      id: 4,
      name: 'Mike Johnson',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
      lastMessage: 'See you at the meeting 👋',
      timestamp: '3h ago',
      unreadCount: 0,
    },
  ];

  messages: Message[] = [];
  selectedConversation: Conversation | null = null;

  selectConversation(conversation: Conversation) {
    this.selectedConversation = conversation;
    this.loadMessagesForConversation(conversation);
  }

  loadMessagesForConversation(conversation: Conversation) {
    // Mock messages for demo
    this.messages = [
      {
        id: 1,
        sender: 'You',
        content: 'Hey! How are you doing?',
        timestamp: '10:30 AM',
        isSent: true,
      },
      {
        id: 2,
        sender: conversation.name,
        content: "I'm doing great! How about you?",
        timestamp: '10:32 AM',
        isSent: false,
        avatar: conversation.avatar,
      },
      {
        id: 3,
        sender: 'You',
        content: "Pretty good! Want to catch up later?",
        timestamp: '10:33 AM',
        isSent: true,
      },
    ];
  }
}
