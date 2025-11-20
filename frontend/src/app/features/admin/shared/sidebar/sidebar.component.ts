import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

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

  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/']); 
  }
}
