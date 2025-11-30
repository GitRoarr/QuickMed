import { 
  Controller, 
  Get, 
  Patch, 
  UploadedFile, 
  UseGuards, 
  UseInterceptors, 
  Param,
  ForbiddenException,
  Body,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get("doctors")
  async findDoctors() {
    return this.usersService.findDoctorsWithAvailability();
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

  @Patch(':id/password')
  async changePassword(
    @Param('id') id: string,
    @Body() body: { currentPassword?: string; newPassword: string },
    @CurrentUser() user: User,
  ) {
    if (user.id !== id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You are not allowed to change this user password');
    }

    const { currentPassword, newPassword } = body;
    
    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    // Use transaction for data integrity
    const queryRunner = this.usersRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const target = await this.usersService.findByIdWithPassword(id);
      
      // If user has a password, require currentPassword to match unless the caller is admin
      if (target.password && user.role !== UserRole.ADMIN) {
        if (!currentPassword) {
          await queryRunner.rollbackTransaction();
          throw new BadRequestException('Current password is required');
        }
        
        const bcrypt = require('bcrypt');
        const isValidPassword = await bcrypt.compare(currentPassword, target.password);
        if (!isValidPassword) {
          await queryRunner.rollbackTransaction();
          throw new BadRequestException('Current password is incorrect');
        }
      }

      // Hash new password
      const bcrypt = require('bcrypt');
      const hashed = await bcrypt.hash(newPassword, 10);
      
      // Update password with transaction
      await queryRunner.manager.update(User, { id }, {
        password: hashed,
        mustChangePassword: false,
      });
      
      await queryRunner.commitTransaction();
      return { message: 'Password updated successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
