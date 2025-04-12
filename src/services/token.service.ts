import { prisma } from '@/lib/prisma';
import { env } from '@/env';
import { sign, verify } from 'jsonwebtoken';
import dayjs from '@/lib/dayjs';
import { JWTPayload } from '@/types/auth';

export class TokenService {
  private static readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;
  private static readonly VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
  private static readonly RESET_TOKEN_EXPIRY_HOURS = 1;

  static generateAccessToken(payload: JWTPayload): string {
    return sign(payload, env.JWT_SECRET, { expiresIn: '24h' });
  }

  static async createRefreshToken(userId: string): Promise<string> {
    const token = sign({ userId }, env.JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt: dayjs().add(TokenService.REFRESH_TOKEN_EXPIRY_DAYS, 'day').toDate(),
      },
    });

    return refreshToken.token;
  }

  static async createVerificationToken(userId: string): Promise<string> {
    const token = sign({ userId }, env.JWT_SECRET, { expiresIn: '24h' });
    const verificationToken = await prisma.verificationToken.create({
      data: {
        token,
        userId,
        expiresAt: dayjs().add(TokenService.VERIFICATION_TOKEN_EXPIRY_HOURS, 'hour').toDate(),
      },
    });

    return verificationToken.token;
  }

  static async createPasswordResetToken(userId: string): Promise<string> {
    const token = sign({ userId }, env.JWT_SECRET, { expiresIn: '1h' });
    const resetToken = await prisma.passwordResetToken.create({
      data: {
        token,
        userId,
        expiresAt: dayjs().add(TokenService.RESET_TOKEN_EXPIRY_HOURS, 'hour').toDate(),
      },
    });

    return resetToken.token;
  }

  static async validateRefreshToken(token: string): Promise<string | null> {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!refreshToken || dayjs().isAfter(refreshToken.expiresAt)) {
      return null;
    }

    return refreshToken.userId;
  }

  static async validateVerificationToken(token: string): Promise<string | null> {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || dayjs().isAfter(verificationToken.expiresAt)) {
      return null;
    }

    return verificationToken.userId;
  }

  static async validateResetToken(token: string): Promise<string | null> {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || dayjs().isAfter(resetToken.expiresAt)) {
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