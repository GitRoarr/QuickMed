import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AdminService, User } from '@app/core/services/admin.service';

@Component({
  selector: 'app-admin-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],

  templateUrl: './admin-doctors.component.html',
  styleUrls: ['./admin-doctors.component.scss']
})
export class AdminDoctorsComponent implements OnInit {
  doctors: User[] = [];
  loading = false;

  constructor(private adminService: AdminService, private router: Router) {}

  ngOnInit(): void {
    this.loadDoctors();
  }

  loadDoctors() {
    this.loading = true;
    this.adminService.getAllUsers(1, 100, 'doctor').subscribe(res => {
      this.doctors = res.data;
      this.loading = false;
    }, () => this.loading = false);
  }

  onAdd() {
    this.router.navigate(['/admin/doctors/add']);
  }

  onVerify(id: string) {
    this.router.navigate(['/admin/doctors', id, 'verify']);
  }

  onDelete(id: string) {
    if (confirm('Are you sure you want to delete this doctor?')) {
      this.adminService.deleteUser(id).subscribe(() => this.loadDoctors());
    }
  }
}
