import { Component, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PaymentService } from '@app/core/services/payment.service';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-pay-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pay-button.component.html',
  styleUrls: ['./pay-button.component.css']
})
export class PayButtonComponent {
  @Input() appointmentId: string = '';
  @Input() paymentStatus: string = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() variant: 'primary' | 'outline' = 'primary';
  @Input() method: 'stripe' | 'cash' = 'stripe';

  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private router = inject(Router);

  processing = signal(false);
  error = signal<string>('');

  get isPaid(): boolean {
    return this.paymentStatus === 'paid';
  }

  get canPay(): boolean {
    return !this.isPaid && !this.processing() && !!this.appointmentId;
  }

  handlePayment() {
    if (!this.canPay) return;

    this.processing.set(true);
    this.error.set('');

    const user = this.authService.currentUser();
    if (this.method === 'cash') {
      const cashData = {
        appointmentId: this.appointmentId,
        amount: 50,
        currency: 'USD',
        note: 'Cash payment recorded via receptionist UI'
      };
      this.paymentService.createCashPayment(cashData).subscribe({
        next: () => {
          this.paymentStatus = 'paid';
          this.processing.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to record cash payment');
          this.processing.set(false);
        }
      });
    } else {
      const paymentData = {
        appointmentId: this.appointmentId,
        email: user?.email,
      };
      this.paymentService.createStripeCheckout(paymentData).subscribe({
        next: (response) => {
          if (response.checkoutUrl) {
            window.location.href = response.checkoutUrl;
          } else {
            this.error.set('Failed to get Stripe checkout URL');
            this.processing.set(false);
          }
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to start payment');
          this.processing.set(false);
        }
      });
    }
  }

  goToPayment() {
    this.router.navigate(['/patient/payment'], {
      queryParams: { appointmentId: this.appointmentId }
    });
  }
}
