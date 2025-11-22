import { Injectable,  CanActivate,  ExecutionContext } from "@nestjs/common"
import  { Reflector } from "@nestjs/core"
import { ROLES_KEY } from "../decorators/roles.decorator"

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles) return true

    const request = context.switchToHttp().getRequest()
    const user = request.user

    const userRole = user?.role ? String(user.role).toLowerCase() : null
    const normalizedRequiredRoles = requiredRoles.map((r) => String(r).toLowerCase())

    console.log("[v0] RolesGuard Check:", {
      userRole: userRole,
      requiredRoles: normalizedRequiredRoles,
      user: user ? { id: user.id, email: user.email, role: userRole } : null,
      matches: userRole && normalizedRequiredRoles.includes(userRole),
    })

    if (!user || !userRole) {
      console.log("[v0] RolesGuard DENIED: No user or role found")
      return false
    }

    const hasAccess = normalizedRequiredRoles.includes(userRole)
    if (!hasAccess) {
      console.log("[v0] RolesGuard DENIED:", {
        userRole,
        requiredRoles: normalizedRequiredRoles,
      })
    } else {
      console.log("[v0] RolesGuard ALLOWED for role:", userRole)
    }

    return hasAccess
  }
}
