import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CallService, CallState } from '../../../core/services/call.service';
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

  callState:   CallState | null = null;
  isMuted      = false;
  isCameraOff  = false;
  callDuration = 0;

  private timer$:  any;
  private destroy$ = new Subject<void>();

  constructor(public callService: CallService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {

    // ── Watch call state ──────────────────────────────────────────────────
    this.callService.callState$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.callState = state;

      if (state.status === 'active') {
        this.startTimer();
        // Attach local stream after Angular renders the <video> element
        setTimeout(() => this.attachLocalStream(), 0);
      }

      if (state.status === 'idle') {
        this.stopTimer();
        this.callDuration = 0;
        this.isMuted      = false;
        this.isCameraOff  = false;
      }

      this.cdr.detectChanges();
    });

    // ── Watch remote stream — attaches as soon as tracks arrive ──────────
    // This replaces the old onRemoteStream callback hack
    this.callService.remoteStream$.pipe(takeUntil(this.destroy$)).subscribe(stream => {
      if (!stream) return;
      setTimeout(() => {
        const videoEl = document.getElementById('remoteVideo') as HTMLVideoElement | null;
        if (videoEl) videoEl.srcObject = stream;

        const audioEl = document.getElementById('remoteAudio') as HTMLAudioElement | null;
        if (audioEl) audioEl.srcObject = stream;
      }, 0);
      this.cdr.detectChanges();
    });
  }

  accept():       void { this.callService.acceptCall();  }
  reject():       void { this.callService.rejectCall();  }
  end():          void { this.callService.endCall();     }

  toggleMute(): void {
    this.isMuted = this.callService.toggleMute();
    this.cdr.detectChanges();
  }

  toggleCamera(): void {
    this.isCameraOff = this.callService.toggleCamera();
    this.cdr.detectChanges();
  }

  get formattedDuration(): string {
    const m = Math.floor(this.callDuration / 60).toString().padStart(2, '0');
    const s = (this.callDuration % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  private attachLocalStream(): void {
    const el = document.getElementById('localVideo') as HTMLVideoElement | null;
    if (el && this.callService.localStream) el.srcObject = this.callService.localStream;
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer$ = setInterval(() => { this.callDuration++; this.cdr.detectChanges(); }, 1000);
  }

  private stopTimer(): void {
    if (this.timer$) { clearInterval(this.timer$); this.timer$ = null; }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }
}