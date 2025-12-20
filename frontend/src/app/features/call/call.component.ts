import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WebRtcService } from '../../core/services/webrtc.service';

@Component({
  selector: 'app-call',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './call.component.html',
  styleUrls: ['./call.component.css']
})
export class CallComponent implements OnInit, OnDestroy {
  private webrtc = inject(WebRtcService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  micOn = true;
  camOn = true;

  async ngOnInit() {
    const roomId = this.route.snapshot.paramMap.get('roomId')!;
    await this.webrtc.init(roomId);
    setTimeout(() => {
      const local = this.webrtc.getLocalStream();
      const remote = this.webrtc.getRemoteStream();
      if (this.localVideo && local) this.localVideo.nativeElement.srcObject = local;
      if (this.remoteVideo && remote) this.remoteVideo.nativeElement.srcObject = remote;
    }, 0);
  }

  toggleMic() {
    this.micOn = !this.micOn;
    this.webrtc.toggleMic(this.micOn);
  }

  toggleCam() {
    this.camOn = !this.camOn;
    this.webrtc.toggleCamera(this.camOn);
  }

  async hangup() {
    await this.webrtc.hangup();
    this.router.navigateByUrl('/');
  }

  ngOnDestroy(): void {
    this.webrtc.hangup();
  }
}
