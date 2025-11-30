import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface InitializePaymentRequest {
  appointmentId: string;
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  amount?: number;
}

export interface InitializePaymentResponse {
  transactionId: string;
  checkoutUrl: string;
  status: string;
  amount: number;
  currency: string;
  message: string;
}

export interface VerifyPaymentRequest {
  transactionId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  payment: any;
  message: string;
}

export interface PaymentDetails {
  id: string;
  transactionId: string;
  chapaReference: string;
  appointmentId: string;
  patientId: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  method: 'chapa' | 'cash' | 'card';
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

  initializePayment(data: InitializePaymentRequest): Observable<InitializePaymentResponse> {
    return this.http.post<InitializePaymentResponse>(`${this.apiUrl}/initialize`, data);
  }

  verifyPayment(transactionId: string): Observable<VerifyPaymentResponse> {
    return this.http.post<VerifyPaymentResponse>(`${this.apiUrl}/verify`, { transactionId });
  }

  verifyPaymentGet(transactionId: string): Observable<VerifyPaymentResponse> {
    return this.http.get<VerifyPaymentResponse>(`${this.apiUrl}/verify/${transactionId}`);
  }

  getPaymentDetails(transactionId: string): Observable<PaymentDetails> {
    return this.http.get<PaymentDetails>(`${this.apiUrl}/transaction/${transactionId}`);
  }

  getAppointmentPayments(appointmentId: string): Observable<PaymentDetails[]> {
    return this.http.get<PaymentDetails[]>(`${this.apiUrl}/appointment/${appointmentId}`);
  }

  // Stripe Payment Methods
  createStripePaymentIntent(data: { appointmentId: string; email?: string; amount?: number }): Observable<{ clientSecret: string; paymentIntentId: string }> {
    return this.http.post<{ clientSecret: string; paymentIntentId: string }>(`${this.apiUrl}/stripe/create-intent`, data);
  }

  confirmStripePayment(paymentIntentId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/stripe/confirm`, { paymentIntentId });
  }

  getStripePayment(paymentIntentId: string): Observable<PaymentDetails> {
    return this.http.get<PaymentDetails>(`${this.apiUrl}/stripe/payment/${paymentIntentId}`);
  }
}
