import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  senderType: 'doctor' | 'patient' | 'receptionist';
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  receiver?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface Conversation {
  id: string;
  doctorId?: string;
  patientId?: string;
  receptionistId?: string;
  unreadCount: number;
  lastMessageAt?: string;
  lastMessageContent?: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  receptionist?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private readonly API_URL = `${environment.apiUrl}/messages`;

  constructor(private http: HttpClient) { }

  getConversations(search?: string): Observable<Conversation[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<Conversation[]>(`${this.API_URL}/conversations`, { params });
  }

  getMessages(conversationId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.API_URL}/conversations/${conversationId}`);
  }

  getConversationWith(counterpartyId: string): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.API_URL}/conversations/with/${counterpartyId}`);
  }

  sendMessage(payload: { patientId?: string; doctorId?: string; receptionistId?: string; content: string }): Observable<Message> {
    return this.http.post<Message>(`${this.API_URL}/send`, payload);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.API_URL}/unread-count`);
  }

  deleteConversation(conversationId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/conversations/${conversationId}`);
  }

  createConversation(patientId: string): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.API_URL}/conversations`, { patientId });
  }
}
