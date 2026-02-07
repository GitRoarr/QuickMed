import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, of, tap } from "rxjs";
import { environment } from "@environments/environment";
import { User, AuthResponse, LoginRequest, RegisterRequest, UserRole } from "../models/user.model";
import { createClient, SupabaseClient, User as SupabaseUser, Session } from "@supabase/supabase-js";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly USERS_URL = `${environment.apiUrl}/users`;
  private readonly TOKEN_KEY = "carehub_token";
  private readonly USER_KEY = "carehub_user";
  private readonly SUPABASE_TOKEN_KEY = "carehub_supabase_token";
  private supabase: SupabaseClient | null = null;

  currentUser = signal<User | null>(this.getUserFromStorage());

  constructor(private http: HttpClient, private router: Router) {
    this.getSupabase();
  }

  private getSupabase(): SupabaseClient | null {
    if (this.supabase) return this.supabase;
    if (!environment.supabaseUrl || !environment.supabaseAnonKey) return null;
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    this.bootstrapSupabaseSession();
    return this.supabase;
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/register`, data)
      .pipe(tap((res) => this.handleAuthSuccess(res)));
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/login`, data)
      .pipe(tap((res) => this.handleAuthSuccess(res)));
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.SUPABASE_TOKEN_KEY);
    this.supabase?.auth.signOut();
    this.currentUser.set(null);
    this.router.navigate(["/login"]);
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/forgot-password`, { email });
  }

  refreshProfile(): Observable<User | null> {
    const user = this.currentUser();
    if (!user?.id) return of(null);

    return this.http.get<User>(`${this.USERS_URL}/${user.id}`).pipe(
      tap((fresh) => this.setUser(fresh))
    );
  }

  /** Replace stored user (and keep token untouched). Useful after profile updates. */
  setUser(user: User): void {
    if (!user) return;
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasRole(roles: string[]): boolean {
    const user = this.currentUser();
    return user ? roles.includes(user.role) : false;
  }

  private handleAuthSuccess(response: AuthResponse): void {
    const token = response.token || (response as any).access_token;
    const user = response.user;

    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  async signInWithGoogle(): Promise<void> {
    const client = this.getSupabase();
    if (!client) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: environment.googleRedirectUri || window.location.origin,
      },
    });

    if (error) {
      throw error;
    }
  }

  private async bootstrapSupabaseSession(): Promise<void> {
    const client = this.supabase;
    if (!client) return;

    const { data } = await client.auth.getSession();
    if (data?.session) {
      this.applySupabaseSession(data.session);
    }

    client.auth.onAuthStateChange((_event, session) => {
      if (session) {
        this.applySupabaseSession(session);
      }
    });
  }

  private applySupabaseSession(session: Session): void {
    const supaUser = session.user;
    const mapped = this.mapSupabaseUser(supaUser);
    localStorage.setItem(this.SUPABASE_TOKEN_KEY, session.access_token);
    localStorage.setItem(this.TOKEN_KEY, session.access_token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(mapped));
    this.currentUser.set(mapped);

    const path = window.location.pathname || "";
    if (path.startsWith("/auth/callback") || path.startsWith("/login") || path.startsWith("/register")) {
      this.router.navigate(["/patient/dashboard"]);
    }
  }

  private mapSupabaseUser(user: SupabaseUser): User {
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
    const [firstName, ...rest] = String(fullName).split(" ").filter(Boolean);
    return {
      id: user.id,
      firstName: firstName || "Patient",
      lastName: rest.join(" ") || "User",
      email: user.email || "",
      role: UserRole.PATIENT,
      phoneNumber: user.phone || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      avatar: user.user_metadata?.avatar_url,
    } as User;
  }

  private getUserFromStorage(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }
}
