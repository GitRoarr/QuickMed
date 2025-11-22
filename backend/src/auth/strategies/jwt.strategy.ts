import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { ConfigService } from "@nestjs/config"
import { UsersService } from "../../users/users.service"

export interface JwtPayload {
  sub: string
  email: string
  role: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET") || "defaultSecret",
    })
  }

  async validate(payload: JwtPayload) {
    const userRole = String(payload.role).toLowerCase()

    if (userRole === "admin") {
      console.log("[v0] JWT Strategy - Admin user validated:", {
        id: payload.sub,
        email: payload.email,
        role: userRole,
      })
      return {
        id: payload.sub,
        email: payload.email,
        role: userRole,
      }
    }

    const user = await this.usersService.findOne(payload.sub)
    if (!user) throw new UnauthorizedException("User not found")

    if (user.role !== userRole) throw new UnauthorizedException("Role mismatch")

    return {
      ...user,
      role: userRole,
    }
  }
}
