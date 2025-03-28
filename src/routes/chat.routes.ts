import { FastifyInstance } from 'fastify';
import { ChatController } from '../controllers/chat.controller';
import { CreateChatDto, UpdateChatDto } from '../types/chat';

const chatController = new ChatController();

export default async function chatRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateChatDto }>(
    '/chats',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'location', 'temperature', 'condition', 'naturalResponse'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            location: { type: 'string' },
            temperature: { type: 'string' },
            condition: { type: 'string' },
            naturalResponse: { type: 'string' },
          },
        },
      },
    },
    chatController.create.bind(chatController)
  );

  fastify.get('/chats', chatController.findAll.bind(chatController));

  fastify.get<{ Params: { id: string } }>(
    '/chats/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    chatController.findById.bind(chatController)
  );

  fastify.get<{ Params: { userId: string } }>(
    '/chats/user/:userId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    chatController.findByUserId.bind(chatController)
  );

  fastify.put<{ Params: { id: string }; Body: UpdateChatDto }>(
    '/chats/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            location: { type: 'string' },
            temperature: { type: 'string' },
            condition: { type: 'string' },
            naturalResponse: { type: 'string' },
          },
        },
      },
    },
    chatController.update.bind(chatController)
  );

  fastify.delete<{ Params: { id: string } }>(
    '/chats/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    chatController.delete.bind(chatController)
  );
} 