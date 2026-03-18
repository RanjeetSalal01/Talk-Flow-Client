import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { EMPTY, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { API } from '../../core/config/api';
import { AppService } from '../../core/services/app.service';
import { SharedModule } from '../../shared/shared.module';
import { ToastrService } from 'ngx-toastr';

import { SocketService } from '../../core/services/socket.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export type FriendStatus = 'none' | 'pending' | 'friends';
export interface UserResult {
  _id: string | number;
  username: string;
  bio: string;
  avatarUrl: string;
  status: FriendStatus;
}

@Component({
  selector: 'app-search',
  imports: [SharedModule],
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class Search implements OnInit {
  users: UserResult[] = [];
  searchControl = new FormControl<string>('');
  loading = false;
  hasSearched = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private app: AppService,
    private toast: ToastrService,
    private cdr: ChangeDetectorRef,
    private socket: SocketService,
  ) {}

  ngOnInit(): void {
    this.listenSocket();
    this.searchControl.valueChanges
      .pipe(
        debounceTime(400),
        map((q) => q?.trim() ?? ''),
        distinctUntilChanged(),
        tap((q) => {
          if (q.length < 2) {
            this.users = [];
            this.hasSearched = false;
            this.loading = false;
          } else {
            this.loading = true; // ✅ set before switchMap
            this.hasSearched = true;
            this.errorMessage = '';
          }
          this.cdr.detectChanges(); // ✅ force skeleton to render immediately
        }),
        filter((q) => q.length >= 2),
        switchMap((q) =>
          this.app
            .get<UserResult[]>(`${API.endPoint.searchUser}?query=${encodeURIComponent(q)}`)
            .pipe(
              catchError(() => {
                this.errorMessage = 'Something went wrong.';
                this.loading = false;
                return of([]);
              }),
            ),
        ),
      )
      .subscribe((res) => {
        this.users = res;
        this.loading = false;
        this.cdr.detectChanges();
      });
  }

  sendRequest(user: UserResult) {
    try {
      if (user.status !== 'none') return;
      user.status = 'pending';
      this.app
        .post(API.endPoint.sendFriendRequest, { receiverId: user._id })
        .pipe(
          catchError(() => {
            user.status = 'none';
            return EMPTY;
          }),
        )
        .subscribe();
    } catch (err) {
      this.toast.error('Failed to send friend request');
    }
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.users = [];
    this.hasSearched = false;
  }

  listenSocket() {
    // ✅ someone accepted your request → update status to 'friends' in results
    this.socket
      .on<any>('friendRequestAccepted')
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        const user = this.users.find((u) => u._id === res.receiverId._id);
        if (user) {
          user.status = 'friends';
          this.cdr.detectChanges();
        }
      });

    // ✅ someone rejected your request → reset status back to 'none'
    this.socket
      .on<any>('friendRequestRejected')
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        const user = this.users.find((u) => u._id === res.receiverId._id);
        if (user) {
          user.status = 'none';
          this.cdr.detectChanges();
        }
      });
  }

  trackByUser(_: number, user: UserResult) {
    return user._id;
  }

  get query() {
    return this.searchControl.value?.trim() ?? '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
