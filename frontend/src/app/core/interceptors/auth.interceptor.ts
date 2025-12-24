import type { HttpInterceptorFn } from "@angular/common/http"
import { inject } from "@angular/core"
import { AuthService } from "../services/auth.service"

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip auth for public endpoints (set-password, login, register, etc.)
  const publicEndpoints = ['/set-password', '/login', '/register', '/forgot-password', '/emergency-reset-password']
  const isPublicEndpoint = publicEndpoints.some(endpoint => req.url.includes(endpoint))
  
  if (isPublicEndpoint) {
    return next(req)
  }

  const authService = inject(AuthService)
  let token = authService.getToken()

  if (token) {
    try {
      const trimmed = token.toString().trim()

      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed)
        token = (parsed && (parsed.token || parsed.access_token || parsed.authToken)) || token
      }

      if (typeof token === 'string' && token.toLowerCase().startsWith('bearer ')) {
        token = token.slice(7).trim()
      }

      if (typeof token === 'string' && ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'")))) {
        token = token.substring(1, token.length - 1).trim()
      }
    } catch (e) {
      console.warn('[AuthInterceptor] token parse failed, using raw token')
    }
  }

  if (token) {
    const preview = (typeof token === 'string' && token.length > 20) ? token.substring(0, 20) + '...' : String(token)
    console.log('[AuthInterceptor] Adding token to request:', req.url, 'Token preview:', preview)
    console.log('[AuthInterceptor] Authorization header value:', `Bearer ${token}`)
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    })
    return next(cloned)
  }

  console.log('[AuthInterceptor] No token found for request:', req.url)
  return next(req)
}
