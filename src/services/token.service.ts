import { prisma } from '@/lib/prisma';
import { env } from '@/env';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '@/types/auth';

export class TokenService {
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });
  }

  static async createRefreshToken(userId: string): Promise<string> {
    const token = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '7d' });

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return token;
  }

  static async createVerificationToken(userId: string): Promise<string> {
    const token = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '24h' });

    await prisma.verificationToken.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    return token;
  }

  static async createPasswordResetToken(userId: string): Promise<string> {
    const token = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '1h' });

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
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