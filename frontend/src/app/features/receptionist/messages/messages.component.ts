import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { DoctorService, DoctorListItem } from '@app/core/services/doctor.service';
import { AuthService } from '@core/services/auth.service';
import { WebSocketService } from '@app/core/services/websocket.service';
import { Subscription } from 'rxjs';

interface MessageThread {
  id?: string;
  receiverId: string;
  receiverRole: 'patient' | 'doctor';
  receiverName: string;
  receiverAvatar?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

@Component({
  selector: 'app-receptionist-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SidebarComponent],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css'],
})
export class ReceptionistMessagesComponent implements OnInit, OnDestroy {
  private readonly receptionistService = inject(ReceptionistService);
  private readonly doctorService = inject(DoctorService);
  private readonly wsService = inject(WebSocketService);
  authService = inject(AuthService);

  private subscriptions = new Subscription();

  menuItems = [
    { label: 'Dashboard', icon: 'bi-speedometer2', route: '/receptionist/dashboard', exact: true },
    { label: 'Appointments', icon: 'bi-calendar-check', route: '/receptionist/appointments' },
    { label: 'Patients', icon: 'bi-people', route: '/receptionist/patients' },
    { label: 'Messages', icon: 'bi-chat-dots', route: '/receptionist/messages' },
    { label: 'Payments', icon: 'bi-cash-stack', route: '/receptionist/payments' },
    { label: 'Doctors', icon: 'bi-stethoscope', route: '/receptionist/doctors' },
    { label: 'Reports', icon: 'bi-bar-chart', route: '/receptionist/reports' },
  ];

  secondaryItems = [
    { label: 'Settings', icon: 'bi-gear', route: '/receptionist/settings' },
    { label: 'Logout', icon: 'bi-box-arrow-right', route: '/receptionist/logout' },
  ];

  threads = signal<MessageThread[]>([]);
  patients = signal<any[]>([]);
  doctors = signal<DoctorListItem[]>([]);
  selectedReceiverId = signal<string>('');
  selectedReceiverRole = signal<'patient' | 'doctor' | 'receptionist'>('patient');
  messages = signal<any[]>([]);
  draft = signal('');
  search = signal('');
  loading = signal(false);
  isTyping = signal(false);
  otherUserTyping = signal(false);

  showEmojiPicker = signal(false);
  showGifPicker = signal(false);
  gifSearchQuery = signal('');
  gifs = signal<any[]>([]);

  emojis = ['😊', '👋', '👍', '🏥', '📅', '💊', '🩺', '✅', '❌', '❤️', '🙏', '📞', '💉', '🩹', '🌡️', '🤒'];

