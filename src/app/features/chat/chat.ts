import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { API } from '../../core/config/api';
import { AppService } from '../../core/services/app.service';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { NameInitials } from '../../shared/components/name-initials/name-initials';
import { SharedModule } from '../../shared/shared.module';
import 'emoji-picker-element';
export interface Conversation {
  _id: string;
  fullName: string;
  avatarUrl: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  receiverId: string;
  isOnline?: boolean;
  isTyping?: boolean;
}
export interface Message {
  _id: string;
  senderId: string;
  conversationId: string;
  content: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'read';
}
export interface Friend {
  _id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  isOnline: boolean;
}

@Component({
  selector: 'app-chat',
  imports: [CommonModule, SharedModule, NameInitials, ReactiveFormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Chat implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('msgEnd') msgEnd!: ElementRef;
  @ViewChild('msgContainer') msgContainer!: ElementRef;

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('emoji-picker') && !target.closest('.emoji-trigger')) {
      if (this.showEmojiPicker) {
        this.showEmojiPicker = false;
        this.cdr.detectChanges();
      }
    }
  }

  convs: Conversation[] = [];
  msgs: Message[] = [];
  friends: Friend[] = [];
  filteredFriends: Friend[] = [];
  selectedConv: Conversation | null = null;

  msgCtrl = new FormControl('');
  searchCtrl = new FormControl('');

  loadingConvs = false;
  loadingMsgs = false;
  loadingFriends = false;
  loadingMore = false;
  showFriends = false;
  hasMore = false;
  page = 1;

  typingUsers = new Set<string>();

  private doScroll = false;
  private destroy$ = new Subject<void>();

  showEmojiPicker = false;

  constructor(
    public auth: AuthService,
    private app: AppService,
    private socket: SocketService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadConvs();
    this.loadFriends();

    // Listen events
    this.listenMsgs();
    this.onlineOfflineMarker();
    this.listenTyping();

    this.searchCtrl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => {
        const query = q?.toLowerCase().trim() ?? '';
        this.filteredFriends = query
          ? this.friends.filter(
              (f) =>
                f.fullName.toLowerCase().includes(query) || f.bio?.toLowerCase().includes(query),
            )
          : [...this.friends];
        this.cdr.detectChanges();
      });
  }

  ngAfterViewChecked(): void {
    if (this.doScroll) {
      this.msgEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
      this.doScroll = false;
    }
  }

  toggleEmoji(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
    this.cdr.detectChanges();
  }

  onEmojiSelect(event: any): void {
    const current = this.msgCtrl.value ?? '';
    this.msgCtrl.setValue(current + event.detail.unicode, { emitEvent: false });
    this.showEmojiPicker = false;
    this.cdr.detectChanges();
  }

  // ── Loaders ───────────────────────────────────────────────────────────────

  loadConvs(): void {
    this.loadingConvs = true;
    this.app
      .get<any>(API.endPoint.getConversations)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.convs = Array.isArray(res) ? res : (res.data ?? []);
          this.loadingConvs = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingConvs = false;
          this.cdr.detectChanges();
        },
      });
  }

  loadFriends(): void {
    this.loadingFriends = true;
    this.app
      .get<any>(API.endPoint.getFriends)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.friends = Array.isArray(res) ? res : (res.data ?? []);
          this.filteredFriends = [...this.friends];
          this.loadingFriends = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingFriends = false;
          this.cdr.detectChanges();
        },
      });
  }

  loadMsgs(convId: string, prepend = false): void {
    prepend ? (this.loadingMore = true) : (this.loadingMsgs = true);
    this.app
      .get<any>(`${API.endPoint.getMessages}/${convId}?page=${this.page}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const incoming: Message[] = res.messages ?? [];
          this.hasMore = res.hasMore ?? false;
          if (prepend) {
            const el = this.msgContainer?.nativeElement;
            const prevHeight = el?.scrollHeight ?? 0;
            this.msgs = [...incoming, ...this.msgs];
            this.loadingMore = false;
            this.cdr.detectChanges();
            if (el) el.scrollTop = el.scrollHeight - prevHeight;
          } else {
            this.msgs = incoming;
            this.loadingMsgs = false;
            this.doScroll = true;
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.loadingMsgs = false;
          this.loadingMore = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  selectConv(conv: Conversation): void {
    this.selectedConv = conv;
    conv.unreadCount = 0;
    this.msgs = [];
    this.page = 1;
    this.hasMore = false;
    if (conv._id) this.loadMsgs(conv._id);
    else this.cdr.detectChanges();
  }

  startChat(friend: Friend): void {
    const existing = this.convs.find((c) => c.receiverId === friend._id);
    if (existing) {
      this.selectConv(existing);
      this.showFriends = false;
      return;
    }
    this.selectedConv = {
      _id: '',
      receiverId: friend._id,
      fullName: friend.fullName,
      avatarUrl: friend.avatarUrl,
      lastMessage: '',
      lastMessageAt: '',
      unreadCount: 0,
    };
    this.msgs = [];
    this.showFriends = false;
    this.cdr.detectChanges();
  }

  sendMsg(): void {
    const content = this.msgCtrl.value?.trim();
    if (!content || !this.selectedConv) return;

    const optimistic: Message = {
      _id: Date.now().toString(),
      senderId: this.auth.userId()!,
      conversationId: this.selectedConv._id,
      content,
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    this.msgs = [...this.msgs, optimistic];
    this.msgCtrl.setValue('', { emitEvent: false });
    this.doScroll = true;
    this.cdr.detectChanges();

    this.app
      .post<any>(API.endPoint.sendMessage, {
        conversationId: this.selectedConv._id || null,
        receiverId: this.selectedConv.receiverId,
        content,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const convId = res.conversationId ?? this.selectedConv!._id;
          if (!this.selectedConv!._id) {
            this.selectedConv!._id = convId;
            this.convs = [
              {
                ...this.selectedConv!,
                lastMessage: content,
                lastMessageAt: new Date().toISOString(),
              },
              ...this.convs,
            ];
          }
          this.msgs = this.msgs.map((m) =>
            m._id === optimistic._id ? { ...(res.message ?? res) } : m,
          );
          this.selectedConv!.lastMessage = content;
          this.cdr.detectChanges();
        },
        error: () => {
          this.msgs = this.msgs.filter((m) => m._id !== optimistic._id);
          this.cdr.detectChanges();
        },
      });
  }

  onScroll(e: Event): void {
    const el = e.target as HTMLElement;
    if (el.scrollTop === 0 && this.hasMore && !this.loadingMore) {
      this.page++;
      this.loadMsgs(this.selectedConv!._id, true);
    }
  }

  // ── Socket ────────────────────────────────────────────────────────────────

  private listenMsgs(): void {
    this.socket
      .on<Message>('newMessage')
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => {
        if (msg.senderId === this.auth.userId()) return;
        const conv = this.convs.find((c) => c._id === msg.conversationId);
        if (conv) {
          conv.lastMessage = msg.content;
          conv.lastMessageAt = msg.createdAt;
          if (this.selectedConv?._id !== msg.conversationId) conv.unreadCount++;
        }
        if (this.selectedConv?._id === msg.conversationId) {
          this.msgs = [...this.msgs, msg];
          this.doScroll = true;
        }
        this.cdr.detectChanges();
      });
  }

  onlineOfflineMarker() {
    this.socket
      .on<string[]>('onlineUsers')
      .pipe(takeUntil(this.destroy$))
      .subscribe((userIds) => {
        this.convs.forEach((conv) => {
          conv.isOnline = userIds.includes(conv.receiverId);
        });
        if (this.selectedConv) {
          this.selectedConv.isOnline = userIds.includes(this.selectedConv.receiverId);
        }
        this.cdr.detectChanges();
      });

    this.socket
      .on<{ userId: string }>('onlineUser')
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ userId }) => {
        const conv = this.convs.find((c) => c.receiverId === userId);
        if (conv) conv.isOnline = true;
        if (this.selectedConv?.receiverId === userId) this.selectedConv.isOnline = true;
        this.cdr.detectChanges();
      });

    this.socket
      .on<{ userId: string }>('offlineUser')
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ userId }) => {
        const conv = this.convs.find((c) => c.receiverId === userId);
        if (conv) conv.isOnline = false;
        if (this.selectedConv?.receiverId === userId) this.selectedConv.isOnline = false;
        this.cdr.detectChanges();
      });
  }

  // ── Typing ────────────────────────────────────────────────────────────────

  private listenTyping(): void {
    this.socket
      .on<{ conversationId: string }>('typing')
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ conversationId }) => {
        this.typingUsers.add(conversationId);
        this.cdr.detectChanges();
      });

    this.socket
      .on<{ conversationId: string }>('stopTyping')
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ conversationId }) => {
        this.typingUsers.delete(conversationId);
        this.cdr.detectChanges();
      });
  }

  private typingTimeout: any;

  onTyping(): void {
    if (!this.selectedConv) return;
    this.socket.emit('typing', {
      conversationId: this.selectedConv._id,
      receiverId: this.selectedConv.receiverId,
    });

    // stop typing after 2s of no input
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.socket.emit('stopTyping', {
        conversationId: this.selectedConv!._id,
        receiverId: this.selectedConv!.receiverId,
      });
    }, 2000);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  onEnter(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMsg();
    }
  }

  trackByConv(_: number, c: Conversation) {
    return c._id;
  }
  trackByMsg(_: number, m: Message) {
    return m._id;
  }
  trackByFriend(_: number, f: Friend) {
    return f._id;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
