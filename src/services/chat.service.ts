import { PrismaClient, Chat, ChatSession, Prisma } from '@prisma/client';
import {
  CreateChatDto,
  UpdateChatDto,
  ChatWithSessionAndUser,
  SessionWithChats,
  ChatCreate,
  ChatUpdate,
} from '@/types/chat';
import dayjs from '@/lib/dayjs';

const prisma = new PrismaClient();
const SESSION_TIMEOUT_MINUTES = 30;
const MAX_SESSION_MESSAGES = 500;
const MAX_SESSION_DURATION_HOURS = 12;

export class ChatService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Finds the most recent active chat session for a user that is within limits,
   * or creates a new one if no suitable session exists.
   * - A session is considered active if its last update was within SESSION_TIMEOUT_MINUTES.
   * - A session is considered valid if it hasn't exceeded MAX_SESSION_DURATION_HOURS since creation.
   * - A session is considered valid if it has less than MAX_SESSION_MESSAGES messages.
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
    const newSession = await this.prisma.chatSession.create({
      data: {
        userId: userId,
        title: `Chat Session ${new Date().toLocaleString()}`
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
    });

    return newSession as SessionWithChats;
  }

  /**
   * Creates a new chat message within a specific session.
   */
  async create(userId: string, data: ChatCreate): Promise<ChatWithSessionAndUser> {
    let chatSession = null;

    // Find or create chat session
    if (data.chatSessionId) {
      chatSession = await this.prisma.chatSession.update({
        where: { id: data.chatSessionId },
        data: { updatedAt: new Date() },
      });
    } else {
      chatSession = await this.findOrCreateActiveSession(userId);
    }

    // Get the current turn number for this session
    const lastMessage = await this.prisma.chat.findFirst({
      where: { chatSessionId: chatSession.id },
      orderBy: { turn: 'desc' },
      select: { turn: true }
    });

    const nextTurn = (lastMessage?.turn ?? 0) + 1;

    // Create the chat message
    const chat = await this.prisma.chat.create({
      data: {
        chatSessionId: chatSession.id,
        userId: userId,
        message: data.message,
        role: data.role,
        turn: nextTurn,
        metadata: data.metadata as Prisma.JsonValue
      },
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

    return chat as ChatWithSessionAndUser;
  }

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
   * Finds a single chat message by its ID.
   */
  async findChatById(chatId: string): Promise<ChatWithSessionAndUser | null> {
    return this.prisma.chat.findUnique({
      where: { id: chatId },
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
    }) as Promise<ChatWithSessionAndUser | null>;
  }

  /**
   * Updates a specific chat message.
   */
  async updateChat(chatId: string, data: ChatUpdate): Promise<ChatWithSessionAndUser> {
    return this.prisma.chat.update({
      where: { id: chatId },
      data: {
        message: data.message,
        role: data.role,
        turn: data.turn,
        metadata: data.metadata as Prisma.JsonValue
      },
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
    }) as Promise<ChatWithSessionAndUser>;
  }

  /**
   * Deletes a specific chat message.
   */
  async deleteChat(chatId: string): Promise<void> {
    await this.prisma.chat.delete({
      where: { id: chatId }
    });
  }

  /**
   * Deletes an entire chat session and all its messages.
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.prisma.chatSession.delete({
      where: { id: sessionId }
    });
  }

  async createChat(data: ChatCreate): Promise<Chat> {
    return this.prisma.chat.create({
      data: {
        chatSessionId: data.chatSessionId,
        message: data.message,
        role: data.role,
        turn: data.turn,
        metadata: data.metadata
      }
    });
  }

  async getChatById(id: string): Promise<Chat | null> {
    return this.prisma.chat.findUnique({
      where: { id },
      include: {
        chatSession: true,
        User: true
      }
    });
  }

  async updateChat(id: string, data: ChatUpdate): Promise<Chat> {
    return this.prisma.chat.update({
      where: { id },
      data: {
        message: data.message,
        role: data.role,
        turn: data.turn,
        metadata: data.metadata
      }
    });
  }

  async deleteChat(id: string): Promise<void> {
    await this.prisma.chat.delete({
      where: { id }
    });
  }

  async getChatsBySessionId(sessionId: string): Promise<Chat[]> {
    return this.prisma.chat.findMany({
      where: { chatSessionId: sessionId },
      orderBy: { turn: 'asc' },
      include: {
        User: true
      }
    });
  }

  async updateSession(sessionId: string, data: any): Promise<ChatSession> {
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: data
    });
  }

  async getSessionById(sessionId: string): Promise<ChatSession | null> {
    return this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        chats: true
      }
    });
  }

  async getSessionsByUserId(userId: string): Promise<ChatSession[]> {
    return this.prisma.chatSession.findMany({
      where: { userId },
      include: {
        chats: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }
} 