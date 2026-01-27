export interface DoctorAnalytics {
    id: string;
    doctorId: string;
    date: string;
    totalPatients: number;
    completedAppointments: number;
    missedAppointments: number;
    pendingAppointments: number;
    totalConsultationMinutes: number;
    averageConsultationMinutes: number;
    videoConsultations: number;
    inPersonConsultations: number;
    appointmentTypeBreakdown?: AppointmentTypeStats[];
    totalRevenue?: number;
}

export interface AppointmentTypeStats {
    type: string;
    count: number;
}

export interface DailyStats {
    date: string;
    totalPatients: number;
    completedAppointments: number;
    missedAppointments: number;
    pendingAppointments: number;
    averageConsultationMinutes: number;
    videoConsultations: number;
    inPersonConsultations: number;
}

export interface WeeklySummary {
    weekStart: string;
    weekEnd: string;
    totalPatients: number;
    completedAppointments: number;
    missedAppointments: number;
    averageConsultationMinutes: number;
    dailyBreakdown: DailyStats[];
}

export interface AnalyticsQuickStats {
    today: DailyStats;
    thisWeek: WeeklySummary;
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
}
