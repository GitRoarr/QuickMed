import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminStats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalAdmins: number;
  totalAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  todayAppointments: number;
  thisWeekAppointments: number;
  thisMonthAppointments: number;
  revenue: number;
  averageAppointmentDuration: number;
  patientSatisfactionScore: number;
}

export interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  notifications: 'healthy' | 'warning' | 'error';
}

export interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface AdminDashboardData {
  stats: AdminStats;
  recentAppointments: any[];
  recentUsers: any[];
  upcomingAppointments: any[];
  systemHealth: SystemHealth;
  notifications: Notification[];
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'doctor' | 'patient';
  phoneNumber?: string;
  dateOfBirth?: string;
  bloodType?: string;
  allergies?: string[];
  specialty?: string;
  licenseNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  isVideoConsultation: boolean;
  location?: string;
  patient?: User;
  doctor?: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<AdminDashboardData> {
    return this.http.get<AdminDashboardData>(`${this.apiUrl}/dashboard`);
  }

  getAdminStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/stats`);
  }

  getSystemHealth(): Observable<SystemHealth> {
    return this.http.get<SystemHealth>(`${this.apiUrl}/system/health`);
  }

  getSystemNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/notifications`);
  }

  getAllUsers(page: number = 1, limit: number = 10, role?: string): Observable<PaginatedResponse<User>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (role) {
      params = params.set('role', role);
    }

    return this.http.get<PaginatedResponse<User>>(`${this.apiUrl}/users`, { params });
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  createUser(userData: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, userData);
  }

  updateUser(id: string, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, userData);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
  }

  getAllAppointments(page: number = 1, limit: number = 10, status?: string): Observable<PaginatedResponse<Appointment>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<PaginatedResponse<Appointment>>(`${this.apiUrl}/appointments`, { params });
  }

  getAppointmentById(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/appointments/${id}`);
  }

  createAppointment(appointmentData: Partial<Appointment>): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.apiUrl}/appointments`, appointmentData);
  }

  updateAppointment(id: string, appointmentData: Partial<Appointment>): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.apiUrl}/appointments/${id}`, appointmentData);
  }

  deleteAppointment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/appointments/${id}`);
  }

  exportUserData(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/export`, {
      responseType: 'blob'
    });
  }

  generateReport(type: 'users' | 'appointments' | 'revenue', startDate?: Date, endDate?: Date): Observable<any> {
    const reportData = {
      type,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString()
    };

    return this.http.post(`${this.apiUrl}/reports`, reportData, {
      responseType: 'blob'
    });
  }

  getUserAnalytics(startDate?: Date, endDate?: Date): Observable<any> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get(`${this.apiUrl}/analytics/users`, { params });
  }

  getAppointmentAnalytics(startDate?: Date, endDate?: Date): Observable<any> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get(`${this.apiUrl}/analytics/appointments`, { params });
  }

  getRevenueAnalytics(startDate?: Date, endDate?: Date): Observable<any> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get(`${this.apiUrl}/analytics/revenue`, { params });
  }

  getSystemLogs(page: number = 1, limit: number = 50, level?: string): Observable<PaginatedResponse<any>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (level) {
      params = params.set('level', level);
    }

    return this.http.get<PaginatedResponse<any>>(`${this.apiUrl}/system/logs`, { params });
  }

  getSystemMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/metrics`);
  }

  createBackup(): Observable<any> {
    return this.http.post(`${this.apiUrl}/system/backup`, {});
  }

  getBackupList(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/system/backups`);
  }

  restoreBackup(backupId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/system/backup/${backupId}/restore`, {});
  }

  getSystemSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/settings`);
  }

  updateSystemSettings(settings: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/settings`, settings);
  }

  markNotificationAsRead(notificationId: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/notifications/${notificationId}/read`, {});
  }

  markAllNotificationsAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/notifications/read-all`, {});
  }

  bulkUpdateUsers(userIds: string[], updateData: Partial<User>): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/bulk-update`, {
      userIds,
      updateData
    });
  }

  bulkDeleteUsers(userIds: string[]): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/bulk-delete`, {
      body: { userIds }
    });
  }

  bulkUpdateAppointments(appointmentIds: string[], updateData: Partial<Appointment>): Observable<any> {
    return this.http.put(`${this.apiUrl}/appointments/bulk-update`, {
      appointmentIds,
      updateData
    });
  }

  bulkDeleteAppointments(appointmentIds: string[]): Observable<any> {
    return this.http.delete(`${this.apiUrl}/appointments/bulk-delete`, {
      body: { appointmentIds }
    });
  }
}

