import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export class TokenService {
  static generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY / 1000, // Convert to seconds
    });
  }

  static generateRefreshToken(): string {
    return randomBytes(40).toString('hex');
  }

  static generateResetToken(): string {
    return randomBytes(40).toString('hex');
  }

  static async createRefreshToken(userId: string): Promise<string> {
    const refreshToken = this.generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return refreshToken;
  }

  static async createVerificationToken(userId: string): Promise<string> {
    const token = this.generateResetToken();
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

    await prisma.verificationToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  static async createPasswordResetToken(userId: string): Promise<string> {
    const token = this.generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  static async validateRefreshToken(token: string): Promise<string | null> {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!refreshToken) {
      return null;
    }

    if (refreshToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({
        where: { id: refreshToken.id },
      });
      return null;
    }

    return refreshToken.userId;
  }

  static async validateVerificationToken(token: string): Promise<string | null> {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return null;
    }

    if (verificationToken.expiresAt < new Date()) {
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });
      return null;
    }

    return verificationToken.userId;
  }

  static async validateResetToken(token: string): Promise<string | null> {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return null;
    }

    if (resetToken.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return null;
    }

    return resetToken.userId;
  }

  static async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.delete({
      where: { token },
    });
  }

  static async revokeVerificationToken(token: string): Promise<void> {
    await prisma.verificationToken.delete({
      where: { token },
    });
  }

  static async revokeResetToken(token: string): Promise<void> {
    await prisma.passwordResetToken.delete({
      where: { token },
    });
  }

  static async revokeAllUserTokens(userId: string): Promise<void> {
    await Promise.all([
      prisma.refreshToken.deleteMany({
        where: { userId },
      }),
      prisma.verificationToken.deleteMany({
        where: { userId },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId },
      }),
    ]);
  }
} 