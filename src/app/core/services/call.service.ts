import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SocketService } from './socket.service';
import { AppService } from './app.service';
import { API } from '../config/api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CallState {
  status:           'idle' | 'calling' | 'incoming' | 'active';
  callType:         'audio' | 'video' | null;
  callId:           string | null;
  remoteUserId:     string | null;
  remoteUserName:   string | null;
  remoteUserAvatar: string | null;
}

const IDLE: CallState = {
  status: 'idle', callType: null, callId: null,
  remoteUserId: null, remoteUserName: null, remoteUserAvatar: null,
};

// ── ICE config (your existing TURN servers kept) ───────────────────────────

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'turn:global.relay.metered.ca:80',              username: '7bb10da9db0d4858f3fc083e', credential: 'aTat0SbKv19/fJGz' },
    { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: '7bb10da9db0d4858f3fc083e', credential: 'aTat0SbKv19/fJGz' },
    { urls: 'turn:global.relay.metered.ca:443',             username: '7bb10da9db0d4858f3fc083e', credential: 'aTat0SbKv19/fJGz' },
    { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: '7bb10da9db0d4858f3fc083e', credential: 'aTat0SbKv19/fJGz' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CallService {

  // ── Exposed to UI ──────────────────────────────────────────────────────────
  callState$    = new BehaviorSubject<CallState>(IDLE);
  remoteStream$ = new BehaviorSubject<MediaStream | null>(null);
  localStream:  MediaStream | null = null;

  // ── Private state ──────────────────────────────────────────────────────────
  private pc:                RTCPeerConnection | null = null;
  private iceCandidateQueue: RTCIceCandidateInit[] = []; // queued until remoteDesc is set
  private remoteDescSet      = false;
  private isCallee           = false;
  private callTimeout:       any = null;
  private ringtone:          HTMLAudioElement | null = null;

  constructor(private socket: SocketService, private app: AppService) {
    this.listen();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  async startCall(
    remoteUserId: string,
    remoteUserName: string,
    remoteUserAvatar: string,
    callType: 'audio' | 'video',
    myName: string,
    myAvatar: string,
  ): Promise<void> {
    try {
      this.isCallee = false;

      // 1. Get mic/camera
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });

      // 2. Update UI to calling
      this.callState$.next({ status: 'calling', callType, callId: null, remoteUserId, remoteUserName, remoteUserAvatar });

      // 3. Save call to DB → get callId, then ring callee
      //    We do NOT send SDP here anymore — we wait for callAccepted
      this.app.post<any>(API.endPoint.initiateCall, { receiverId: remoteUserId, callType }).subscribe({
        next: ({ callId }) => {
          this.callState$.next({ ...this.callState$.value, callId });

          // Ring the callee (no SDP yet)
          this.socket.emit('callOffer', { to: remoteUserId, callType, callerName: myName, callerAvatar: myAvatar, callId });
          this.startRing();

          // Auto-cancel after 30s if no answer
          this.callTimeout = setTimeout(() => {
            if (this.callState$.value.status === 'calling') {
              this.socket.emit('callCancelled', { to: remoteUserId, callId });
              this.updateDB('missed');
              this.cleanupAndReset();
            }
          }, 30000);
        },
        error: () => this.cleanupAndReset(),
      });
    } catch (err) {
      console.error('startCall error:', err);
      this.cleanupAndReset();
    }
  }

  async acceptCall(): Promise<void> {
    try {
      const { remoteUserId, callType, callId } = this.callState$.value;
      if (!remoteUserId || !callId) return;

      this.stopRing();
      this.isCallee = true;

      // 1. Get mic/camera
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });

      // 2. Create peer connection and add tracks
      this.createPC(remoteUserId);
      this.localStream.getTracks().forEach(t => this.pc!.addTrack(t, this.localStream!));

      // 3. Update UI to active
      this.callState$.next({ ...this.callState$.value, status: 'active' });

      // 4. Tell caller we're ready → they will now send SDP offer
      this.socket.emit('callAccepted', { to: remoteUserId, callId });

      // 5. Update DB: startedAt set by server
      this.updateDB('active');
    } catch (err) {
      console.error('acceptCall error:', err);
      this.cleanupAndReset();
    }
  }

  rejectCall(): void {
    const { remoteUserId, callId } = this.callState$.value;
    this.stopRing();
    this.socket.emit('callRejected', { to: remoteUserId, callId });
    this.updateDB('rejected');
    this.cleanupAndReset();
  }

  endCall(): void {
    const { remoteUserId, callId, status } = this.callState$.value;
    this.socket.emit('callEnded', { to: remoteUserId, callId });

    if (status === 'calling') {
      // Caller cancelled while ringing → missed
      this.socket.emit('callCancelled', { to: remoteUserId, callId });
      this.updateDB('missed');
    } else if (status === 'active') {
      // Either side ended active call → ended (server calculates duration)
      this.updateDB('ended');
    }

    this.cleanupAndReset();
  }

  toggleMute(): boolean {
    const track = this.localStream?.getAudioTracks()[0];
    if (track) track.enabled = !track.enabled;
    return !(track?.enabled ?? true); // returns isMuted
  }

  toggleCamera(): boolean {
    const track = this.localStream?.getVideoTracks()[0];
    if (track) track.enabled = !track.enabled;
    return !(track?.enabled ?? true); // returns isCameraOff
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE — Socket listeners
  // Uses socket.on<T>(event).subscribe() — matching your SocketService pattern
  // ═══════════════════════════════════════════════════════════════════════════

  private listen(): void {

    // ── Step 1: Someone is calling us ──────────────────────────────────────
    this.socket.on<any>('callOffer').subscribe(({ from, callType, callerName, callerAvatar, callId }) => {
      if (this.callState$.value.status !== 'idle') {
        this.socket.emit('callBusy', { to: from, callId });
        this.updateDB('busy');
        return;
      }
      this.startRing();
      this.callState$.next({ status: 'incoming', callType, callId, remoteUserId: from, remoteUserName: callerName, remoteUserAvatar: callerAvatar });
    });

    // ── Step 2: Callee accepted → NOW caller creates and sends SDP offer ───
    // This fixes the mobile bug — callee has their PeerConnection ready now
    this.socket.on<any>('callAccepted').subscribe(async ({ from }) => {
      this.stopRing();
      clearTimeout(this.callTimeout);
      this.callState$.next({ ...this.callState$.value, status: 'active' });

      // Create PC, add tracks, create offer
      this.createPC(from);
      this.localStream!.getTracks().forEach(t => this.pc!.addTrack(t, this.localStream!));

      const offer = await this.pc!.createOffer();
      await this.pc!.setLocalDescription(offer);
      this.socket.emit('sdpOffer', { to: from, offer });
    });

    // ── Step 3: Callee receives SDP offer → sends answer ───────────────────
    this.socket.on<any>('sdpOffer').subscribe(async ({ from, offer }) => {
      await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
      this.remoteDescSet = true;
      await this.flushIceQueue(); // drain any queued ICE candidates

      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      this.socket.emit('sdpAnswer', { to: from, answer });
    });

    // ── Step 4: Caller receives SDP answer ─────────────────────────────────
    this.socket.on<any>('sdpAnswer').subscribe(async ({ answer }) => {
      await this.pc!.setRemoteDescription(new RTCSessionDescription(answer));
      this.remoteDescSet = true;
      await this.flushIceQueue();
    });

    // ── Step 5: ICE candidates — queue until remoteDesc is set ─────────────
    // This was silently dropping candidates before — now they are queued
    this.socket.on<any>('iceCandidate').subscribe(async ({ candidate }) => {
      if (!candidate) return;
      if (this.remoteDescSet && this.pc) {
        try { await this.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      } else {
        this.iceCandidateQueue.push(candidate); // will be flushed after remoteDesc
      }
    });

    // ── ICE restart when mobile switches WiFi ↔ 4G ─────────────────────────
    this.socket.on<any>('iceRestart').subscribe(async ({ from }) => {
      if (!this.pc) return;
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      this.socket.emit('sdpOffer', { to: from, offer });
    });

    // ── Call control ────────────────────────────────────────────────────────
    this.socket.on<any>('callRejected').subscribe(() => this.cleanupAndReset());
    this.socket.on<any>('callCancelled').subscribe(() => this.cleanupAndReset());
    this.socket.on<any>('callBusy').subscribe(() => this.cleanupAndReset());

    this.socket.on<any>('callEnded').subscribe(() => {
      // If we (callee) were active and caller ended → we update DB
      if (this.isCallee && this.callState$.value.status === 'active') {
        this.updateDB('ended');
      }
      this.cleanupAndReset();
    });

    this.socket.on<any>('userDisconnected').subscribe(({ userId }) => {
      if (userId !== this.callState$.value.remoteUserId) return;
      const { status } = this.callState$.value;
      if (this.isCallee && status === 'active')   this.updateDB('ended');
      if (this.isCallee && status === 'incoming') this.updateDB('missed');
      this.cleanupAndReset();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE — WebRTC helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private createPC(remoteUserId: string): void {
    this.pc = new RTCPeerConnection(ICE_CONFIG);

    // Send our ICE candidates to the other side
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.socket.emit('iceCandidate', { to: remoteUserId, candidate });
    };

    // If ICE fails (mobile network change) → request restart
    this.pc.oniceconnectionstatechange = () => {
      if (this.pc?.iceConnectionState === 'failed') {
        this.socket.emit('iceRestart', { to: remoteUserId });
      }
    };

    // Connection state changes
    this.pc.onconnectionstatechange = () => {
      const s = this.pc?.connectionState;
      if (s === 'failed' || s === 'disconnected') {
        if (this.isCallee && this.callState$.value.status === 'active') this.updateDB('ended');
        this.cleanupAndReset();
      }
    };

    // Receive remote audio/video tracks
    this.pc.ontrack = ({ streams }) => {
      if (streams[0]) this.remoteStream$.next(streams[0]);
    };
  }

  /** Drain ICE candidates that arrived before setRemoteDescription was called */
  private async flushIceQueue(): Promise<void> {
    while (this.iceCandidateQueue.length > 0) {
      try { await this.pc?.addIceCandidate(new RTCIceCandidate(this.iceCandidateQueue.shift()!)); } catch {}
    }
  }

  private updateDB(status: string): void {
    const callId = this.callState$.value.callId;
    if (!callId) return;
    this.app.patch<any>(API.endPoint.updateCallStatus, { callId, status }).subscribe();
  }

  private startRing(): void {
    this.stopRing();
    this.ringtone = new Audio('/ringtone.mp3');
    this.ringtone.loop = true;
    this.ringtone.play().catch(() => {});
  }

  private stopRing(): void {
    if (this.ringtone) { this.ringtone.pause(); this.ringtone.currentTime = 0; this.ringtone = null; }
  }

  private cleanupAndReset(): void {
    clearTimeout(this.callTimeout);
    this.callTimeout = null;
    this.stopRing();
    this.pc?.close();
    this.pc = null;
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.remoteStream$.next(null);
    this.iceCandidateQueue = [];
    this.remoteDescSet     = false;
    this.isCallee          = false;
    this.callState$.next(IDLE);
  }
}