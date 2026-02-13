import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, NavigationEnd, Router } from '@angular/router';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-doctor-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, DoctorSidebarComponent],
  template: `
    <div class="flex h-screen bg-[var(--bg)] text-[var(--fg)] overflow-hidden relative">
      <!-- Hamburger Button (all sizes) -->
      <button
        type="button"
        class="hamburger-btn"
        [class.is-active]="sidebarOpen()"
        (click)="toggleSidebar()"
        aria-label="Toggle sidebar"
      >
        <span class="hamburger-box">
          <span class="hamburger-line hamburger-line--top"></span>
          <span class="hamburger-line hamburger-line--middle"></span>
          <span class="hamburger-line hamburger-line--bottom"></span>
        </span>
      </button>

      <!-- Overlay -->
      <div
        class="sidebar-overlay"
        [class.active]="sidebarOpen()"
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
          <div class="max-w-7xl mx-auto w-full pl-14 md:pl-0">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    /* ============================================
       Premium Animated Hamburger Button
       Visible on Mobile & Tablet (Hidden on Desktop)
       ============================================ */
    .hamburger-btn {
      position: fixed;
      top: 1rem;
      left: 1rem;
      z-index: 70;
      width: 48px;
      height: 48px;
      border-radius: 16px;
      background: var(--surface, #fff);
      border: 1px solid var(--border, #e2e8f0);
      box-shadow:
        0 4px 16px -2px rgba(0, 0, 0, 0.08),
        0 2px 4px -1px rgba(0, 0, 0, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      -webkit-tap-highlight-color: transparent;
    }

    @media (min-width: 1024px) {
      .hamburger-btn {
        display: none;
      }
    }

    .hamburger-btn:hover {
      background: var(--primary, #1DB954);
      border-color: var(--primary, #1DB954);
      box-shadow:
        0 8px 24px -4px rgba(29, 185, 84, 0.3),
        0 4px 8px -2px rgba(29, 185, 84, 0.15);
      transform: scale(1.05);
    }

    .hamburger-btn:hover .hamburger-line {
      background: white;
    }

    .hamburger-btn:active {
      transform: scale(0.92);
    }

    .hamburger-btn.is-active {
      background: var(--primary, #1DB954);
      border-color: var(--primary, #1DB954);
      box-shadow: 0 8px 24px -4px rgba(29, 185, 84, 0.35);
    }

    .hamburger-btn.is-active .hamburger-line {
      background: white;
    }

    .hamburger-box {
      width: 22px;
      height: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }

    .hamburger-line {
      display: block;
      height: 2.5px;
      width: 100%;
      border-radius: 99px;
      background: var(--text-primary, #0f172a);
      transition: all 0.35s cubic-bezier(0.68, -0.6, 0.32, 1.6);
      transform-origin: center;
    }

    .hamburger-line--top {
      width: 100%;
    }

    .hamburger-line--middle {
      width: 70%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .hamburger-line--bottom {
      width: 85%;
    }

    /* Animated X state */
    .hamburger-btn.is-active .hamburger-line--top {
      transform: translateY(6.75px) rotate(45deg);
      width: 100%;
    }

    .hamburger-btn.is-active .hamburger-line--middle {
      opacity: 0;
      width: 0;
      transform: translateX(-10px);
    }

    .hamburger-btn.is-active .hamburger-line--bottom {
      transform: translateY(-6.75px) rotate(-45deg);
      width: 100%;
    }

    /* ============================================
       Overlay — Visible only on Mobile/Tablet
       ============================================ */
    .sidebar-overlay {
      position: fixed;
      inset: 0;
      z-index: 55;
      background: rgba(0, 0, 0, 0);
      backdrop-filter: blur(0px);
      visibility: hidden;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (min-width: 1024px) {
      .sidebar-overlay {
        display: none;
      }
    }

    .sidebar-overlay.active {
      visibility: visible;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
    }
  `],
})
export class DoctorLayoutComponent {
  sidebarOpen = signal(false);
  private router: Router;

  constructor(router: Router) {
    this.router = router;
    // Auto-close sidebar on navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeSidebar();
      });
  }

  toggleSidebar(): void {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    this.closeSidebar();
  }
}
