import { Injectable, UnauthorizedException, ExecutionContext } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import { isObservable, lastValueFrom } from "rxjs"

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext): Promise<boolean> {
    const result = super.canActivate(context)

    if (isObservable(result)) {
      return lastValueFrom(result).then(() => {
        const req = context.switchToHttp().getRequest()
        console.log("[v0] JwtAuthGuard - User:", req.user)
        return true
      })
    }

    if (result instanceof Promise) {
      return result.then((res) => {
        const req = context.switchToHttp().getRequest()
        console.log("[v0] JwtAuthGuard - User:", req.user)
        return res
      })
    }

    const req = context.switchToHttp().getRequest()
    console.log("[v0] JwtAuthGuard - User:", req.user)
    return Promise.resolve(result)
  }

  handleRequest(err: any, user: any) {
    if (err) throw err
    if (!user) throw new UnauthorizedException("Unauthorized")
    return user
  }
}
