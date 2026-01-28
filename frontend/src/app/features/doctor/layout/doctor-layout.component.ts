import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';

@Component({
  selector: 'app-doctor-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, DoctorSidebarComponent],
  template: `
    <div class="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <app-doctor-sidebar class="sticky top-0 h-screen"></app-doctor-sidebar>
      <div class="flex-1 min-w-0">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
})
export class DoctorLayoutComponent { }
