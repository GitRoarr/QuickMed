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
  path: "doctors",
  children: [
    {
      path: "",
      loadComponent: () =>
        import("./features/admin/doctors/admin-doctors.component").then(
          (m) => m.AdminDoctorsComponent
        ),
    },
    {
      path: "add-doctor",
      loadComponent: () =>
        import("./features/admin/doctors/add-doctor/admin-doctor-add.component").then(
          (m) => m.AdminDoctorAddComponent
        ),
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
        path: "",
        pathMatch: "full",
        redirectTo: "dashboard",
      },
    ],
  },
  {
    path: "**",
    redirectTo: "",
  },
];
