import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CallService, CallState } from '../../../core/services/call.service';
import { AuthService } from '../../../core/services/auth.service';
import { SharedModule } from '../../shared.module';
import { NameInitials } from '../name-initials/name-initials';

@Component({
  selector: 'app-call-modal',
  standalone: true,
  imports: [CommonModule, SharedModule, NameInitials],
  templateUrl: './call-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CallModal implements OnInit, OnDestroy {
  callState: CallState | null = null;
  isMuted = false;
  isCameraOff = false;
  callDuration = 0;
  private timer: any;
  private destroy$ = new Subject<void>();

  // for attaching streams to video elements
  localVideoRef: HTMLVideoElement | null = null;
  remoteVideoRef: HTMLVideoElement | null = null;

  constructor(
    public callService: CallService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // ✅ ADD THIS BLOCK
    this.callService.onRemoteStream = (stream) => {
      setTimeout(() => {
        const remoteVideoEl = document.getElementById('remoteVideo') as HTMLVideoElement;
        if (remoteVideoEl) remoteVideoEl.srcObject = stream;
        const remoteAudioEl = document.querySelector('audio#remoteVideo') as HTMLAudioElement;
        if (remoteAudioEl) remoteAudioEl.srcObject = stream;
      }, 0);
    };

    this.callService.callState$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
      this.callState = state;

      if (state.status === 'active') {
        this.startTimer();
        // attach streams to video elements after view updates
        setTimeout(() => this.attachLocalStream(), 100);
      }

      if (state.status === 'idle') {
        this.stopTimer();
        this.callDuration = 0;
        this.isMuted = false;
        this.isCameraOff = false;
      }

      this.cdr.detectChanges();
    });
  }

  accept(): void {
    this.callService.acceptCall();
  }

  reject(): void {
    this.callService.rejectCall();
  }

  end(): void {
    this.callService.endCall();
  }

  toggleMute(): void {
    this.isMuted = this.callService.toggleMute();
    this.cdr.detectChanges();
  }

  toggleCamera(): void {
    this.isCameraOff = this.callService.toggleCamera();
    this.cdr.detectChanges();
  }

  private attachLocalStream(): void {
    const localEl = document.getElementById('localVideo') as HTMLVideoElement;
    if (localEl && this.callService.localStream) {
      localEl.srcObject = this.callService.localStream;
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.callDuration++;
      this.cdr.detectChanges();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  get formattedDuration(): string {
    const m = Math.floor(this.callDuration / 60)
      .toString()
      .padStart(2, '0');
    const s = (this.callDuration % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.callService.onRemoteStream = null;
    this.destroy$.next();
    this.destroy$.complete();
  }
}