  filteredThreads = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.threads();
    return this.threads().filter((t) => t.receiverName?.toLowerCase().includes(q));
  });

  selectedThread = computed(() =>
    this.threads().find((t) => t.receiverId === this.selectedReceiverId())
  );

  constructor() {
    // Auto-scroll effect
    effect(() => {
      this.messages();
      setTimeout(() => this.scrollToBottom(), 100);
    });
  }

  get searchValue(): string {
    return this.search();
  }

  set searchValue(value: string) {
    this.search.set(value);
  }

  get draftValue(): string {
    return this.draft();
  }

  set draftValue(value: string) {
    this.draft.set(value);
    this.emitTyping();
  }

  ngOnInit(): void {
    this.loadRecipients();
    this.loadThreads();
    this.wsService.connectMessages();

    this.subscriptions.add(
      this.wsService.messages$.subscribe(msg => {
        if (msg.conversationId === this.selectedThread()?.id ||
          msg.senderId === this.selectedReceiverId() ||
          msg.receiverId === this.selectedReceiverId()) {
          this.messages.update(prev => [...prev, msg]);
        }
        this.loadThreads();
      })
    );

    this.subscriptions.add(
      this.wsService.typing$.subscribe(data => {
        if (data.userId === this.selectedReceiverId()) {
          this.otherUserTyping.set(data.isTyping);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadRecipients(): void {
    this.receptionistService.listPatients().subscribe({
      next: (list) => this.patients.set(list || []),
      error: () => this.patients.set([]),
    });

    this.doctorService.listDoctors().subscribe({
      next: (list) => this.doctors.set(list || []),
      error: () => this.doctors.set([]),
    });
  }

  loadThreads(): void {
    this.loading.set(true);
    this.receptionistService.listMessageThreads().subscribe({
      next: (list) => {
        this.threads.set(list || []);
        if (!this.selectedReceiverId() && list?.length) {
          this.selectThread(list[0]);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selectThread(thread: MessageThread): void {
    this.selectedReceiverId.set(thread.receiverId);
    this.selectedReceiverRole.set(thread.receiverRole);
    this.loadMessages();
    this.otherUserTyping.set(false);
    if (thread.id) {
      this.wsService.joinConversation(thread.id);
    }
  }
  

  deselectThread(): void {
    this.selectedReceiverId.set('');
    this.selectedReceiverRole.set('patient');
    this.messages.set([]);
  }

  loadMessages(): void {
    const receiverId = this.selectedReceiverId();
    if (!receiverId) return;
    this.receptionistService.getMessageThread(receiverId).subscribe({
      next: (list) => this.messages.set(list || []),
      error: () => this.messages.set([]),
    });
  }

  send(): void {
    const receiverId = this.selectedReceiverId();
    const content = this.draft().trim();
    if (!receiverId || !content) return;

    // Use socket for real-time feel
    this.wsService.sendMessage({
      content,
      receiverId,
      receiverRole: this.selectedReceiverRole() as any,
    } as any);

    // Optimistic update
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      const optimisticMsg = {
        senderId: currentUser.id,
        content,
        createdAt: new Date().toISOString(),
      };
      // We don't push yet, we wait for socket message back or we just push and let socket replace/deduplicate
      // For now, let's just wait for socket message back from server to avoid duplicates
    }

    this.draft.set('');
    this.showEmojiPicker.set(false);
    this.showGifPicker.set(false);
  }

  emitTyping(): void {
    const conv = this.selectedThread();
    if (conv?.id) {
      this.wsService.sendTyping(conv.id, this.draft().length > 0);
    }
  }

  startNewMessage(role: 'patient' | 'doctor', id: string): void {
    this.selectedReceiverRole.set(role);
    this.selectedReceiverId.set(id);
    this.loadMessages();
    this.showEmojiPicker.set(false);
    this.showGifPicker.set(false);
  }

  addEmoji(emoji: string): void {
    this.draft.update(v => v + emoji);
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker.update(v => !v);
    if (this.showEmojiPicker()) this.showGifPicker.set(false);
  }

  toggleGifPicker(): void {
    this.showGifPicker.update(v => !v);
    if (this.showGifPicker()) {
      this.showEmojiPicker.set(false);
      this.searchGifs();
    }
  }

  searchGifs(): void {
    const query = this.gifSearchQuery() || 'medical';
    // Using a public Giphy-like API or just some static GIFs for "Amazing UI" if no key
    // For now, let's just use some nice placeholders or static ones to demonstrate
    this.gifs.set([
      { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHYzeXN4NXQ1Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKMGpxxXLyKJWms/giphy.gif' },
      { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHYzeXN4NXQ1Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/dpSrtdqY08Tsc/giphy.gif' },
      { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHYzeXN4NXQ1Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/I69VIn6eCscQU/giphy.gif' },
      { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHYzeXN4NXQ1Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlxH009S08A2SGs/giphy.gif' },
    ]);
  }

  selectGif(gif: any): void {
    this.draft.set(`![gif](${gif.url})`);
    this.send();
  }

  scrollToBottom(): void {
    const el = document.querySelector('.messages-container');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}

