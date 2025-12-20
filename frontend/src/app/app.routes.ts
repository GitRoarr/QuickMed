import { GuardsCheckEnd, Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { roleGuard } from "./core/guards/role.guard";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./features/home/home.component").then((m) => m.HomeComponent),
  },
  {
    path: 'call/:roomId',
    loadComponent: () => import('./features/call/call.component').then(m => m.CallComponent),
  },
  {
    path: "login",
    loadComponent: () =>
      import("./features/auth/login/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "register",
    loadComponent: () =>
      import("./features/auth/register/register.component").then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: "set-password",
    loadComponent: () =>
      import("./features/auth/set-password/set-password.component").then(
        (m) => m.SetPasswordComponent
      ),
  },
  {
    path: "forgot-password",
    loadComponent: () =>
      import("./features/auth/forgot-password/forgot-password.component").then(
        (m) => m.ForgotPasswordComponent
      ),
  },
  {
    path: "payment/success",
    loadComponent: () =>
      import("./features/patient/payment-success/payment-success.component").then(
        (m) => m.PaymentSuccessComponent
      ),
  },
  {
    path: "patient",
    canActivate: [authGuard, roleGuard],
    data: { roles: ["patient"] },
    children: [
      {
        path: "dashboard",
        loadComponent: () =>
          import("./features/patient/dashboard/dashboard.component").then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: "appointments",
        loadComponent: () =>
          import("./features/patient/appointments/appointments.component").then(
            (m) => m.AppointmentsComponent
          ),
      },
      {
        path: "doctors",
        loadComponent: () =>
          import("./features/patient/doctors/doctors.component").then(
            (m) => m.DoctorsComponent
          ),
      },
      {
        path: "records",
        loadComponent: () =>
          import("./features/patient/records/medical-records.component").then(
            (m) => m.MedicalRecordsComponent
          ),
      },
      {
        path: "profile",
        loadComponent: () =>
          import("./features/patient/profile/profile.component").then(
            (m) => m.ProfileComponent
          ),
      },
      {
        path: "messages",
        loadComponent: () =>
          import("./features/patient/messages/messages.component").then(
            (m) => m.PatientMessagesComponent
          ),
      },
      {
        path: "settings",
        loadComponent: () =>
          import("./features/patient/settings/settings.component").then(
            (m) => m.SettingsComponent
          ),
      },
      {
        path: "payment",
        loadComponent: () =>
          import("./features/patient/payment/payment.component").then(
            (m) => m.PaymentComponent
          ),
      },
      {
        path: "stripe-payment",
        loadComponent: () =>
          import("./features/patient/stripe-payment/stripe-payment.component").then(
            (m) => m.StripePaymentComponent
          ),
      },
      {
        path: "payment/success",
        loadComponent: () =>
          import("./features/patient/payment-success/payment-success.component").then(
            (m) => m.PaymentSuccessComponent
          ),
      },
    ],
  },
  {
    path: "doctor",
    canActivate: [authGuard, roleGuard],
    data: { roles: ["doctor"] },
    children: [
      {
        path: "dashboard",
        loadComponent: () =>
          import("./features/doctor/dashboard/dashboard.component").then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: "appointments",
        loadComponent: () =>
          import("./features/doctor/appointments/appointments.component").then(
            (m) => m.AppointmentsComponent
          ),
      },
      {
        path: "patients",
        loadComponent: () =>
          import("./features/doctor/patients/patients.component").then(
            (m) => m.PatientsComponent
          ),
      },
      {
        path: "schedule",
        loadComponent: () =>
          import("./features/doctor/schedule/schedule.component").then(
            (m) => m.ScheduleComponent
          ),
      },
      {
        path: "prescriptions",
        loadComponent: () =>
          import("./features/doctor/prescriptions/prescriptions.component").then(
            (m) => m.PrescriptionsComponent
          ),
      },
      {
        path: "messages",
        loadComponent: () =>
          import("./features/doctor/messages/messages.component").then(
            (m) => m.MessagesComponent
          ),
      },
      {
        path: "records",
        loadComponent: () =>
          import("./features/doctor/records/records.component").then(
            (m) => m.RecordsComponent
          ),
      },
      {
        path: "analytics",
        loadComponent: () =>
          import("./features/doctor/analytics/analytics.component").then(
            (m) => m.AnalyticsComponent
          ),
      },
      {
        path: "settings",
        loadComponent: () =>
          import("./features/doctor/settings/settings.component").then(
            (m) => m.SettingsComponent
          ),
      },
      {
        path: "",
        pathMatch: "full",
        redirectTo: "dashboard",
      },
    ],
  },
  {
    path: "admin",
    canActivate: [authGuard, roleGuard],
    data: { roles: ["admin"] },
    children: [
      {
        path: "dashboard",
        loadComponent: () =>
          import("./features/admin/overview/overview.component").then(
            (m) => m.OverviewComponent
          ),
      },
      {
        path: "overview",
        redirectTo: "dashboard",
        pathMatch: "full",
      },
      {
        path: "doctors",
        children: [
          {
            path: "",
            loadComponent: () =>
              import(
                "./features/admin/doctors/admin-doctors.component"
              ).then((m) => m.AdminDoctorsComponent),
          },
          {
            path: "add-doctor",
            loadComponent: () =>
              import(
                "./features/admin/doctors/add-doctor/admin-doctor-add.component"
              ).then((m) => m.AdminDoctorAddComponent),
          },
          {
            path: "verify-doctor/:id",
            loadComponent: () =>
              import(
                "./features/admin/doctors/verify-doctor/admin-doctor-verify.component"
              ).then((m) => m.AdminDoctorVerifyComponent),
          },
        ],
      },
      {
        path: "appointments",
        loadComponent: () =>
          import("./features/admin/appointments/appointments.component").then(
            (m) => m.AppointmentsComponent
          ),
      },
      {
        path: "patients",
        loadComponent: () =>
          import("./features/admin/patients/patients.component").then(
            (m) => m.PatientsComponent
          ),
      },
      {
        path: "receptionists",
        loadComponent: () =>
          import("./features/admin/receptionists/admin-receptionists.component").then(
            (m) => m.AdminReceptionistsComponent
          ),
      },
      {
        path: "users",
        loadComponent: () =>
          import("./features/admin/user-management/user-management.component").then(
            (m) => m.UserManagementComponent
          ),
      },
      {
        path: "analytics",
        loadComponent: () =>
          import("./features/admin/analytics/analytics.component").then(
            (m) => m.AnalyticsComponent
          ),
      },
      {
        path: "settings",
        loadComponent: () =>
          import("./features/admin/settings/settings.component").then(
            (m) => m.SettingsComponent
          ),
      },
      {
        path: "",
        pathMatch: "full",
        redirectTo: "dashboard",
      },
    ],
  },
  {
    path: 'receptionist',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['receptionist'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/receptionist/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'patients',
        loadComponent: () => import('./features/receptionist/patient-form/patient-form.component').then(m => m.PatientFormComponent)
      },
      {
        path: 'appointments',
        loadComponent: () => import('./features/receptionist/appointment-form/appointment-form.component').then(m => m.AppointmentFormComponent)
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: "**",
    redirectTo: "",
  },
];
