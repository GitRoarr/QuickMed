import { 
  Controller, 
  Get, 
  Patch, 
  UploadedFile, 
  UseGuards, 
  UseInterceptors, 
  Param,
  ForbiddenException
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from 'multer'
import * as os from 'os'
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "./entities/user.entity";
import { UserRole } from "../common/index";

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (req, file, cb) => {
          const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`
          cb(null, filename)
        },
      }),
    }),
  )
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    // Allow only owner or admin to upload avatar for the user
    if (user.id !== id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You are not allowed to upload avatar for this user')
    }
    return this.usersService.uploadUserAvatar(id, file);
  }
}
