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
import { HttpEventType } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { API } from '../../core/config/api';
import { AppService } from '../../core/services/app.service';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { NameInitials } from '../../shared/components/name-initials/name-initials';
import { SharedModule } from '../../shared/shared.module';
import 'emoji-picker-element';
import { BadgeService } from '../../core/services/badge.service';
import { CallService } from '../../core/services/call.service';

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
  type?: 'text' | 'image' | 'file' | 'video';
  mediaUrl?: string;
  mediaName?: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'read';
  uploadState?: 'uploading' | 'failed' | null; // ✅ new
}

export interface Friend {
  _id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  isOnline: boolean;
}

export interface MediaPreview {
  file: File;
  url: string;
  type: 'image' | 'video' | 'file';
  name: string;
  uploadState?: 'uploading' | 'failed' | null; // ✅ new
}

@Component({
  selector: 'app-chat',
  imports: [CommonModule, SharedModule, NameInitials, ReactiveFormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
  searchFriend = new FormControl('');
  searchConv = new FormControl('');
  filteredConvs: Conversation[] = [];

  loadingConvs = false;
  loadingMsgs = false;
  loadingFriends = false;
  loadingMore = false;
  showFriends = false;
  hasMore = false;
  page = 1;

  uploadProgress = 0;
  isUploading = false;
  mediaPreviews: MediaPreview[] = [];

  typingUsers = new Set<string>();
  showEmojiPicker = false;

  private doScroll = false;
  private destroy$ = new Subject<void>();
  private typingTimeout: any;

  constructor(
    public auth: AuthService,
    private app: AppService,
    private socket: SocketService,
    private cdr: ChangeDetectorRef,
    private badge: BadgeService,
    private call: CallService,
  ) {}

  ngOnInit(): void {
    this.badge.isOnChatPage.set(true); // ✅
    this.badge.chatUnread.set(0); // ✅ reset unread count when entering chat page
    this.loadConvs();
    this.loadFriends();
    this.listenMsgs();
    this.onlineOfflineMarker();
    this.listenTyping();

    this.listenReadReceipts();

    this.searchFriend.valueChanges
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

    this.searchConv.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => {
        const query = q?.toLowerCase().trim() ?? '';
        this.filteredConvs = query
          ? this.convs.filter((f) => f.fullName.toLowerCase().includes(query))
          : [...this.convs];
        this.cdr.detectChanges();
      });
  }

  ngAfterViewChecked(): void {
    if (this.doScroll) {
      this.msgEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
      this.doScroll = false;
    }
  }

  private updateChatBadge(): void {
    const total = this.convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    this.badge.chatUnread.set(total);
  }

  startCall(callType: 'audio' | 'video'): void {
    if (!this.selectedConv) return;

    this.call.startCall(
      this.selectedConv.receiverId, // who to call
      this.selectedConv.fullName, // their name
      this.selectedConv.avatarUrl, // their avatar
      callType, // audio or video
      this.auth.user()?.fullName ?? '', // my name
      this.auth.user()?.avatarUrl ?? '', // my avatar
    );
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
          this.filteredConvs = [...this.convs]
          this.loadingConvs = false;
          this.updateChatBadge();
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
    if (!convId) return;
    prepend ? (this.loadingMore = true) : (this.loadingMsgs = true);
    this.cdr.detectChanges();

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
    this.updateChatBadge();
    this.msgs = [];
    this.page = 1;
    this.hasMore = false;
    this.cdr.detectChanges();
    if (conv._id) {
      this.loadMsgs(conv._id);
      // ✅ tell server to mark messages as read
      this.socket.emit('markRead', {
        conversationId: conv._id,
        senderId: conv.receiverId,
      });
    }
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

  async sendMsg(): Promise<void> {
    if (this.mediaPreviews.length > 0) {
      const previews = [...this.mediaPreviews];
      this.mediaPreviews = [];
      this.cdr.detectChanges();
      for (const preview of previews) {
        await this.uploadAndSend(preview);
      }
      return;
    }

    const content = this.msgCtrl.value?.trim();
    if (!content || !this.selectedConv) return;

    const optimistic: Message = {
      _id: Date.now().toString(),
      senderId: this.auth.userId()!,
      conversationId: this.selectedConv._id,
      content,
      type: 'text',
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
        type: 'text',
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
          // ✅ existing conv — update it
          conv.lastMessage = msg.content;
          conv.lastMessageAt = msg.createdAt;
          if (this.selectedConv?._id !== msg.conversationId) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
            this.updateChatBadge();
          } else {
            this.socket.emit('markRead', {
              conversationId: msg.conversationId,
              senderId: msg.senderId,
            });
          }
          // ✅ move conv to top
          this.convs = [conv, ...this.convs.filter((c) => c._id !== conv._id)];
        } else {
          // ✅ new conv — reload from server to get full conv data
          this.loadConvs();
        }

        if (this.selectedConv?._id === msg.conversationId) {
          this.msgs = [...this.msgs, msg];
          this.doScroll = true;
        }

        this.cdr.detectChanges();
      });
  }

  private listenReadReceipts(): void {
    // ✅ someone read our messages
    this.socket
      .on<{ conversationId: string }>('messagesRead')
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ conversationId }) => {
        // update msgs in current open conversation
        if (this.selectedConv?._id === conversationId) {
          this.msgs = this.msgs.map((m) => ({ ...m, status: 'read' as const }));
        }
        // update unread count in conv list
        const conv = this.convs.find((c) => c._id === conversationId);
        if (conv) conv.unreadCount = 0;
        this.updateChatBadge();
        this.cdr.detectChanges();
      });

    // ✅ our messages were delivered
    this.socket
      .on<{ conversationIds: string[] }>('messagesDelivered')
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ conversationIds }) => {
        // update msgs if current conv is in the list
        if (this.selectedConv && conversationIds.includes(this.selectedConv._id)) {
          this.msgs = this.msgs.map((m) =>
            m.status === 'sent' ? { ...m, status: 'delivered' as const } : m,
          );
        }
        this.cdr.detectChanges();
      });
  }

  onlineOfflineMarker(): void {
    this.socket
      .on<string[]>('onlineUsers')
      .pipe(takeUntil(this.destroy$))
      .subscribe((userIds) => {
        this.convs.forEach((c) => (c.isOnline = userIds.includes(c.receiverId)));
        if (this.selectedConv)
          this.selectedConv.isOnline = userIds.includes(this.selectedConv.receiverId);
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

  onTyping(): void {
    if (!this.selectedConv) return;
    this.socket.emit('typing', {
      conversationId: this.selectedConv._id,
      receiverId: this.selectedConv.receiverId,
    });
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.socket.emit('stopTyping', {
        conversationId: this.selectedConv!._id,
        receiverId: this.selectedConv!.receiverId,
      });
    }, 2000);
  }

  // ── Media ─────────────────────────────────────────────────────────────────

  onFileSelect(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;

    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} exceeds 50MB limit`);
        continue;
      }
      const type = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
          ? 'video'
          : 'file';

      this.mediaPreviews.push({ file, url: URL.createObjectURL(file), type, name: file.name });
    }
    (event.target as HTMLInputElement).value = '';
    this.cdr.detectChanges();
  }

  removePreview(index: number): void {
    URL.revokeObjectURL(this.mediaPreviews[index].url);
    this.mediaPreviews.splice(index, 1);
    this.cdr.detectChanges();
  }

  private async uploadAndSend(preview: MediaPreview): Promise<void> {
    if (!this.selectedConv) return;

    const content =
      preview.type === 'image'
        ? '📷 Image'
        : preview.type === 'video'
          ? '🎥 Video'
          : `📎 ${preview.name}`;

    const optimisticId = Date.now().toString();
    const optimistic: Message = {
      _id: optimisticId,
      senderId: this.auth.userId()!,
      conversationId: this.selectedConv._id,
      content,
      type: preview.type,
      mediaUrl: preview.url, // ← blob URL
      mediaName: preview.name,
      createdAt: new Date().toISOString(),
      status: 'sent',
      uploadState: 'uploading', // ✅ show spinner
    };

    this.msgs = [...this.msgs, optimistic];
    this.doScroll = true;
    this.cdr.detectChanges();

    const formData = new FormData();
    formData.append('file', preview.file);

    this.app
      .uploadWithProgress<any>(API.endPoint.uploadFile, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (e: any) => {
          if (e.type === HttpEventType.Response) {
            URL.revokeObjectURL(preview.url);

            this.app
              .post<any>(API.endPoint.sendMessage, {
                conversationId: this.selectedConv!._id || null,
                receiverId: this.selectedConv!.receiverId,
                content,
                type: e.body.type,
                mediaUrl: e.body.url,
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
                  // ✅ replace with real URL, remove spinner
                  this.msgs = this.msgs.map((m) =>
                    m._id === optimisticId
                      ? {
                          ...(res.message ?? res),
                          mediaUrl: e.body.url,
                          type: e.body.type,
                          mediaName: preview.name,
                          uploadState: null,
                        }
                      : m,
                  );
                  this.selectedConv!.lastMessage = content;
                  this.cdr.detectChanges();
                },
                error: () => {
                  // ✅ show retry on bubble
                  this.msgs = this.msgs.map((m) =>
                    m._id === optimisticId ? { ...m, uploadState: 'failed' } : m,
                  );
                  this.cdr.detectChanges();
                },
              });
          }
        },
        error: () => {
          // ✅ show retry on bubble
          this.msgs = this.msgs.map((m) =>
            m._id === optimisticId ? { ...m, uploadState: 'failed' } : m,
          );
          this.cdr.detectChanges();
        },
      });
  }

  retryUpload(msg: Message): void {
    // remove failed message and retry from mediaPreviews won't work
    // so just remove the bubble and let user re-select
    this.msgs = this.msgs.filter((m) => m._id !== msg._id);
    this.cdr.detectChanges();
  }

  sendMediaMsg(mediaUrl: string, type: string, name: string): void {
    if (!this.selectedConv) return;
    const content = type === 'image' ? '📷 Image' : type === 'video' ? '🎥 Video' : `📎 ${name}`;

    const optimistic: Message = {
      _id: Date.now().toString(),
      senderId: this.auth.userId()!,
      conversationId: this.selectedConv._id,
      content,
      type: type as any,
      mediaUrl,
      mediaName: name,
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    this.msgs = [...this.msgs, optimistic];
    this.doScroll = true;
    this.cdr.detectChanges();

    this.app
      .post<any>(API.endPoint.sendMessage, {
        conversationId: this.selectedConv._id || null,
        receiverId: this.selectedConv.receiverId,
        content,
        type,
        mediaUrl,
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
            m._id === optimistic._id
              ? { ...(res.message ?? res), mediaUrl, type, mediaName: name }
              : m,
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

  // ── Emoji ─────────────────────────────────────────────────────────────────

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

  // ── Helpers ───────────────────────────────────────────────────────────────

  onEnter(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMsg();
    }
  }

  isImage(msg: Message): boolean {
    return msg.type === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.mediaUrl ?? '');
  }

  isFailed(msg: Message): boolean {
    return msg.uploadState === 'failed';
  }

  isVideo(msg: Message): boolean {
    return msg.type === 'video' || /\.(mp4|webm|ogg)$/i.test(msg.mediaUrl ?? '');
  }

  isFile(msg: Message): boolean {
    return !!msg.mediaUrl && !this.isImage(msg) && !this.isVideo(msg);
  }

  openMedia(url: string): void {
    window.open(url, '_blank');
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
    this.badge.isOnChatPage.set(false);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
