import { PrismaClient, ChatSession } from '@prisma/client';
import { SessionWithChats } from '@/types/chat';

export class ChatSessionService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Finds all chat sessions for a specific user.
   */
  async findSessionsByUserId(userId: string): Promise<SessionWithChats[]> {
    return this.prisma.chatSession.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        chats: true
      },
      orderBy: { createdAt: 'desc' }
    }) as Promise<SessionWithChats[]>;
  }

  /**
   * Finds a specific chat session by its ID, including its chats.
   */
  async findSessionById(sessionId: string): Promise<SessionWithChats | null> {
    return this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        chats: true
      }
    }) as Promise<SessionWithChats | null>;
  }

  /**
   * Creates a new chat session.
   */
  async createSession(userId: string, title?: string): Promise<SessionWithChats> {
    return this.prisma.chatSession.create({
      data: {
        userId,
        title: title || `Chat Session ${new Date().toLocaleString()}`
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        chats: true
      }
    }) as Promise<SessionWithChats>;
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
  async updateSession(sessionId: string, title: string): Promise<SessionWithChats> {
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { title },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        chats: true
      }
    }) as Promise<SessionWithChats>;
  }

  /**
   * Finds the most recent active chat session for a user that is within limits,
   * or creates a new one if no suitable session exists.
   */
  async findOrCreateActiveSession(userId: string): Promise<SessionWithChats> {
    const MAX_SESSION_MESSAGES = 50;
    const SESSION_EXPIRY_HOURS = 24;

    // First verify if the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Find the most recent active session
    const recentSession = await this.prisma.chatSession.findFirst({
      where: {
        userId: userId,
        createdAt: {
          gte: new Date(Date.now() - SESSION_EXPIRY_HOURS * 60 * 60 * 1000)
        }
      },
      include: {
        chats: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (recentSession) {
      const messageCount = await this.prisma.chat.count({
        where: { chatSessionId: recentSession.id }
      });

      if (messageCount < MAX_SESSION_MESSAGES) {
        return recentSession as SessionWithChats;
      }
    }

    // Create a new session if needed
    return this.createSession(userId);
  }

  /**
 * Gets all chat messages for a specific session.
 */
  async getChatsBySessionId(sessionId: string): Promise<Chat[]> {
    return this.prisma.chat.findMany({
      where: { chatSessionId: sessionId },
      orderBy: { turn: 'asc' },
      include: {
        User: true
      }
    });
  }
} 