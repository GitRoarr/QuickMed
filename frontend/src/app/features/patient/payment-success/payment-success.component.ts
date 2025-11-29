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
      const txRef = params['tx_ref'];
      if (txRef) {
        this.transactionId.set(txRef);
        this.verifyPayment(txRef);
      } else {
        this.loading.set(false);
      }
    });
  }

  verifyPayment(transactionId: string) {
    this.paymentService.verifyPaymentGet(transactionId).subscribe({
      next: (response) => {
        if (response.success) {
          this.payment.set(response.payment);
          this.verified.set(true);
        } else {
          this.verified.set(false);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Payment verification error:', err);
        this.loading.set(false);
      }
    });
  }

  goToAppointments() {
    this.router.navigate(['/patient/appointments']);
  }
}
