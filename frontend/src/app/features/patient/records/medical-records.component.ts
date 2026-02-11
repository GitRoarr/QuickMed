import { Component, OnInit, computed, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicalRecordService, MedicalRecord, CreateMedicalRecordDto } from '../../../core/services/medical-record.service';
import { AuthService } from '../../../core/services/auth.service';
import { PatientShellComponent } from '../shared/patient-shell/patient-shell.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-patient-records',
  standalone: true,
  imports: [CommonModule, PatientShellComponent, FormsModule],
  templateUrl: './medical-records.component.html',
  styleUrls: ['./medical-records.component.css']
})
export class MedicalRecordsComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  records = signal<MedicalRecord[]>([]);
  isLoading = signal(true);
  totalRecords = signal(0);
  labCount = signal(0);
  prescriptionCount = signal(0);
  imagingCount = signal(0);
  diagnosisCount = signal(0);
  filterType = signal<MedicalRecord['type'] | 'all'>('all');
  
  // Upload modal state
  showUploadModal = signal(false);
  isUploading = signal(false);
  selectedFile = signal<File | null>(null);
  uploadForm = {
    title: '',
    type: 'other' as MedicalRecord['type'],
    notes: '',
    recordDate: new Date().toISOString().split('T')[0]
  };
  
  filterOptions: { label: string; value: MedicalRecord['type'] | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Lab', value: 'lab' },
    { label: 'Prescriptions', value: 'prescription' },
    { label: 'Imaging', value: 'imaging' },
    { label: 'Diagnoses', value: 'diagnosis' },
    { label: 'Other', value: 'other' }
  ];
  
  filteredRecords = computed(() => {
    const type = this.filterType();
    const data = this.records();
    return type === 'all' ? data : data.filter((record) => record.type === type);
  });

  constructor(
    private recordsService: MedicalRecordService, 
    private auth: AuthService,
    private toastService: ToastService
  ) {}

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
        this.toastService.error('Failed to download record');
      }
    })
  }

  setFilter(type: MedicalRecord['type'] | 'all') {
    this.filterType.set(type);
  }

  // Upload Modal Methods
  openUploadModal() {
    this.showUploadModal.set(true);
    this.resetUploadForm();
  }

  closeUploadModal() {
    this.showUploadModal.set(false);
    this.resetUploadForm();
  }

  resetUploadForm() {
    this.selectedFile.set(null);
    this.uploadForm = {
      title: '',
      type: 'other',
      notes: '',
      recordDate: new Date().toISOString().split('T')[0]
    };
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.toastService.error('File too large. Maximum size is 10MB.');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        this.toastService.error('Invalid file type. Only PDF, PNG, JPEG allowed.');
        return;
      }
      
      this.selectedFile.set(file);
      
      // Auto-fill title from filename if empty
      if (!this.uploadForm.title) {
        this.uploadForm.title = file.name.replace(/\.[^/.]+$/, '');
      }
    }
  }

  triggerFileInput() {
    this.fileInput?.nativeElement?.click();
  }

  removeSelectedFile() {
    this.selectedFile.set(null);
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  uploadRecord() {
    const user = this.auth.currentUser();
    if (!user) {
      this.toastService.error('Please log in to upload records');
      return;
    }

    if (!this.uploadForm.title.trim()) {
      this.toastService.error('Please enter a title for the record');
      return;
    }

    this.isUploading.set(true);

    const file = this.selectedFile();
    
    if (file) {
      // Upload with file
      this.recordsService.uploadFile(file, user.id).subscribe({
        next: (response) => {
          // After file upload, create the record with the returned URL
          const createDto: CreateMedicalRecordDto = {
            title: this.uploadForm.title,
            type: this.uploadForm.type,
            notes: this.uploadForm.notes,
            recordDate: this.uploadForm.recordDate,
            patientId: user.id,
            fileUrl: response.url
          };
          
          this.recordsService.create(createDto).subscribe({
            next: () => {
              this.toastService.success('Record uploaded successfully');
              this.isUploading.set(false);
              this.closeUploadModal();
              this.loadRecords();
            },
            error: (err) => {
              console.error('Failed to create record', err);
              this.toastService.error('Failed to save record details');
              this.isUploading.set(false);
            }
          });
        },
        error: (err) => {
          console.error('Failed to upload file', err);
          this.toastService.error('Failed to upload file');
          this.isUploading.set(false);
        }
      });
    } else {
      // Create record without file
      const createDto: CreateMedicalRecordDto = {
        title: this.uploadForm.title,
        type: this.uploadForm.type,
        notes: this.uploadForm.notes,
        recordDate: this.uploadForm.recordDate,
        patientId: user.id
      };
      
      this.recordsService.create(createDto).subscribe({
        next: () => {
          this.toastService.success('Record created successfully');
          this.isUploading.set(false);
          this.closeUploadModal();
          this.loadRecords();
        },
        error: (err) => {
          console.error('Failed to create record', err);
          this.toastService.error('Failed to create record');
          this.isUploading.set(false);
        }
      });
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
