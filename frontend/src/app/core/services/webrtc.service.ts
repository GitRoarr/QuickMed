import { Injectable, OnDestroy, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '@environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WebRtcService implements OnDestroy {
  private socket?: Socket;
  private pc?: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStream?: MediaStream;
  private roomId?: string;

  private readonly auth = inject(AuthService);

  getLocalStream() { return this.localStream; }
  getRemoteStream() { return this.remoteStream; }

  async init(roomId: string) {
    this.roomId = roomId;
    this.connectSocket();
    await this.setupMedia();
    this.createPeerConnection();
    this.registerSocketHandlers();
    this.socket?.emit('webrtc:join', { roomId });
  }

  private connectSocket() {
    if (this.socket) return;
    this.socket = io(environment.apiUrl.replace('/api', ''), {
      transports: ['websocket'],
      auth: { token: this.auth.getToken() },
    });
  }

  private async setupMedia() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.remoteStream = new MediaStream();
  }

  private createPeerConnection() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    this.localStream?.getTracks().forEach((t) => this.pc!.addTrack(t, this.localStream!));
    this.pc.ontrack = (evt) => {
      evt.streams[0].getTracks().forEach((t) => this.remoteStream!.addTrack(t));
    };
    this.pc.onicecandidate = (evt) => {
      if (evt.candidate && this.roomId) {
        this.socket?.emit('webrtc:ice', { roomId: this.roomId, candidate: evt.candidate });
      }
    };
  }

  private registerSocketHandlers() {
    this.socket?.on('webrtc:room-info', async ({ participants }) => {
      if (participants > 1) {
        await this.makeOffer();
      }
    });

    this.socket?.on('webrtc:offer', async ({ sdp }) => {
      if (!this.pc) return;
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      if (this.roomId) this.socket?.emit('webrtc:answer', { roomId: this.roomId, sdp: answer });
    });

    this.socket?.on('webrtc:answer', async ({ sdp }) => {
      if (!this.pc) return;
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    this.socket?.on('webrtc:ice', async ({ candidate }) => {
      try {
        await this.pc?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Failed to add ICE', e);
      }
    });
  }

  private async makeOffer() {
    if (!this.pc) return;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    if (this.roomId) this.socket?.emit('webrtc:offer', { roomId: this.roomId, sdp: offer });
  }

  toggleMic(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  toggleCamera(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  async hangup() {
    if (this.roomId) this.socket?.emit('webrtc:leave', { roomId: this.roomId });
    this.pc?.getSenders().forEach((s) => s.track && s.track.stop());
    this.pc?.close();
    this.pc = undefined;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = undefined;
    this.remoteStream = undefined;
  }

  ngOnDestroy(): void {
    this.hangup();
    this.socket?.disconnect();
    this.socket = undefined;
  }
}
