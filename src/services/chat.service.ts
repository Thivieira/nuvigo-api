import { PrismaClient } from '@prisma/client';
import { CreateChatDto, UpdateChatDto, ChatResponse, ChatWithUser } from '../types/chat';

const prisma = new PrismaClient();

export class ChatService {
  async create(data: CreateChatDto): Promise<ChatResponse> {
    return prisma.chat.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async findAll(): Promise<ChatWithUser[]> {
    return prisma.chat.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string): Promise<ChatWithUser | null> {
    return prisma.chat.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<ChatWithUser[]> {
    return prisma.chat.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, data: UpdateChatDto): Promise<ChatResponse> {
    return prisma.chat.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.chat.delete({
      where: { id },
    });
  }
} 