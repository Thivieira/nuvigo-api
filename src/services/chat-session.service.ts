import { PrismaClient, ChatSession, Chat } from '@prisma/client';
import dayjs from '@/lib/dayjs';

const SESSION_EXPIRY_HOURS = 24;

type SessionWithChats = ChatSession & {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  chats: Chat[];
};

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
            name: true
          }
        },
        chats: true
      },
      orderBy: { createdAt: 'desc' }
    });
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
            name: true
          }
        },
        chats: true
      }
    });
  }

  /**
   * Creates a new chat session.
   */
  async createSession(userId: string, title?: string): Promise<SessionWithChats> {
    return this.prisma.chatSession.create({
      data: {
        userId,
        title: title || `Chat Session ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        chats: true
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
  async updateSession(sessionId: string, title: string): Promise<SessionWithChats> {
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { title },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        chats: true
      }
    });
  }

  /**
   * Finds the most recent active chat session for a user that is within limits,
   * or creates a new one if no suitable session exists.
   */
  async findOrCreateActiveSession(userId: string): Promise<SessionWithChats> {
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
            name: true
          }
        },
        chats: true
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