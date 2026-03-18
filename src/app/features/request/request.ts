import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { AppService } from '../../core/services/app.service';
import { SocketService } from '../../core/services/socket.service';
import { API } from '../../core/config/api';
import { Subject, EMPTY } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { NameInitials } from '../../shared/components/name-initials/name-initials';
import { BadgeService } from '../../core/services/badge.service';

export interface FriendRequest {
  _id: string;
  senderId: { _id: string; username: string; fullName: string; avatarUrl?: string; bio?: string };
  receiverId: { _id: string; username: string; fullName: string; avatarUrl?: string; bio?: string };
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

@Component({
  selector: 'app-request',
  imports: [CommonModule, SharedModule, NameInitials],
  templateUrl: './request.html',
  styleUrl: './request.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Request implements OnInit, OnDestroy {
  activeTab: 'incoming' | 'outgoing' = 'incoming';
  incomingRequests: FriendRequest[] = [];
  outgoingRequests: FriendRequest[] = [];
  loadingIncoming = false; // ✅ separate flags per tab
  loadingOutgoing = false;
  private destroy$ = new Subject<void>();

  constructor(
    public app: AppService,
    private socket: SocketService,
    private cdr: ChangeDetectorRef,
    private badge: BadgeService,
  ) {}

  ngOnInit(): void {
    this.loadIncoming();
    this.loadOutgoing();
    this.listenToSocket();
  }

  loadIncoming(): void {
    this.loadingIncoming = true;
    this.cdr.detectChanges();
    this.app
      .get<any>(API.endPoint.getIncomingRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.incomingRequests = Array.isArray(res) ? res : (res.data ?? []);
          this.badge.requestUnread.set(this.incomingRequests.length);
          this.loadingIncoming = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingIncoming = false;
          this.cdr.detectChanges();
        },
      });
  }

  loadOutgoing(): void {
    this.loadingOutgoing = true;
    this.cdr.detectChanges();
    this.app
      .get<any>(API.endPoint.getOutgoingRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.outgoingRequests = Array.isArray(res) ? res : (res.data ?? []);
          this.loadingOutgoing = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingOutgoing = false;
          this.cdr.detectChanges();
        },
      });
  }

  acceptRequest(req: FriendRequest): void {
    this.app
      .patch(`${API.endPoint.acceptFriendRequest}/${req._id}`, {})
      .pipe(
        catchError(() => EMPTY),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.incomingRequests = this.incomingRequests.filter((r) => r._id !== req._id);
        this.badge.requestUnread.set(this.incomingRequests.length);
        this.cdr.detectChanges();
      });
  }

  rejectRequest(req: FriendRequest): void {
    this.app
      .delete(`${API.endPoint.rejectFriendRequest}/${req._id}`)
      .pipe(
        catchError(() => EMPTY),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        if (this.activeTab === 'incoming') {
          this.incomingRequests = this.incomingRequests.filter((r) => r._id !== req._id);
        } else {
          this.outgoingRequests = this.outgoingRequests.filter((r) => r._id !== req._id);
        }
        this.badge.requestUnread.set(this.incomingRequests.length);
        this.cdr.detectChanges();
      });
  }

  private listenToSocket(): void {
    // incoming new request
    this.socket
      .on<FriendRequest>('friendRequest')
      .pipe(takeUntil(this.destroy$))
      .subscribe((req) => {
        this.incomingRequests = [req, ...this.incomingRequests];
        this.badge.requestUnread.set(this.incomingRequests.length);
        this.cdr.detectChanges();
      });

    // ✅ someone accepted YOUR outgoing request → remove from outgoing list
    this.socket
      .on<any>('friendRequestAccepted')
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.outgoingRequests = this.outgoingRequests.filter(
          (r) => r.receiverId._id !== res.receiverId._id,
        );
        this.cdr.detectChanges();
      });

    // ✅ someone rejected YOUR outgoing request → remove from outgoing list
    this.socket
      .on<any>('friendRequestRejected')
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.outgoingRequests = this.outgoingRequests.filter(
          (r) => r.receiverId._id !== res.receiverId._id,
        );
        this.cdr.detectChanges();
      });
  }

  getInitials(name: string): string {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  setActiveTab(tab: 'incoming' | 'outgoing'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }
  trackById(_: number, r: FriendRequest) {
    return r._id;
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
