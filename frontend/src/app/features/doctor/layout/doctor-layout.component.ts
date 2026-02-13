import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';

@Component({
  selector: 'app-doctor-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, DoctorSidebarComponent],
  template: `
    <div class="flex h-screen bg-[var(--bg)] text-[var(--fg)] overflow-hidden relative">
      <!-- Mobile Menu Trigger -->
      <button
        *ngIf="!sidebarOpen()"
        type="button"
        class="md:hidden fixed top-4 left-4 z-[70] w-12 h-12 rounded-2xl bg-[var(--surface)] shadow-xl flex items-center justify-center border border-[var(--border)] text-[var(--primary)] active:scale-95 transition-all"
        (click)="toggleSidebar()"
        aria-label="Open sidebar"
      >
        <i class="bi bi-list text-2xl"></i>
      </button>

      <!-- Mobile Overlay -->
      <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden transition-all duration-300"
        [class.opacity-100]="sidebarOpen()"
        [class.visible]="sidebarOpen()"
        [class.opacity-0]="!sidebarOpen()"
        [class.invisible]="!sidebarOpen()"
        (click)="closeSidebar()"
      ></div>

      <!-- Sidebar Wrapper -->
      <app-doctor-sidebar
        class="z-[60]"
        [isOpen]="sidebarOpen()"
        (closed)="closeSidebar()"
      ></app-doctor-sidebar>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
          <div class="max-w-7xl mx-auto w-full">
            <router-outlet></router-outlet>
          </div>
        </main>
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
