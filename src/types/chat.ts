import { z } from 'zod';
import { UserBaseSchema } from './user';
import { Chat as PrismaChat, ChatSession as PrismaChatSession } from '@prisma/client';

export const ChatBaseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  chatSessionId: z.string().uuid(),
  message: z.string(),
  role: z.enum(['user', 'assistant']),
  turn: z.number(),
  metadata: z.record(z.unknown()).nullable()
}).describe('Base chat message schema');

export const ChatCreateSchema = z.object({
  chatSessionId: z.string().uuid(),
  message: z.string(),
  role: z.enum(['user', 'assistant']),
  turn: z.number(),
  metadata: z.record(z.unknown()).optional()
}).describe('Chat creation schema');

export const ChatUpdateSchema = z.object({
  message: z.string().optional(),
  role: z.enum(['user', 'assistant']).optional(),
  turn: z.number().optional(),
  metadata: z.record(z.unknown()).optional()
}).describe('Chat update schema');

export type Chat = z.infer<typeof ChatBaseSchema>;
export type ChatCreate = z.infer<typeof ChatCreateSchema>;
export type ChatUpdate = z.infer<typeof ChatUpdateSchema>;

export interface ChatResponse extends Omit<Chat, 'userId'> {
  user?: z.infer<typeof UserBaseSchema>;
}

export type ChatWithSessionAndUser = PrismaChat & {
  chatSession: PrismaChatSession & {
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  };
};

export type SessionWithChats = PrismaChatSession & {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  chats: (PrismaChat & {
    role: 'user' | 'assistant';
    metadata: Record<string, unknown> | null;
  })[];
};

export interface CreateChatSessionDto {
  userId: string;
  title?: string;
} 