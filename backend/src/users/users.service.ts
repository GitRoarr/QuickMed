import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User} from "./entities/user.entity";
import { UserRole } from "../common/index";
import { CloudinaryService } from "@/profile/cloudinary.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly cloudinaryService :CloudinaryService
  ) {}

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findDoctors(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: UserRole.DOCTOR },
      select: ["id", "firstName", "lastName", "email", "specialty", "bio", "availableDays", "startTime", "endTime"],
    });
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
async uploadUserAvatar (id :string,file:Express.Multer.File):Promise<User>{
  const user = await this.findOne(id);

const uploadRes = await this.cloudinaryService.uploadImage(file)
user.avatar = uploadRes.secure_url
return this.usersRepository.save(user)


}
}
