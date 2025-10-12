import { inject } from "@angular/core"
import { Router, type CanActivateFn } from "@angular/router"
import { AuthService } from "../services/auth.service"

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService)
  const router = inject(Router)

  const requiredRoles = route.data["roles"] as string[]

  if (authService.hasRole(requiredRoles)) {
    return true
  }

  router.navigate(["/"])
  return false
}
