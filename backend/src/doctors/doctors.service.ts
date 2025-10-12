import { Injectable, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { User, UserRole } from "../users/entities/user.entity";
import { CreateDoctorDto } from "./dto/create-doctor.dto";
import { UpdateDoctorDto } from "./dto/update-doctor.dto";
import * as bcrypt from "bcrypt";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>
  ) {}

  async create(createDoctorDto: CreateDoctorDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createDoctorDto.password, 10);

    const doctor = this.usersRepository.create({
      ...createDoctorDto,
      password: hashedPassword,
      role: UserRole.DOCTOR,
    });

    return this.usersRepository.save(doctor);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: UserRole.DOCTOR },
      select: [
        "id",
        "firstName",
        "lastName",
        "email",
        "phoneNumber",
        "specialty",
        "bio",
        "licenseNumber",
        "availableDays",
        "startTime",
        "endTime",
        "createdAt",
      ],
    });
  }

  async findOne(id: string): Promise<User> {
    const doctor = await this.usersRepository.findOne({
      where: { id, role: UserRole.DOCTOR },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    return doctor;
  }

  async update(id: string, updateDoctorDto: UpdateDoctorDto): Promise<User> {
    const doctor = await this.findOne(id);

    if (updateDoctorDto.password) {
      updateDoctorDto.password = await bcrypt.hash(
        updateDoctorDto.password,
        10
      );
    }

    Object.assign(doctor, updateDoctorDto);
    return this.usersRepository.save(doctor);
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete({
      id,
      role: UserRole.DOCTOR,
    });

    if (result.affected === 0) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }
  }
}
