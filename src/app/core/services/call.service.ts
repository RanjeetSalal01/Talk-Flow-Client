import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SocketService } from './socket.service';
import { AppService } from './app.service';
import { API } from '../config/api';

export interface CallState {
  status: 'idle' | 'calling' | 'incoming' | 'active';
  callType: 'audio' | 'video' | null;
  remoteUserId: string | null;
  remoteUserName: string | null;
  remoteUserAvatar: string | null;
}

@Injectable({ providedIn: 'root' })
export class CallService {
  private state = new BehaviorSubject<CallState>({
    status: 'idle',
    callType: null,
    remoteUserId: null,
    remoteUserName: null,
    remoteUserAvatar: null,
  });

  callState$ = this.state.asObservable();

  pc: RTCPeerConnection | null = null;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;

  private pendingOffer: RTCSessionDescriptionInit | null = null;
  private currentCallId: string | null = null;
  private isCallee = false;
  private callTimeout: any = null;
  private ringtone: HTMLAudioElement | null = null;

  private iceConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  constructor(
    private socket: SocketService,
    private app: AppService,
  ) {
    this.listen();
  }

  private listen(): void {
    // ✅ incoming call
    this.socket
      .on<any>('callOffer')
      .subscribe(({ from, offer, callType, callerName, callerAvatar, callId }) => {
        if (this.state.value.status !== 'idle') {
          this.socket.emit('callBusy', { to: from, callId });
          return;
        }
        this.pendingOffer = offer;
        this.currentCallId = callId;
        this.isCallee = true;
        this.startRing();
        this.state.next({
          status: 'incoming',
          callType,
          remoteUserId: from,
          remoteUserName: callerName,
          remoteUserAvatar: callerAvatar,
        });
      });

    // ✅ callee answered
    this.socket.on<any>('callAnswer').subscribe(async ({ answer }) => {
      await this.pc?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // ✅ ice candidate
    this.socket.on<any>('iceCandidate').subscribe(async ({ candidate }) => {
      if (candidate) {
        try {
          await this.pc?.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {}
      }
    });

    // ✅ callee rejected → caller just resets UI, callee already updated DB
    this.socket.on<any>('callRejected').subscribe(() => {
      this.cleanupMedia();
      this.state.next({
        status: 'idle',
        callType: null,
        remoteUserId: null,
        remoteUserName: null,
        remoteUserAvatar: null,
      });
    });

    // ✅ other side ended call
    this.socket.on<any>('callEnded').subscribe(() => {
      const status = this.state.value.status;
      // ✅ if callee was active and caller ended → callee updates ended
      if (this.isCallee && status === 'active') {
        this.updateDB('ended');
      }
      this.cleanupAndReset();
    });

    // ✅ caller cancelled before callee picked up → callee resets UI only
    this.socket.on<any>('callCancelled').subscribe(() => {
      this.cleanupAndReset();
    });

    // ✅ callee was busy
    this.socket.on<any>('callBusy').subscribe(() => {
      this.cleanupAndReset();
    });

    // ✅ other user disconnected mid call
    this.socket.on<any>('userDisconnected').subscribe(({ userId }) => {
      if (userId === this.state.value.remoteUserId) {
        const status = this.state.value.status;
        if (this.isCallee && status === 'active') {
          this.updateDB('ended'); // ✅ callee marks ended if caller disconnected
        }
        if (this.isCallee && status === 'incoming') {
          this.updateDB('missed'); // ✅ caller disconnected before callee picked up
        }
        this.cleanupAndReset();
      }
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async startCall(
    remoteUserId: string,
    remoteUserName: string,
    remoteUserAvatar: string,
    callType: 'audio' | 'video',
    myName: string,
    myAvatar: string,
  ): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true,
      });
      this.state.next({
        status: 'calling',
        callType,
        remoteUserId,
        remoteUserName,
        remoteUserAvatar,
      });

      this.pc = new RTCPeerConnection(this.iceConfig);
      this.setupPC(remoteUserId);
      this.localStream.getTracks().forEach((t) => this.pc!.addTrack(t, this.localStream!));

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // ✅ create DB record first then emit offer
      this.app
        .post<any>(API.endPoint.initiateCall, { receiverId: remoteUserId, callType })
        .subscribe({
          next: (res) => {
            this.currentCallId = res.callId;
            this.socket.emit('callOffer', {
              to: remoteUserId,
              offer,
              callType,
              callerName: myName,
              callerAvatar: myAvatar,
              callId: res.callId,
            });
            this.startRing();
            // ✅ 30s timeout
            this.callTimeout = setTimeout(() => {
              if (this.state.value.status === 'calling') {
                // ✅ caller cancels → notify callee → caller updates missed
                this.socket.emit('callCancelled', { to: remoteUserId, callId: this.currentCallId });
                this.updateDB('missed');
                this.currentCallId = null;
                this.cleanupAndReset();
              }
            }, 30000);
          },
          error: () => {
            console.error('Failed to create call record');
            this.cleanupAndReset();
          },
        });
    } catch (err) {
      console.error('startCall error:', err);
      this.cleanupAndReset();
    }
  }

  async acceptCall(): Promise<void> {
    try {
      const { remoteUserId, callType } = this.state.value;
      if (!remoteUserId || !this.pendingOffer) return;

      this.stopRing();

      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true,
      });
      this.pc = new RTCPeerConnection(this.iceConfig);
      this.setupPC(remoteUserId);
      this.localStream.getTracks().forEach((t) => this.pc!.addTrack(t, this.localStream!));

      await this.pc.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.socket.emit('callAnswer', { to: remoteUserId, answer });

      this.pendingOffer = null;
      this.state.next({ ...this.state.value, status: 'active' });

      // ✅ callee updates active + startedAt
      this.updateDB('active');
    } catch (err) {
      console.error('acceptCall error:', err);
      this.cleanupAndReset();
    }
  }

