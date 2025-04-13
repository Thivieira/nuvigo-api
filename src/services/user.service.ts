import { CreateUserDto, UpdateUserDto, UserWithoutPassword } from '@/types/user';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';

export class UserService {
  async create(data: CreateUserDto): Promise<UserWithoutPassword> {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      include: {
        chats: true,
        ChatSession: true,
        PasswordResetToken: true,
        refreshTokens: true,
        VerificationToken: true,
        locations: true
      }
    });

    return user;
  }

  async findAll(): Promise<UserWithoutPassword[]> {
    return prisma.user.findMany({
      include: {
        chats: true,
        ChatSession: true,
        PasswordResetToken: true,
        refreshTokens: true,
        VerificationToken: true,
        locations: true
      }
    });
  }

  async findById(id: string): Promise<UserWithoutPassword | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        chats: true,
        ChatSession: true,
        PasswordResetToken: true,
        refreshTokens: true,
        VerificationToken: true,
        locations: true
      }
    });
  }

  async update(id: string, data: UpdateUserDto): Promise<UserWithoutPassword> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return prisma.user.update({
      where: { id },
      data,
      include: {
        chats: true,
        ChatSession: true,
        PasswordResetToken: true,
        refreshTokens: true,
        VerificationToken: true,
        locations: true
      }
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }
} 