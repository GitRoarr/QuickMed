import { Component, OnInit, signal, inject, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '@app/core/services/payment.service';
import { AppointmentService } from '@app/core/services/appointment.service';
import { AuthService } from '@app/core/services/auth.service';
import { StripeService, NgxStripeModule } from 'ngx-stripe';
import { ToastService } from '@app/core/services/toast.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, NgxStripeModule],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent implements OnInit, OnDestroy {
  private paymentService = inject(PaymentService);
  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);
  private stripeService = inject(StripeService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  appointmentId = signal<string>('');
  appointment = signal<any>(null);
  loading = signal(false);
  error = signal<string>('');
  processing = signal(false);
  paymentMethod = signal<'CARD' | 'CASH' | null>('CARD');

  private card: any;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const id = params['appointmentId'] || this.route.snapshot.params['id'];
      if (id) {
        this.appointmentId.set(id);
        this.loadAppointment(id);
      } else {
        this.error.set('No appointment ID provided');
      }
    });
  }

  ngOnDestroy() {
    if (this.card) {
      this.card.destroy();
    }
  }

  loadAppointment(id: string) {
    this.loading.set(true);
    this.appointmentService.getAppointmentById(id).subscribe({
      next: (appointment) => {
        this.appointment.set(appointment);
        this.loading.set(false);

        if (appointment.paymentStatus === 'paid') {
          this.toast.info('This appointment is already paid', { title: 'Payment' });
          this.router.navigate(['/patient/appointments']);
          return;
        }

        // Initialize Stripe if CARD is default
        setTimeout(() => this.initializeStripe(), 100);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load appointment');
        this.loading.set(false);
      }
    });
  }

  setPaymentMethod(method: 'CARD' | 'CASH') {
    this.paymentMethod.set(method);
    if (method === 'CARD') {
      setTimeout(() => this.initializeStripe(), 0);
    } else if (this.card) {
      this.card.destroy();
      this.card = null;
    }
  }

  private initializeStripe() {
    if (this.card) return;

    this.stripeService.elements().subscribe(elements => {
      this.card = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#0f172a',
            fontFamily: 'Inter, sans-serif',
            '::placeholder': { color: '#94a3b8' }
          }
        }
      });
      this.card.mount('#stripe-card-element');
    });
  }

  confirmPayment() {
    const method = this.paymentMethod();
    if (method === 'CARD') {
      this.handleCardPayment();
    } else if (method === 'CASH') {
      this.handleCashPayment();
    }
  }

  private handleCardPayment() {
    this.processing.set(true);
    this.error.set('');

    const user = this.authService.currentUser();
    const paymentData = {
      appointmentId: this.appointmentId(),
      email: user?.email,
      amount: 50,
    };

    this.paymentService.createStripePaymentIntent(paymentData).subscribe({
      next: ({ clientSecret }) => {
        this.stripeService.confirmCardPayment(clientSecret, {
          payment_method: { card: this.card }
        }).subscribe({
          next: (result) => {
            if (result.error) {
              this.error.set(result.error.message || 'Payment failed');
              this.processing.set(false);
            } else if (result.paymentIntent?.status === 'succeeded') {
              this.toast.success('Payment successful! Your appointment is confirmed.', { title: 'Success' });
              this.router.navigate(['/patient/appointments']);
            }
          },
          error: (err) => {
            this.error.set('Failed to confirm payment');
            this.processing.set(false);
          }
        });
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to initialize payment');
        this.processing.set(false);
      }
    });
  }

  private handleCashPayment() {
    this.processing.set(true);
    this.error.set('');

    const payload = {
      appointmentId: this.appointmentId(),
      amount: 50,
      note: 'Patient selected to pay at clinic.'
    };

    this.paymentService.createCashPayment(payload).subscribe({
      next: () => {
        this.toast.success('Appointment confirmed! Please remember to pay at the clinic.', { title: 'Done' });
        this.router.navigate(['/patient/appointments']);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to confirm cash payment');
        this.processing.set(false);
      }
    });
  }

  cancel() {
    this.router.navigate(['/patient/appointments']);
  }
}
