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
})
export class AlertMessageComponent implements OnInit, OnDestroy {
  /** message text shown in the alert */
  @Input() message = '';
  /** 'success' | 'error' determines colors and icon */
  @Input() type: 'success' | 'error' = 'success';
  /** automatically hide after `duration` ms */
  @Input() autoDismiss = true;
  /** milliseconds to auto dismiss */
  @Input() duration = 4000;
  /** show icon */
  @Input() showIcon = true;
  /** control visibility from parent */
  @Input() visible = false;

  @Output() closed = new EventEmitter<void>();

  // internal state for animation
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

  private clearTimer() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
