export type MedicalRecordType = 'lab' | 'prescription' | 'imaging' | 'diagnosis' | 'other';

export interface MedicalRecord {
  id: string;
  title: string;
  type: MedicalRecordType;
  recordDate?: string;
  patientId: string;
  doctorId?: string;
  doctor?: any;
  fileUrl?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
