import { FastifyInstance } from 'fastify';
import { ChatController } from '@/controllers/chat.controller';
import { ChatService } from '@/services/chat.service';

const chatService = new ChatService();
const chatController = new ChatController(chatService);

export default async function chatRoutes(fastify: FastifyInstance) {
  fastify.route({
    method: 'POST',
    url: '/chats',
    schema: {
      description: 'Create a new chat',
      tags: ['chat'],
      body: {
        type: 'object',
        required: ['userId', 'location', 'temperature', 'condition', 'naturalResponse'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          location: { type: 'string' },
          temperature: { type: 'string' },
          condition: { type: 'string' },
          naturalResponse: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            location: { type: 'string' },
            temperature: { type: 'string' },
            condition: { type: 'string' },
            naturalResponse: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        }
      }
    },
    handler: chatController.create.bind(chatController),
  });

  fastify.route({
    method: 'GET',
    url: '/chats',
    schema: {
      description: 'Get all chats',
      tags: ['chat'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid' },
              location: { type: 'string' },
              temperature: { type: 'string' },
              condition: { type: 'string' },
              naturalResponse: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        }
      }
    },
    handler: chatController.findAll.bind(chatController),
  });

  fastify.route({
    method: 'GET',
    url: '/chats/:id',
    schema: {
      description: 'Get chat by ID',
      tags: ['chat'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            location: { type: 'string' },
            temperature: { type: 'string' },
            condition: { type: 'string' },
            naturalResponse: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        }
      }
    },
    handler: chatController.findById.bind(chatController),
  });

  fastify.route({
    method: 'GET',
    url: '/users/:userId/chats',
    schema: {
      description: 'Get chats by user ID',
      tags: ['chat'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid' },
              location: { type: 'string' },
              temperature: { type: 'string' },
              condition: { type: 'string' },
              naturalResponse: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        }
      }
    },
    handler: chatController.findByUserId.bind(chatController),
  });

  fastify.route({
    method: 'PUT',
    url: '/chats/:id',
    schema: {
      description: 'Update chat by ID',
      tags: ['chat'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          temperature: { type: 'string' },
          condition: { type: 'string' },
          naturalResponse: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            location: { type: 'string' },
            temperature: { type: 'string' },
            condition: { type: 'string' },
            naturalResponse: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        }
      }
    },
    handler: chatController.update.bind(chatController),
  });

  fastify.route({
    method: 'DELETE',
    url: '/chats/:id',
    schema: {
      description: 'Delete chat by ID',
      tags: ['chat'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        204: { type: 'null' },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        }
      }
    },
    handler: chatController.delete.bind(chatController),
  });
} 