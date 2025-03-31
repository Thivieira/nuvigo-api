import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes

export class TokenService {
  static generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY / 1000, // Convert to seconds
    });
  }

  static generateRefreshToken(): string {
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

  static async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.delete({
      where: { token },
    });
  }

  static async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
} 