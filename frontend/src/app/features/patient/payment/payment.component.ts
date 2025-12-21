import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '@app/core/services/payment.service';
import { AppointmentService } from '@app/core/services/appointment.service';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  appointmentId = signal<string>('');
  appointment = signal<any>(null);
  loading = signal(false);
  error = signal<string>('');
  processing = signal(false);

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

  loadAppointment(id: string) {
    this.loading.set(true);
    this.appointmentService.getAppointmentById(id).subscribe({
      next: (appointment) => {
        this.appointment.set(appointment);
        this.loading.set(false);
        
        if (appointment.paymentStatus === 'paid') {
          this.error.set('This appointment is already paid');
        }
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load appointment');
        this.loading.set(false);
      }
    });
  }

  proceedToPayment() {
    if (!this.appointmentId()) {
      this.error.set('Invalid appointment');
      return;
    }

    const appointment = this.appointment();
    if (appointment?.paymentStatus === 'paid') {
      this.error.set('This appointment is already paid');
      return;
    }

    this.processing.set(true);
    this.error.set('');

    const user = this.authService.currentUser();
    const paymentData = {
      appointmentId: this.appointmentId(),
      email: user?.email,
      amount: 50,
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
        this.error.set(err.error?.message || 'Failed to start Stripe checkout');
        this.processing.set(false);
      }
    });
  }

  cancel() {
    this.router.navigate(['/patient/appointments']);
  }
}
