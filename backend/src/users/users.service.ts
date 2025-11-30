import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { UserRole } from "../common/index";
import { CloudinaryService } from "@/profile/cloudinary.service";
import * as fs from 'fs/promises'
import { ReviewsService } from "../reviews/reviews.service";
import { SettingsService } from "../settings/settings.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly reviewsService: ReviewsService,
    private readonly settingsService: SettingsService,
  ) { }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByIdWithPassword(id: string): Promise<User> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findDoctors(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: UserRole.DOCTOR, isActive: true },
      select: ["id", "firstName", "lastName", "email", "specialty", "bio", "availableDays", "startTime", "endTime", "phoneNumber", "avatar", "licenseNumber"],
    });
  }

  async findDoctorsWithAvailability(): Promise<any[]> {
    const doctors = await this.findDoctors();
    const allRatings = await this.reviewsService.getAllDoctorRatings();
    
    const result = await Promise.all(
      doctors.map(async (doctor) => {
        const rating = allRatings[doctor.id] || { average: 0, count: 0 };
        const settings = await this.settingsService.getSettings(doctor.id).catch(() => null);
        
        // Calculate availability based on settings or user fields
        const availableDays = settings?.availableDays || doctor.availableDays || [];
        const startTime = settings?.startTime || doctor.startTime;
        const endTime = settings?.endTime || doctor.endTime;
        
        // Check if doctor is available (has availability configured)
        // For patient view, we show available if they have availability settings, not just "right now"
        const isAvailable = availableDays.length > 0 && startTime && endTime;
        
        // Calculate experience (years since account creation or default to 5)
        let accountAge = 5;
        if (doctor.createdAt) {
          const createdDate = typeof doctor.createdAt === 'string' 
            ? new Date(doctor.createdAt) 
            : doctor.createdAt;
          accountAge = Math.max(1, Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365)));
        }
        
        return {
          ...doctor,
          available: isAvailable,
          rating: rating.average || 0,
          ratingCount: rating.count || 0,
          experience: accountAge,
        };
      })
    );
    
    return result;
  }

  private checkDoctorAvailability(availableDays: string[], startTime?: string, endTime?: string): boolean {
    if (!availableDays || availableDays.length === 0) {
      return false; // No availability set
    }

    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];
    
    // Check if today is in available days
    if (!availableDays.includes(currentDay)) {
      return false;
    }

    // Check time if startTime and endTime are set
    if (startTime && endTime) {
      const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (currentTime < startMinutes || currentTime >= endMinutes) {
        return false;
      }
    }

    return true;
  }

  async findPatients(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: UserRole.PATIENT },
      select: ["id", "firstName", "lastName", "email", "phoneNumber", "dateOfBirth", "bloodType", "allergies", "patientId"],
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, userData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
  async uploadUserAvatar(id: string, file: Express.Multer.File): Promise<User> {
    const user = await this.findOne(id);

    const uploadRes = await this.cloudinaryService.uploadImage(file)
    user.avatar = uploadRes.secure_url
    const saved = await this.usersRepository.save(user)

    // Clean up temporary uploaded file if present
    try {
      if (file && (file as any).path) {
        await fs.unlink((file as any).path)
      }
    } catch (err) {
      // non-fatal
      console.warn('[UsersService] failed to remove temp file', err?.message || err)
    }

    return saved


  }
}
