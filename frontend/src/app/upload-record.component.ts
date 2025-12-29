import { Component, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-upload-record',
  templateUrl: './upload-record.component.html',
  styleUrls: ['./upload-record.component.css']
})
export class UploadRecordComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;
  uploading = false;
  uploadResult: any = null;
  uploadError: string | null = null;

  constructor(private http: HttpClient) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', '123'); // Replace with actual patient ID

    this.uploading = true;
    this.uploadResult = null;
    this.uploadError = null;

    this.http.post('/api/medical-records/upload', formData)
      .subscribe({
        next: (res) => {
          this.uploading = false;
          this.uploadResult = res;
        },
        error: (err) => {
          this.uploading = false;
          this.uploadError = err?.error?.message || 'Upload failed!';
        }
      });
  }
}
