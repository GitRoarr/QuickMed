import { 
  Controller, 
  Get, 
  Patch, 
  UploadedFile, 
  UseGuards, 
  UseInterceptors, 
  Param 
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get("doctors")
  findDoctors() {
    return this.usersService.findDoctors();
  }

  @Get("patients")
  findPatients() {
    return this.usersService.findPatients();
  }

  @Patch(':id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.usersService.uploadUserAvatar(id, file);
  }
}
