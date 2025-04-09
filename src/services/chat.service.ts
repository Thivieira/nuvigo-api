import { PrismaClient, ChatSession } from '@prisma/client';
import {
  CreateChatDto,
  UpdateChatDto,
  ChatWithSessionAndUser,
  SessionWithChats,
} from '@/types/chat';
import dayjs from '@/lib/dayjs';

const prisma = new PrismaClient();
const SESSION_TIMEOUT_MINUTES = 30;
const MAX_SESSION_MESSAGES = 500;
const MAX_SESSION_DURATION_HOURS = 12;

export class ChatService {
  /**
   * Finds the most recent active chat session for a user that is within limits,
   * or creates a new one if no suitable session exists.
   * - A session is considered active if its last update was within SESSION_TIMEOUT_MINUTES.
   * - A session is considered valid if it hasn't exceeded MAX_SESSION_DURATION_HOURS since creation.
   * - A session is considered valid if it has less than MAX_SESSION_MESSAGES messages.
   */
  async findOrCreateActiveSession(userId: string, title?: string): Promise<ChatSession> {
    // First verify if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Find the latest active session for this user
    const latestSession = await prisma.chatSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    if (latestSession && latestSession.updatedAt > dayjs().subtract(1, 'minute').toDate()) {
      return latestSession;
    } else if (latestSession && latestSession.updatedAt < dayjs().subtract(1, 'minute').toDate()) {
      await prisma.chatSession.update({
        where: { id: latestSession.id },
        data: { updatedAt: new Date() },
      });

      return latestSession;
    } else {
      return prisma.chatSession.create({
        data: {
          userId: userId,
          title: title,
        },
      });
    }
  }

  /**
   * Creates a new chat message within a specific session.
   */
  async create(data: CreateChatDto): Promise<ChatWithSessionAndUser> {
    await prisma.chatSession.update({
      where: { id: data.chatSessionId },
      data: { updatedAt: new Date() },
    });

    return prisma.chat.create({
      data,
      include: {
        chatSession: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Finds all chat sessions for a specific user.
   */
  async findSessionsByUserId(userId: string): Promise<SessionWithChats[]> {
    return prisma.chatSession.findMany({
      where: { userId },
      include: {
        chats: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * Finds a specific chat session by its ID, including its chats.
   */
  async findSessionById(sessionId: string): Promise<SessionWithChats | null> {
    return prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        chats: {
          orderBy: { createdAt: 'asc' },
        },
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

  /**
   * Finds a single chat message by its ID.
   */
  async findChatById(id: string): Promise<ChatWithSessionAndUser | null> {
    return prisma.chat.findUnique({
      where: { id },
      include: {
        chatSession: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Updates a specific chat message.
   */
  async updateChat(id: string, data: UpdateChatDto): Promise<ChatWithSessionAndUser> {
    const updatedChat = await prisma.chat.update({
      where: { id },
      data,
      include: {
        chatSession: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
    await prisma.chatSession.update({
      where: { id: updatedChat.chatSessionId },
      data: { updatedAt: new Date() },
    });
    return updatedChat;
  }

  /**
   * Deletes a specific chat message.
   */
  async deleteChat(id: string): Promise<void> {
    const chat = await prisma.chat.findUnique({ where: { id }, select: { chatSessionId: true } });
    if (!chat) {
      return;
    }

    await prisma.chat.delete({
      where: { id },
    });

    await prisma.chatSession.update({
      where: { id: chat.chatSessionId },
      data: { updatedAt: new Date() },
    });
  }

  /**
   * Deletes an entire chat session and all its messages.
   */
  async deleteSession(sessionId: string): Promise<void> {
    await prisma.chatSession.delete({
      where: { id: sessionId },
    });
  }
} 