  rejectCall(): void {
    const { remoteUserId } = this.state.value;
    this.stopRing();
    this.socket.emit('callRejected', { to: remoteUserId, callId: this.currentCallId });
    // ✅ callee updates rejected
    this.updateDB('rejected');
    this.currentCallId = null;
    this.cleanupAndReset();
  }

  endCall(): void {
    const { remoteUserId } = this.state.value;
    const status = this.state.value.status;
    this.socket.emit('callEnded', { to: remoteUserId, callId: this.currentCallId });

    if (this.isCallee && status === 'active') {
      // ✅ callee ends active call → callee updates ended
      this.updateDB('ended');
    } else if (!this.isCallee && status === 'calling') {
      // ✅ caller cancels while ringing → caller updates missed
      this.socket.emit('callCancelled', { to: remoteUserId, callId: this.currentCallId });
      this.updateDB('missed');
    } else if (!this.isCallee && status === 'active') {
      // ✅ caller ends active call → caller notifies callee → callee will update via callEnded listener
      // nothing to do here — callee listener handles it
    }

    this.currentCallId = null;
    this.cleanupAndReset();
  }

  toggleMute(): boolean {
    const track = this.localStream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      return !track.enabled;
    }
    return false;
  }

  toggleCamera(): boolean {
    const track = this.localStream?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      return !track.enabled;
    }
    return false;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private setupPC(remoteUserId: string): void {
    this.pc!.onicecandidate = (e) => {
      if (e.candidate)
        this.socket.emit('iceCandidate', { to: remoteUserId, candidate: e.candidate });
    };
    this.pc!.ontrack = (e) => {
      this.remoteStream = e.streams[0];
    };
    this.pc!.onconnectionstatechange = () => {
      const s = this.pc?.connectionState;
      if (s === 'connected') {
        this.stopRing();
        this.state.next({ ...this.state.value, status: 'active' });
      }
      if (s === 'failed' || s === 'disconnected') {
        // ✅ connection failed mid call
        if (this.isCallee && this.state.value.status === 'active') {
          this.updateDB('ended');
        }
        this.currentCallId = null;
        this.cleanupAndReset();
      }
    };
  }

  private updateDB(status: string): void {
    if (!this.currentCallId) return;
    this.app
      .patch<any>(API.endPoint.updateCallStatus, {
        callId: this.currentCallId,
        status,
      })
      .subscribe();
  }

  private startRing(): void {
    this.stopRing();
    this.ringtone = new Audio('/ringtone.mp3');
    this.ringtone.loop = true;
    this.ringtone.play().catch(() => {});
  }

  private stopRing(): void {
    if (this.ringtone) {
      this.ringtone.pause();
      this.ringtone.currentTime = 0;
      this.ringtone = null;
    }
  }

  private cleanupMedia(): void {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.remoteStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.pc?.close();
    this.pc = null;
    this.pendingOffer = null;
  }

  private cleanupAndReset(): void {
    this.stopRing();
    if (this.callTimeout) {
      clearTimeout(this.callTimeout);
      this.callTimeout = null;
    }
    this.cleanupMedia();
    this.isCallee = false;
    this.currentCallId = null;
    this.state.next({
      status: 'idle',
      callType: null,
      remoteUserId: null,
      remoteUserName: null,
      remoteUserAvatar: null,
    });
  }
}
