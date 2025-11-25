import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../../users/users.service";
import { UserRole } from "@/common";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
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
    });
  }

  async validate(payload: JwtPayload) {
    console.log('[JwtStrategy] Validating payload:', { sub: payload.sub, email: payload.email, role: payload.role });
    
    if (payload.role === UserRole.ADMIN) {
      const adminUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role, 
      };
      console.log('[JwtStrategy] Admin user validated:', adminUser);
      return adminUser;
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      console.log('[JwtStrategy] User not found:', payload.sub);
      throw new UnauthorizedException("User not found");
    }

    if (user.role !== payload.role) {
      console.log('[JwtStrategy] Role mismatch:', { userRole: user.role, payloadRole: payload.role });
      throw new UnauthorizedException("Role mismatch");
    }

    console.log('[JwtStrategy] User validated:', { id: user.id, email: user.email, role: user.role });
    return {
      ...user,
      role: payload.role,
    };
  }
}
