import { PrismaClient } from '@prisma/generated/client';
import { ChatSession, ChatSessionChat } from '@/types/chat-session';
import dayjs from '@/lib/dayjs';

const SESSION_EXPIRY_HOURS = 24;

export class ChatSessionService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Finds all chat sessions for a specific user.
   */
  async findSessionsByUserId(userId: string): Promise<ChatSession[]> {
    return this.prisma.chatSession.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            role: true
          }
        },
        chats: {
          select: {
            id: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            chatSessionId: true,
            message: true,
            role: true,
            turn: true,
            metadata: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Finds a specific chat session by its ID, including its chats.
   */
  async findSessionById(sessionId: string): Promise<ChatSession | null> {
    return this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            role: true
          }
        },
        chats: {
          select: {
            id: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            chatSessionId: true,
            message: true,
            role: true,
            turn: true,
            metadata: true
          }
        }
      }
    });
  }

  /**
   * Creates a new chat session for a user.
   */
  async createSession(userId: string, title?: string): Promise<ChatSession> {
    return this.prisma.chatSession.create({
      data: {
        userId,
        title,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            role: true
          }
        },
        chats: {
          select: {
            id: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            chatSessionId: true,
            message: true,
            role: true,
            turn: true,
            metadata: true
          }
        }
      }
    });
  }

  /**
   * Deletes a chat session and all its messages.
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.prisma.chatSession.delete({
      where: { id: sessionId }
    });
  }

  /**
   * Updates a chat session's title.
   */
  async updateSession(sessionId: string, title: string): Promise<ChatSession> {
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { title },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            role: true
          }
        },
        chats: {
          select: {
            id: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            chatSessionId: true,
            message: true,
            role: true,
            turn: true,
            metadata: true
          }
        }
      }
    });
  }

  /**
   * Finds an active chat session for a user (created within the last 24 hours)
   * or creates a new one if no suitable session exists.
   */
  async findOrCreateActiveSession(userId: string): Promise<ChatSession> {
    const expiryTime = dayjs().subtract(SESSION_EXPIRY_HOURS, 'hour').toDate();

    // Try to find an active session
    const activeSession = await this.prisma.chatSession.findFirst({
      where: {
        userId,
        createdAt: {
          gte: expiryTime
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            role: true
          }
        },
        chats: {
          select: {
            id: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            chatSessionId: true,
            message: true,
            role: true,
            turn: true,
            metadata: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (activeSession) {
      return activeSession;
    }

    // If no active session exists, create a new one
    return this.createSession(userId);
  }

  /**
   * Gets all chats for a specific session.
   */
  async getChatsBySessionId(sessionId: string): Promise<ChatSessionChat[]> {
    return this.prisma.chat.findMany({
      where: { chatSessionId: sessionId },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        chatSessionId: true,
        message: true,
        role: true,
        turn: true,
        metadata: true
      },
      orderBy: { turn: 'asc' }
    });
  }
} 