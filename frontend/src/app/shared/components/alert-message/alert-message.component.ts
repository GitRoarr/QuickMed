import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-alert-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert-message.component.html',
  styleUrls: ['./alert-message.component.css'],
})
export class AlertMessageComponent implements OnInit, OnDestroy {
  @Input() message = '';
  @Input() type: 'success' | 'error' | 'info' = 'success';
  @Input() autoDismiss = true;
  @Input() duration = 4000;
  @Input() showIcon = true;
  @Input() visible = false;

  @Output() closed = new EventEmitter<void>();

  // Internal state for animation & rendering
  isRendered = false;
  isVisible = false;

  private hideTimer: any = null;

  ngOnInit(): void {
    if (this.visible) this.show();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  show() {
    this.clearTimer();
    this.isRendered = true;
    // allow template to render then trigger enter animation
    setTimeout(() => (this.isVisible = true), 10);
    if (this.autoDismiss) {
      this.hideTimer = setTimeout(() => this.hide(), this.duration);
    }
  }

  hide() {
    this.clearTimer();
    this.isVisible = false;
    // wait for exit animation to complete before removing from DOM
    setTimeout(() => {
      this.isRendered = false;
      this.closed.emit();
    }, 300);
  }

  toggle() {
    if (this.isVisible) this.hide();
    else this.show();
  }

  // Backwards-compatible alias for callers expecting `close()`
  close() {
    this.hide();
  }

  private clearTimer() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
