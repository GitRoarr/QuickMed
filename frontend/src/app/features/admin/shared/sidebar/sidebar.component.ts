import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AdminThemeService } from '../../../../core/services/admin-theme.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  standalone: true,
  styleUrls: ['./sidebar.component.css'],
  imports: [CommonModule, RouterModule],
})
export class SidebarComponent {
  @Input() title: string = '';
  @Input() menuItems: { label: string; icon: string; route: string }[] = [];
  themeService = inject(AdminThemeService);

  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/']); 
  }
}
