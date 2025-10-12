import { Controller, Post, HttpCode, HttpStatus } from "@nestjs/common"
import type { AuthService } from "./auth.service"
import type { RegisterDto } from "./dto/register.dto"
import type { LoginDto } from "./dto/login.dto"

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(registerDto: RegisterDto) {
    return this.authService.register(registerDto)
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(loginDto: LoginDto) {
    return this.authService.login(loginDto)
  }
}
