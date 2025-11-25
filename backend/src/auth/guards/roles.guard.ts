import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      console.log('[RolesGuard] No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.role) {
      console.log('[RolesGuard] User has no role:', user);
      throw new ForbiddenException('User role not found');
    }

    const hasRole = requiredRoles.some((role) => {
      const roleMatch = role === user.role || role === String(user.role);
      if (!roleMatch) {
        console.log(`[RolesGuard] Role mismatch - Required: ${role}, User: ${user.role}`);
      }
      return roleMatch;
    });

    if (!hasRole) {
      console.log(`[RolesGuard] Access denied - Required roles: ${requiredRoles.join(', ')}, User role: ${user.role}`);
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
