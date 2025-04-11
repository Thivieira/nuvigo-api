
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
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        role: true,
      },
    });

    return user;
  }

  async findAll(): Promise<UserWithoutPassword[]> {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        role: true,
      },
    });
  }

  async findById(id: string): Promise<UserWithoutPassword | null> {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        role: true,
      },
    });
  }

  async update(id: string, data: UpdateUserDto): Promise<UserWithoutPassword> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        role: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }
} 