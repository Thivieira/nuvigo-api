import { FastifyInstance } from 'fastify';
import { ChatController } from '@/controllers/chat.controller';
import { ChatService } from '@/services/chat.service';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

// Define Zod schemas
const CreateChatSchema = z.object({
  userId: z.string().uuid(),
  location: z.string(),
  temperature: z.string(),
  condition: z.string(),
  naturalResponse: z.string(),
});

const UpdateChatSchema = z.object({
  location: z.string().optional(),
  temperature: z.string().optional(),
  condition: z.string().optional(),
  naturalResponse: z.string().optional(),
});

const ChatIdParamSchema = z.object({
  id: z.string().uuid(),
});

const UserIdParamSchema = z.object({
  userId: z.string().uuid(),
});

const ChatResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  location: z.string(),
  temperature: z.string(),
  condition: z.string(),
  naturalResponse: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const ChatsResponseSchema = z.array(ChatResponseSchema);

const ErrorResponseSchema = z.object({
  error: z.string(),
});

const chatService = new ChatService();
const chatController = new ChatController(chatService);

export default async function chatRoutes(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/chats',
    schema: {
      description: 'Create a new chat',
      tags: ['chat'],
      body: CreateChatSchema,
      response: {
        201: ChatResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: chatController.create.bind(chatController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/chats',
    schema: {
      description: 'Get all chats',
      tags: ['chat'],
      response: {
        200: ChatsResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: chatController.findAll.bind(chatController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/chats/:id',
    schema: {
      description: 'Get chat by ID',
      tags: ['chat'],
      params: ChatIdParamSchema,
      response: {
        200: ChatResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: chatController.findById.bind(chatController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/chats/user/:userId',
    schema: {
      description: 'Get chats by user ID',
      tags: ['chat'],
      params: UserIdParamSchema,
      response: {
        200: ChatsResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: chatController.findByUserId.bind(chatController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/chats/:id',
    schema: {
      description: 'Update chat by ID',
      tags: ['chat'],
      params: ChatIdParamSchema,
      body: UpdateChatSchema,
      response: {
        200: ChatResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: chatController.update.bind(chatController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'DELETE',
    url: '/chats/:id',
    schema: {
      description: 'Delete chat by ID',
      tags: ['chat'],
      params: ChatIdParamSchema,
      response: {
        204: z.null(),
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: chatController.delete.bind(chatController),
  });
} 