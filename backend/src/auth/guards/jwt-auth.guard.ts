import { Injectable, UnauthorizedException,  ExecutionContext } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import  { Observable } from "rxjs"

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context)
  }

  handleRequest(err: any, user: any, info: any, context?: ExecutionContext) {
    if (err) {
      console.log("[v0] JwtAuthGuard Error:", err.message || err)
      throw err
    }

    if (!user) {
      console.log("[v0] JwtAuthGuard No User - Unauthorized")
      throw new UnauthorizedException("Unauthorized")
    }

    console.log("[v0] JwtAuthGuard Success - User:", user)
    return user
  }
}
