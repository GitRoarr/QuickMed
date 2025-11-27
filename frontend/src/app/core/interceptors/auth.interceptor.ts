import type { HttpInterceptorFn } from "@angular/common/http"
import { inject } from "@angular/core"
import { AuthService } from "../services/auth.service"

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService)
  let token = authService.getToken()

  // Defensive sanitization: sometimes the token stored in localStorage
  // can be JSON (e.g. '{"token":"..."}') or already include 'Bearer '.
  if (token) {
    try {
      const trimmed = token.toString().trim()

      // If token looks like a JSON object, try to parse and extract common fields
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed)
        token = (parsed && (parsed.token || parsed.access_token || parsed.authToken)) || token
      }

      // If it already contains the Bearer prefix, strip it
      if (typeof token === 'string' && token.toLowerCase().startsWith('bearer ')) {
        token = token.slice(7).trim()
      }

      // Defensive: if token is wrapped in quotes ("token") remove them
      if (typeof token === 'string' && ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'")))) {
        token = token.substring(1, token.length - 1).trim()
      }
    } catch (e) {
      // ignore parsing errors and fall back to raw token
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
