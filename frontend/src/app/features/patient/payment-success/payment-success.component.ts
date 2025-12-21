import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '@app/core/services/payment.service';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.css']
})
export class PaymentSuccessComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  transactionId = signal<string>('');
  payment = signal<any>(null);
  loading = signal(true);
  verified = signal(false);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const sessionId = params['session_id'] || params['transactionId'];
      if (sessionId) {
        this.transactionId.set(sessionId);
        this.loadPayment(sessionId);
      } else {
        this.loading.set(false);
      }
    });
  }

  loadPayment(transactionId: string) {
    this.paymentService.getStripeTransaction(transactionId).subscribe({
      next: (payment) => {
        this.payment.set(payment);
        this.verified.set(!!payment && payment.status === 'success');
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Payment lookup error:', err);
        this.loading.set(false);
      }
    });
  }

  goToAppointments() {
    this.router.navigate(['/patient/appointments']);
  }
}
