import { Injectable, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type User, UserRole } from "./entities/user.entity"

@Injectable()
export class UsersService {
  private readonly usersRepository: Repository<User>

  constructor(usersRepository: Repository<User>) {
    this.usersRepository = usersRepository
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } })
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    return user
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } })
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find()
  }

  async findDoctors(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: UserRole.DOCTOR },
      select: ["id", "firstName", "lastName", "email", "specialty", "bio", "availableDays", "startTime", "endTime"],
    })
  }

  async findPatients(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: UserRole.PATIENT },
      select: [
        "id",
        "firstName",
        "lastName",
        "email",
        "phoneNumber",
        "dateOfBirth",
        "bloodType",
        "allergies",
        "patientId",
      ],
    })
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData)
    return this.usersRepository.save(user)
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, userData)
    return this.findOne(id)
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
  }
}
