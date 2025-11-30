import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { PaymentService } from '@app/core/services/payment.service';
import { AppointmentService } from '@app/core/services/appointment.service';
import { AuthService } from '@app/core/services/auth.service';
import { Appointment } from '@app/core/models/appointment.model';
import { environment } from '@environments/environment';
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';

@Component({
  selector: 'app-stripe-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertMessageComponent, DatePipe],
  templateUrl: './stripe-payment.component.html',
  styleUrls: ['./stripe-payment.component.css']
})
export class StripePaymentComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  appointmentId = signal<string>('');
  appointment = signal<Appointment | null>(null);
  loading = signal(false);
  processing = signal(false);
  error = signal<string>('');
  success = signal(false);

  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  cardElement: StripeCardElement | null = null;
  clientSecret = signal<string>('');
  paymentIntentId = signal<string>('');

  paymentForm: FormGroup;

  constructor() {
    this.paymentForm = this.fb.group({
      name: ['', [Validators.required]],
    });
  }

  async ngOnInit() {
    // Initialize Stripe
    this.stripe = await loadStripe(environment.stripePublishableKey);
    if (!this.stripe) {
      this.error.set('Failed to load Stripe. Please refresh the page.');
      return;
    }

    // Get appointment ID from route
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
    this.appointmentService.getOne(id).subscribe({
      next: (appointment: Appointment) => {
        this.appointment.set(appointment);
        this.loading.set(false);
        this.initializePayment();
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Failed to load appointment');
        this.loading.set(false);
      }
    });
  }

  initializePayment() {
    const appointment = this.appointment();
    if (!appointment || appointment.paymentStatus === 'paid') {
      this.error.set('This appointment is already paid');
      return;
    }

    this.loading.set(true);
    const user = this.authService.currentUser();

    this.paymentService.createStripePaymentIntent({
      appointmentId: this.appointmentId(),
      email: user?.email,
      // Amount will be determined by backend from appointment
    }).subscribe({
      next: (response) => {
        this.clientSecret.set(response.clientSecret);
        this.paymentIntentId.set(response.paymentIntentId);
        this.setupStripeElements();
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Failed to initialize payment');
        this.loading.set(false);
      }
    });
  }

  setupStripeElements() {
    if (!this.stripe || !this.clientSecret()) return;

    this.elements = this.stripe.elements({
      clientSecret: this.clientSecret(),
      appearance: {
        theme: 'stripe',
      },
    });

    // Create and mount card element
    this.cardElement = this.elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#424770',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
        invalid: {
          color: '#9e2146',
        },
      },
    });

    const cardElementContainer = document.getElementById('card-element');
    if (cardElementContainer) {
      this.cardElement.mount(cardElementContainer);
    }
  }

  async handleSubmit() {
    if (this.paymentForm.invalid || !this.stripe || !this.cardElement || !this.clientSecret()) {
      return;
    }

    this.processing.set(true);
    this.error.set('');

    const { error: submitError } = await this.stripe.confirmCardPayment(
      this.clientSecret(),
      {
        payment_method: {
          card: this.cardElement,
          billing_details: {
            name: this.paymentForm.get('name')?.value,
          },
        },
      }
    );

    if (submitError) {
      this.error.set(submitError.message || 'Payment failed');
      this.processing.set(false);
      return;
    }

    // Confirm payment on backend
    this.paymentService.confirmStripePayment(this.paymentIntentId()).subscribe({
      next: (payment) => {
        this.success.set(true);
        this.processing.set(false);
        setTimeout(() => {
          this.router.navigate(['/patient/payment-success'], {
            queryParams: { 
              appointmentId: this.appointmentId(),
              transactionId: this.paymentIntentId()
            }
          });
        }, 2000);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Failed to confirm payment');
        this.processing.set(false);
      }
    });
  }

  cancel() {
    this.router.navigate(['/patient/appointments']);
  }
}
