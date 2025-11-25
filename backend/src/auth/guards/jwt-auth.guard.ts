import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import { Observable } from "rxjs"
import { tap, catchError } from "rxjs/operators"
import { throwError } from "rxjs"

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    console.log('[JwtAuthGuard] Checking request:', {
      method: request.method,
      url: request.url,
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader ? authHeader.substring(0, 30) + '...' : 'none'
    });
    
    if (!authHeader) {
      console.log('[JwtAuthGuard] No Authorization header found');
      throw new UnauthorizedException('No authorization token provided');
    }
    
    const result = super.canActivate(context);
    
    // Handle both Promise and Observable cases
    if (result instanceof Promise) {
      return result.then((success) => {
        if (success) {
          console.log('[JwtAuthGuard] Authentication successful (Promise)');
        }
        return success;
      }).catch((err) => {
        console.log('[JwtAuthGuard] Authentication failed (Promise):', err.message);
        throw err;
      });
    }
    
    if (result instanceof Observable) {
      return result.pipe(
        tap((success) => {
          if (success) {
            console.log('[JwtAuthGuard] Authentication successful (Observable)');
          }
        }),
        catchError((err) => {
          console.log('[JwtAuthGuard] Authentication failed (Observable):', err.message);
          return throwError(() => err);
        })
      );
    }
    
    return result;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    
    if (err) {
      console.log('[JwtAuthGuard] Error in handleRequest:', err.message);
      throw err;
    }
    
    if (!user) {
      console.log('[JwtAuthGuard] No user returned from strategy. Info:', info?.message || 'Unknown');
      throw new UnauthorizedException(info?.message || 'Invalid or expired token');
    }
    
    // Ensure user is set on request
    request.user = user;
    console.log('[JwtAuthGuard] User set on request:', { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      hasUserOnRequest: !!request.user
    });
    
    return user;
  }
}
