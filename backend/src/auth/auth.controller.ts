import { Controller, Post, HttpCode, HttpStatus, Body } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Emergency password reset endpoint (DEVELOPMENT ONLY - Remove in production!)
  @Post("emergency-reset-password")
  @HttpCode(HttpStatus.OK)
  async emergencyResetPassword(@Body() body: { email: string; newPassword: string }) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Error('This endpoint is disabled in production');
    }
    return this.authService.emergencyResetPassword(body.email, body.newPassword);
  }
}
