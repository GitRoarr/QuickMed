import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';

@Component({
  selector: 'app-doctor-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, DoctorSidebarComponent],
  template: `
    <div class="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden relative"
      [class.overflow-hidden]="sidebarOpen()">
      <button
        *ngIf="!sidebarOpen()"
        type="button"
        class="md:hidden fixed top-4 left-4 z-[70] w-11 h-11 rounded-full bg-[var(--surface)] shadow-lg flex items-center justify-center"
        (click)="toggleSidebar()"
        aria-label="Open sidebar"
      >
        <i class="bi bi-list text-xl"></i>
      </button>

      <div
        class="fixed inset-0 bg-black/40 z-[55] md:hidden transition-opacity"
        *ngIf="sidebarOpen()"
        (click)="closeSidebar()"
      ></div>

      <app-doctor-sidebar
        class="sticky top-0 h-screen"
        [isOpen]="sidebarOpen()"
        (closed)="closeSidebar()"
      ></app-doctor-sidebar>
      <div class="flex-1 min-w-0">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
})
export class DoctorLayoutComponent {
  sidebarOpen = signal(false);

  toggleSidebar(): void {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
