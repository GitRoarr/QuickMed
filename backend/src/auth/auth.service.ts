import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { UsersService } from "../users/users.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { User } from "../users/entities/user.entity";
import { UserRole } from "@/common";
import { EmailService } from "../common/services/email.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService
  ) { }

  async register(registerDto: RegisterDto): Promise<{ user: Partial<User>; token: string }> {
    const { email, password, firstName, lastName, phoneNumber } = registerDto;
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) throw new ConflictException("Email is already registered");
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phoneNumber,
      role: UserRole.PATIENT,
    });
    const token = this.generateToken(user);
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async login(loginDto: LoginDto): Promise<{ user: Partial<User>; token: string }> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      console.log(`[Auth] Login failed: User not found with email: ${email}`);
      throw new UnauthorizedException("Invalid email or password");
    }

    console.log(`[Auth] User found: ${user.email}`);
    console.log(`[Auth] User role: ${user.role}`);
    console.log(`[Auth] Password exists: ${!!user.password}`);

    if (!user.password) {
      console.log('[Auth] No password set for user');
      throw new UnauthorizedException("Invalid email or password");
    }

    try {
      // Check if password is a valid bcrypt hash (starts with $2a$, $2b$, or $2y$)
      const isValidBcryptHash = /^\$2[ayb]\$.{56}$/.test(user.password);

      if (!isValidBcryptHash) {
        console.log(`[Auth] Password is not a valid bcrypt hash. User may need to reset password.`);
        throw new UnauthorizedException("Invalid email or password. Please contact administrator to reset your password.");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log(`[Auth] Password validation ${isPasswordValid ? 'succeeded' : 'failed'}`);

      if (!isPasswordValid) {
        throw new UnauthorizedException("Invalid email or password");
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.log(`[Auth] Password comparison error:`, error.message);
      throw new UnauthorizedException("Invalid email or password");
    }

    const token = this.generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    console.log(`[Auth] Login successful for user: ${user.email}`);
    return {
      user: userWithoutPassword,
      token
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new UnauthorizedException("User not found");
    return user;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token valid for 1 hour

    // Store reset token in user entity (we'll use inviteToken field or add a new field)
    await this.usersService.update(user.id, {
      inviteToken: resetToken,
      inviteExpiresAt: resetTokenExpiry,
    } as any);

    // Generate reset link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send email
    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetLink, user.firstName);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Still return success to not reveal if email exists
    }

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  async emergencyResetPassword(email: string, newPassword: string): Promise<{ message: string }> {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new Error('This endpoint is disabled in production');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(user.id, { password: hashedPassword, mustChangePassword: false } as any);

    return { message: `Password reset successfully for ${email}. New password: ${newPassword}` };
  }

  async resetPassword(email: string, token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    // Security: Check if user exists and token matches
    if (!user || user.inviteToken !== token) {
      throw new UnauthorizedException("Invalid or expired reset token");
    }

    // Check expiry
    if (!user.inviteExpiresAt || new Date() > user.inviteExpiresAt) {
      throw new UnauthorizedException("Reset token has expired");
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(user.id, {
      password: hashedPassword,
      inviteToken: null,
      inviteExpiresAt: null,
      mustChangePassword: false,
    } as any);

    return { message: "Password has been successfully reset." };
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }
}

