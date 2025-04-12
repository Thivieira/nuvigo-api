import { PrismaClient, Chat, Prisma } from '@prisma/client';
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
} 