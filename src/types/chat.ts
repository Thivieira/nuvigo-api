import { Chat } from '@prisma/client';

export interface CreateChatDto {
  userId: string;
  location: string;
  temperature: string;
  condition: string;
  naturalResponse: string;
}

export interface UpdateChatDto {
  location?: string;
  temperature?: string;
  condition?: string;
  naturalResponse?: string;
}

export interface ChatResponse {
  id: string;
  userId: string;
  location: string;
  temperature: string;
  condition: string;
  naturalResponse: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatWithUser = Chat & {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}; 