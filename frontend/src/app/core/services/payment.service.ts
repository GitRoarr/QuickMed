import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface InitializePaymentResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface PaymentDetails {
  id: string;
  transactionId: string;
  appointmentId: string;
  patientId: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  method: 'stripe' | 'cash' | 'card';
  currency: string;
  description: string;
  paidAt?: string;
  failureReason?: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  // Stripe Checkout
  createStripeCheckout(data: { appointmentId: string; email?: string; amount?: number }): Observable<InitializePaymentResponse> {
    return this.http.post<InitializePaymentResponse>(`${this.apiUrl}/stripe/checkout`, data);
  }

  // Stripe Payment Intent (optional future flow)
  createStripePaymentIntent(data: { appointmentId: string; email?: string; amount?: number }): Observable<{ clientSecret: string; paymentIntentId: string }> {
    return this.http.post<{ clientSecret: string; paymentIntentId: string }>(`${this.apiUrl}/stripe/create-intent`, data);
  }

  confirmStripePayment(paymentIntentId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/stripe/confirm`, { paymentIntentId });
  }

  getStripePayment(paymentIntentId: string): Observable<PaymentDetails> {
    return this.http.get<PaymentDetails>(`${this.apiUrl}/stripe/payment/${paymentIntentId}`);
  }

  getStripeTransaction(transactionId: string): Observable<PaymentDetails | null> {
    return this.http.get<PaymentDetails | null>(`${this.apiUrl}/stripe/transaction/${transactionId}`);
  }
}
