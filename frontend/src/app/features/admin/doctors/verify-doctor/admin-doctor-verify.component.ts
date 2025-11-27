import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService, User } from '@app/core/services/admin.service';
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';

@Component({
  selector: 'app-admin-doctor-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AlertMessageComponent],
  templateUrl: './admin-doctor-verify.component.html',
  styleUrls: ['./admin-doctor-verify.component.scss'],
})
export class AdminDoctorVerifyComponent implements OnInit {
  doctor: User | null = null;
  id = '';
  message = '';
  type: 'success' | 'error' | '' = '';

  constructor(
    private route: ActivatedRoute,
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.loadDoctor();
  }

  loadDoctor() {
    this.adminService.getUserById(this.id).subscribe((d) => (this.doctor = d));
  }

  validateLicense() {
    this.adminService.updateUser(this.id, {}).subscribe({
      next: () => this.showMsg('License validated'),
      error: () => this.showMsg('License validation failed', 'error'),
    });
  }

  confirmEmployment() {
    this.adminService.updateUser(this.id, {}).subscribe({
      next: () => this.showMsg('Employment confirmed'),
      error: () => this.showMsg('Confirmation failed', 'error'),
    });
  }

  activateDoctor() {
    this.adminService.activateDoctor(this.id).subscribe({
      next: () => this.showMsg('Doctor activated'),
      error: () => this.showMsg('Activation failed', 'error'),
    });
  }

  showMsg(msg: string, type: 'success' | 'error' = 'success') {
    this.message = msg;
    this.type = type;
    this.loadDoctor();
  }

  back() {
    this.router.navigate(['/admin/doctors']);
  }
}
