import { Injectable, signal } from "@angular/core"
import  { HttpClient } from "@angular/common/http"
import  { Router } from "@angular/router"
import {  Observable, tap } from "rxjs"
import { environment } from "@environments/environment"
import  { User, AuthResponse, LoginRequest, RegisterRequest } from "../models/user.model"

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`
  private readonly TOKEN_KEY = "carehub_token"
  private readonly USER_KEY = "carehub_user"

  currentUser = signal<User | null>(this.getUserFromStorage())

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/register`, data)
      .pipe(tap((response) => this.handleAuthSuccess(response)))
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/login`, data)
      .pipe(tap((response) => this.handleAuthSuccess(response)))
  }
loginAdmin(credentials: { email: string; password: string }): Observable<{ access_token: string }> {
  return this.http.post<{ access_token: string }>(`${this.API_URL}/admin/login`, credentials).pipe(
    tap((response) => {
      localStorage.setItem('admin_token', response.access_token)
    })
  )
}

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
    this.currentUser.set(null)
    this.router.navigate(["/login"])
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  hasRole(roles: string[]): boolean {
    const user = this.currentUser()
    return user ? roles.includes(user.role) : false
  }

  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token)
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user))
    this.currentUser.set(response.user)
  }

  private getUserFromStorage(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY)
    return userJson ? JSON.parse(userJson) : null
  }
}
