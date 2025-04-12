import { FastifyInstance } from 'fastify';
import { ChatController } from '@/controllers/chat.controller';
import { ChatService } from '@/services/chat.service';
import { ChatSessionService } from '@/services/chat-session.service';
import { WeatherService } from '@/services/weather.service';
import { authenticate } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

const chatService = new ChatService(prisma);
const chatSessionService = new ChatSessionService(prisma);
const weatherService = new WeatherService();
const chatController = new ChatController(chatService, chatSessionService, weatherService);

export default async function chatRoutes(fastify: FastifyInstance) {
  fastify.register(async (chatInstance) => {
    chatInstance.addHook('preHandler', authenticate);

    chatInstance.route({
      method: 'POST',
      url: '/',
      schema: {
        description: 'Create a new chat message',
        tags: ['chat-message'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['chatSessionId', 'message', 'role', 'turn'],
          properties: {
            chatSessionId: { type: 'string', format: 'uuid' },
            message: { type: 'string' },
            role: { type: 'string', enum: ['user', 'assistant'] },
            turn: { type: 'number' },
            metadata: {
              type: 'object',
              additionalProperties: true,
              nullable: true
            }
          }
        },
        response: {
          200: {
            type: 'object',
            required: ['id', 'chatSessionId', 'message', 'role', 'turn', 'createdAt', 'updatedAt'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid', nullable: true },
              chatSessionId: { type: 'string', format: 'uuid' },
              message: { type: 'string' },
              role: { type: 'string', enum: ['user', 'assistant'] },
              turn: { type: 'number' },
              metadata: {
                type: 'object',
                additionalProperties: true,
                nullable: true
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              chatSession: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  userId: { type: 'string', format: 'uuid' },
                  title: { type: 'string', nullable: true },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      email: { type: 'string', format: 'email' },
                      name: { type: 'string', nullable: true }
                    }
                  }
                }
              }
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
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
              details: { type: 'object' }
            }
          },
          403: {
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
      handler: chatController.createChat.bind(chatController)
    });

    chatInstance.route({
      method: 'PUT',
      url: '/:id',
      schema: {
        description: 'Update a chat message',
        tags: ['chat-message'],
        security: [{ bearerAuth: [] }],
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
            message: { type: 'string' },
            role: { type: 'string', enum: ['user', 'assistant'] },
            turn: { type: 'number' },
            metadata: {
              type: 'object',
              additionalProperties: true,
              nullable: true
            }
          }
        },
        response: {
          200: {
            type: 'object',
            required: ['id', 'chatSessionId', 'message', 'role', 'turn', 'createdAt', 'updatedAt'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid', nullable: true },
              chatSessionId: { type: 'string', format: 'uuid' },
              message: { type: 'string' },
              role: { type: 'string', enum: ['user', 'assistant'] },
              turn: { type: 'number' },
              metadata: {
                type: 'object',
                additionalProperties: true,
                nullable: true
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              chatSession: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  userId: { type: 'string', format: 'uuid' },
                  title: { type: 'string', nullable: true },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      email: { type: 'string', format: 'email' },
                      name: { type: 'string', nullable: true }
                    }
                  }
                }
              }
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
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
              details: { type: 'object' }
            }
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
              details: { type: 'object' }
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
      handler: chatController.updateChat.bind(chatController)
    });

    chatInstance.route({
      method: 'DELETE',
      url: '/:id',
      schema: {
        description: 'Delete a chat message',
        tags: ['chat-message'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          204: { type: 'null' },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
              details: { type: 'object' }
            }
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
              details: { type: 'object' }
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
      handler: chatController.deleteChat.bind(chatController)
    });

    chatInstance.route({
      method: 'GET',
      url: '/session/:sessionId',
      schema: {
        description: 'Get all chat messages for a specific session',
        tags: ['chat-message'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'chatSessionId', 'message', 'role', 'turn', 'createdAt', 'updatedAt'],
              properties: {
                id: { type: 'string', format: 'uuid' },
                userId: { type: 'string', format: 'uuid', nullable: true },
                chatSessionId: { type: 'string', format: 'uuid' },
                message: { type: 'string' },
                role: { type: 'string', enum: ['user', 'assistant'] },
                turn: { type: 'number' },
                metadata: {
                  type: 'object',
                  additionalProperties: true,
                  nullable: true
                },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                User: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string', nullable: true }
                  }
                }
              }
            }
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
              details: { type: 'object' }
            }
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
              details: { type: 'object' }
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
      handler: chatController.getChatsBySession.bind(chatController)
    });
  });
} 