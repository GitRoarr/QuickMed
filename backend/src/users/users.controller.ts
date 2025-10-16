import { Controller, Get, UseGuards } from "@nestjs/common"
import type { UsersService } from "./users.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll()
  }

  @Get("doctors")
  findDoctors() {
    return this.usersService.findDoctors()
  }

  @Get("patients")
  findPatients() {
    return this.usersService.findPatients()
  }
}
