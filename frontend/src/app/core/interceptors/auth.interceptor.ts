import type { HttpInterceptorFn } from "@angular/common/http"
import { inject } from "@angular/core"
import { AuthService } from "../services/auth.service"

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService)
  const token = authService.getToken()

  if (token) {
    console.log('[AuthInterceptor] Adding token to request:', req.url, 'Token preview:', token.substring(0, 20) + '...')
    const cloned = req.clone({
      headers: req.headers.set("Authorization", `Bearer ${token}`),
    })
    return next(cloned)
  }

  console.log('[AuthInterceptor] No token found for request:', req.url)
  return next(req)
}
