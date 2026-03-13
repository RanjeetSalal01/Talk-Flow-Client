import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { AppService } from '../../core/services/app.service';
import { AuthService } from '../../core/services/auth.service';
import { CallService } from '../../core/services/call.service';
import { API } from '../../core/config/api';
import { NameInitials } from '../../shared/components/name-initials/name-initials';

@Component({
  selector: 'app-call',
  imports: [CommonModule, SharedModule, NameInitials],
  templateUrl: './call.html',
  styleUrl: './call.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Call implements OnInit {
  calls: any[] = [];
  loading = false;

  constructor(
    private app: AppService,
    public auth: AuthService,
    private callService: CallService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.app.get<any>(API.endPoint.getCallHistory).subscribe({
      next: (res) => {
        this.calls = Array.isArray(res) ? res : (res.data ?? []);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ✅ get the other person in the call
  getRemoteUser(call: any): any {
    const myId = this.auth.user()?._id;
    return call.callerId._id === myId ? call.receiverId : call.callerId;
  }

  // ✅ was i the caller?
  isCaller(call: any): boolean {
    return call.callerId._id === this.auth.user()?._id;
  }

  // ✅ call direction icon and color
  getCallIcon(call: any): { icon: string; color: string } {
    if (call.status === 'missed' || call.status === 'rejected') {
      return { icon: 'phone-missed', color: 'text-red-500' };
    }
    return this.isCaller(call)
      ? { icon: 'phone-outgoing', color: 'text-emerald-500' } // ✅ green not blue
      : { icon: 'phone-incoming', color: 'text-emerald-500' }; // ✅ green
  }

  // ✅ format duration seconds → mm:ss
  formatDuration(seconds: number | null): string {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ✅ call back
  callBack(call: any): void {
    const remote = this.getRemoteUser(call);
    this.callService.startCall(
      remote._id,
      remote.fullName,
      remote.avatarUrl,
      call.callType,
      this.auth.user()?.fullName ?? '',
      this.auth.user()?.avatarUrl ?? '',
    );
  }

  trackById(_: number, c: any) {
    return c._id;
  }
}
