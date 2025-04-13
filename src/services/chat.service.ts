import { PrismaClient, Prisma } from '@prisma/generated/client';
import { ChatCreate, ChatUpdate, ChatWithSessionAndUser } from '@/types/chat';

export class ChatService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Creates a new chat message within a specific session.
   */
  async create(userId: string, data: ChatCreate): Promise<ChatWithSessionAndUser> {
    // Get the current turn number for this session
    const lastMessage = await this.prisma.chat.findFirst({
      where: { chatSessionId: data.chatSessionId },
      orderBy: { turn: 'desc' },
      select: { turn: true }
    });

    const nextTurn = (lastMessage?.turn ?? 0) + 1;

    // Create the chat message
    const chat = await this.prisma.chat.create({
      data: {
        chatSessionId: data.chatSessionId,
        userId: userId,
        message: data.message,
        role: data.role,
        turn: nextTurn,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull
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

    return chat as unknown as ChatWithSessionAndUser;
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
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull
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
    }) as unknown as ChatWithSessionAndUser;
  }

  /**
   * Deletes a specific chat message.
   */
  async deleteChat(chatId: string): Promise<void> {
    await this.prisma.chat.delete({
      where: { id: chatId }
    });
  }

  async getChatById(id: string): Promise<ChatWithSessionAndUser> {
    const chat = await this.prisma.chat.findUnique({
      where: { id },
      include: {
        chatSession: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!chat) {
      throw new Error('Chat not found');
    }

    return chat as ChatWithSessionAndUser;
  }

  async getChatsBySessionId(sessionId: string): Promise<ChatWithSessionAndUser[]> {
    const chats = await this.prisma.chat.findMany({
      where: { chatSessionId: sessionId },
      include: {
        chatSession: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { turn: 'asc' }
    });

    return chats as ChatWithSessionAndUser[];
  }

  async findOrCreateActiveSession(userId: string, title?: string): Promise<{ id: string }> {
    const existingSession = await this.prisma.chatSession.findFirst({
      where: {
        userId
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (existingSession) {
      return { id: existingSession.id };
    }

    const newSession = await this.prisma.chatSession.create({
      data: {
        userId,
        title: title || 'New Chat'
      }
    });

    return { id: newSession.id };
  }

  async findSessionById(id: string) {
    return this.prisma.chatSession.findUnique({
      where: { id },
      include: {
        chats: {
          orderBy: { turn: 'asc' }
        }
      }
    });
  }

  async updateSession(id: string, data: { title?: string }) {
    return this.prisma.chatSession.update({
      where: { id },
      data
    });
  }
} 