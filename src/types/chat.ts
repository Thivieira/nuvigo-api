import { Chat, User, ChatSession } from '@prisma/client';

export interface CreateChatDto {
  chatSessionId: string;
  userId?: string;
  message: string;
  response: string;
  metadata?: Record<string, any>;
}

export interface UpdateChatDto {
  location?: string;
  temperature?: string;
  condition?: string;
  naturalResponse?: string;
  metadata?: Record<string, any>;
}

export interface ChatResponse extends Omit<Chat, 'userId'> {
}

export type ChatWithSessionAndUser = Chat & {
  chatSession: ChatSession & {
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  };
};

export type SessionWithChats = ChatSession & {
  chats: Chat[];
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

export interface CreateChatSessionDto {
  userId: string;
  title?: string;
} 