import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicalRecordService, MedicalRecord } from '../../../core/services/medical-record.service';
import { AuthService } from '../../../core/services/auth.service';
import { PatientShellComponent } from '../shared/patient-shell/patient-shell.component';
@Component({
  selector: 'app-patient-records',
  standalone: true,
  imports: [CommonModule, PatientShellComponent],
  templateUrl: './medical-records.component.html',
  styleUrls: ['./medical-records.component.css']
})
export class MedicalRecordsComponent implements OnInit {
  records = signal<MedicalRecord[]>([]);
  isLoading = signal(true);
  totalRecords = signal(0);
  labCount = signal(0);
  prescriptionCount = signal(0);
  imagingCount = signal(0);
  diagnosisCount = signal(0);

  constructor(private recordsService: MedicalRecordService, private auth: AuthService) {}

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
