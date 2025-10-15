import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() title = 'Dashboard';
  @Input() menuItems: MenuItem[] = [];
  
  private authService = inject(AuthService);
  
  currentUser = this.authService.currentUser;
  
  logout(): void {
    this.authService.logout();
  }
}
