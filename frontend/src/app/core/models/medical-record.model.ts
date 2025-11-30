export type MedicalRecordType = 'lab' | 'prescription' | 'imaging' | 'diagnosis' | 'other';

export interface MedicalRecord {
  id: string;
  title: string;
  type: MedicalRecordType;
  recordDate?: string;
  patientId: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  doctorId?: string;
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  fileUrl?: string;
  notes?: string;
  description?: string;
  fileSize?: number;
  status?: 'verified' | 'pending' | 'rejected';
  createdAt: string;
  updatedAt: string;
}
