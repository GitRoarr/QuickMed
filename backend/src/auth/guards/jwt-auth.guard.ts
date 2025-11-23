import { Injectable, UnauthorizedException, type ExecutionContext } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import type { Observable } from "rxjs"

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context)
  }

  handleRequest(err: any, user: any, info: any, context?: ExecutionContext) {
    console.log("[v0] JwtAuthGuard handleRequest:", { err, user, info })

    if (err) {
      console.log("[v0] JwtAuthGuard Error:", err.message || err)
      throw err
    }

    if (!user) {
      console.log("[v0] JwtAuthGuard No User - Unauthorized")
      throw new UnauthorizedException("Unauthorized")
    }

    if (context) {
      const request = context.switchToHttp().getRequest()
      request.user = user
      console.log("[v0] JwtAuthGuard User attached to request:", user)
    }

    console.log("[v0] JwtAuthGuard Success - Returning User:", user)
    return user
  }
}
