import { Injectable, type ExecutionContext } from "@nestjs/common"
import { ContextCreator } from "@nestjs/core/helpers/context-creator"
import { AuthGuard } from "@nestjs/passport"
import { Observable } from "rxjs"

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context)
  }
}
