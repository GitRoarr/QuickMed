import type { Routes } from "@angular/router"
import { authGuard } from "./core/guards/auth.guard"
import { roleGuard } from "./core/guards/role.guard"

export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./features/home/home.component").then((m) => m.HomeComponent),
  },
  {
    path: "login",
    loadComponent: () => import("./features/auth/login/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "register",
    loadComponent: () => import("./features/auth/register/register.component").then((m) => m.RegisterComponent),
  },
  {
    path: "patient",
    canActivate: [authGuard, roleGuard],
    data: { roles: ["patient"] },
    children: [
      {
        path: "dashboard",
        loadComponent: () =>
          import("./features/patient/dashboard/dashboard.component").then((m) => m.DashboardComponent),
      },
      {
        path: "appointments",
        loadComponent: () =>
          import("./features/patient/appointments/appointments.component").then((m) => m.AppointmentsComponent),
      },
      {
        path: "doctors",
        loadComponent: () => import("./features/patient/doctors/doctors.component").then((m) => m.DoctorsComponent),
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
          import("./features/doctor/dashboard/dashboard.component").then((m) => m.DashboardComponent),
      },
      {
        path: "appointments",
        loadComponent: () =>
          import("./features/doctor/appointments/appointments.component").then((m) => m.AppointmentsComponent),
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
        loadComponent: () => import("./features/admin/dashboard/dashboard.component").then((m) => m.DashboardComponent),
      },
      {
        path: "doctors",
        loadComponent: () => import("./features/admin/doctors/doctors.component").then((m) => m.DoctorsComponent),
      },
      {
        path: "appointments",
        loadComponent: () =>
          import("./features/admin/appointments/appointments.component").then((m) => m.AppointmentsComponent),
      },
    ],
  },
  {
    path: "**",
    redirectTo: "",
  },
]
