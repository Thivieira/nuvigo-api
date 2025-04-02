import bcrypt from 'bcrypt';
import { RegisterDto, LoginDto, AuthResponse } from '@/types/auth';
import { Prisma } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { TokenService } from './token.service';
import { prisma } from '@/lib/prisma';

export class AuthService {
  constructor(private fastify: FastifyInstance) { }

  async register(data: RegisterDto): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          ...data,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      // Generate tokens
      const accessToken = TokenService.generateAccessToken(user.id);
      const refreshToken = await TokenService.createRefreshToken(user.id);

      // Create verification token
      await TokenService.createVerificationToken(user.id);

      return {
        accessToken,
        refreshToken,
        user,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Email already registered');
        }
      }
      throw error;
    }
  }

  async login(data: LoginDto): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const accessToken = TokenService.generateAccessToken(user.id);
    const refreshToken = await TokenService.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const userId = await TokenService.validateRefreshToken(refreshToken);
    if (!userId) {
      throw new Error('Invalid refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const accessToken = TokenService.generateAccessToken(user.id);
    const newRefreshToken = await TokenService.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await TokenService.revokeRefreshToken(refreshToken);
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await TokenService.validateVerificationToken(token);
    if (!userId) {
      throw new Error('Invalid verification token');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    await TokenService.revokeVerificationToken(token);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    await TokenService.createPasswordResetToken(user.id);
    // TODO: Send email with reset link
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const userId = await TokenService.validateResetToken(token);
    if (!userId) {
      throw new Error('Invalid reset token');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await TokenService.revokeResetToken(token);
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }
} 