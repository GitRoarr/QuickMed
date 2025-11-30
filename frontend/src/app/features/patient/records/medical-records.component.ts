import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MedicalRecordService, MedicalRecord } from '../../../core/services/medical-record.service';
import { AuthService } from '../../../core/services/auth.service';
@Component({
  selector: 'app-patient-records',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './medical-records.component.html',
  styleUrls: ['./medical-records.component.css']
})
export class MedicalRecordsComponent implements OnInit {
  menuItems = [
    { icon: 'bi-house', label: 'Dashboard', route: '/patient/dashboard', active: false },
    { icon: 'bi-calendar-check', label: 'Appointments', route: '/patient/appointments', active: false },
    { icon: 'bi-people', label: 'Find Doctors', route: '/patient/doctors', active: false },
    { icon: 'bi-file-medical', label: 'Medical Records', route: '/patient/records', active: true },
    { icon: 'bi-gear', label: 'Settings', route: '/patient/settings', active: false }
  ];
  sidebarCollapsed = signal(false);
  records = signal<MedicalRecord[]>([]);
  isLoading = signal(true);
  totalRecords = signal(0);
  labCount = signal(0);
  prescriptionCount = signal(0);
  imagingCount = signal(0);
  diagnosisCount = signal(0);

  constructor(private recordsService: MedicalRecordService, private auth: AuthService, private router: Router) {}

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.isLoading.set(true);
    const user = this.auth.currentUser();
    if (!user) {
      this.records.set([]);
      this.isLoading.set(false);
      return;
    }

    this.recordsService.getByPatient(user.id).subscribe({
      next: (r: MedicalRecord[]) => {
        this.records.set(r);
        this.updateCounts(r || []);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Failed to load medical records', err);
        this.records.set([]);
        this.isLoading.set(false);
      }
    });
  }

  private updateCounts(records: MedicalRecord[]) {
    const total = records.length;
    const lab = records.filter((x) => x.type === 'lab').length;
    const pres = records.filter((x) => x.type === 'prescription').length;
    const img = records.filter((x) => x.type === 'imaging').length;
    const diag = records.filter((x) => x.type === 'diagnosis').length;

    this.totalRecords.set(total);
    this.labCount.set(lab);
    this.prescriptionCount.set(pres);
    this.imagingCount.set(img);
    this.diagnosisCount.set(diag);
  }

  viewRecord(rec: MedicalRecord) {
    // navigate to detail or open modal - for now open file url in new tab if present
    if (rec.fileUrl) {
      window.open(rec.fileUrl, '_blank');
    }
  }

  downloadRecord(rec: MedicalRecord) {
    this.recordsService.download(rec.id).subscribe({
      next: (res) => {
        if (res.url) window.open(res.url, '_blank');
        else if (rec.fileUrl) window.open(rec.fileUrl, '_blank');
      },
      error: (err) => {
        console.error('Failed to download', err);
      }
    })
  }
}
