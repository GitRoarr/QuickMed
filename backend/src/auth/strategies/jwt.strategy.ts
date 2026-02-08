import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../../users/users.service";
import { UserRole } from "@/common";
import * as jwt from "jsonwebtoken";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iss?: string;
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
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        try {
          if (!rawJwtToken) {
            return done(new UnauthorizedException("Missing token"), null);
          }

          if (!jwt || typeof (jwt as any).decode !== "function") {
            return done(new UnauthorizedException("JWT decoder unavailable"), null);
          }

          const decoded: any = (jwt as any).decode(rawJwtToken);
          const issuer = decoded?.iss || "";
          const supabaseSecret = this.configService.get<string>("SUPABASE_JWT_SECRET");
          const appSecret = this.configService.get<string>("JWT_SECRET") || "defaultSecret";

          if (issuer.includes("supabase") && supabaseSecret) {
            return done(null, supabaseSecret);
          }
          return done(null, appSecret);
        } catch (err) {
          return done(err, null);
        }
      },
    });
  }

  async validate(payload: JwtPayload) {
    console.log('[JwtStrategy] Validating payload:', { sub: payload.sub, email: payload.email, role: payload.role, iss: payload.iss });

    const isSupabase = Boolean(payload.iss && payload.iss.includes("supabase"));
    if (isSupabase) {
      const email = payload.email;
      if (!email) {
        throw new UnauthorizedException("Email missing in Supabase token");
      }

      let user = await this.usersService.findByEmail(email);
      if (!user) {
        user = await this.usersService.create({
          email,
          firstName: "Patient",
          lastName: "User",
          role: UserRole.PATIENT,
          isActive: true,
        });
      }

      return {
        ...user,
        role: user.role || UserRole.PATIENT,
      };
    }
    
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
