import { FastifyInstance } from 'fastify';
import { ChatController } from '@/controllers/chat.controller';
import { ChatService } from '@/services/chat.service';
import { WeatherService } from '@/services/weather.service';
import { authenticate } from '@/middleware/auth.middleware';
import { ChatSessionService } from '@/services/chat-session.service';
import { ChatSessionController } from '@/controllers/chat-session.controller';
import { prisma } from '@/lib/prisma';

const chatService = new ChatService(prisma);
const weatherService = new WeatherService();
const chatSessionService = new ChatSessionService(prisma);
const chatController = new ChatController(chatService, chatSessionService, weatherService);
const chatSessionController = new ChatSessionController(chatSessionService);

const UserBaseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string', nullable: true },
  }
};

export default async function chatSessionRoutes(fastify: FastifyInstance) {
  fastify.register(async (sessionInstance) => {
    sessionInstance.addHook('preHandler', authenticate);

    sessionInstance.route({
      method: 'GET',
      url: '/',
      schema: {
        description: 'Obter todas as sessões de chat do usuário autenticado',
        tags: ['chat-session'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'userId', 'title', 'chats', 'createdAt', 'updatedAt'],
              properties: {
                id: { type: 'string', format: 'uuid' },
                userId: { type: 'string', format: 'uuid' },
                title: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                user: UserBaseSchema,
                chats: {
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
                      updatedAt: { type: 'string', format: 'date-time' }
                    }
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
      handler: chatSessionController.getSessions.bind(chatSessionController),
    });

    sessionInstance.route({
      method: 'GET',
      url: '/:sessionId',
      schema: {
        description: 'Obter uma sessão de chat específica por ID',
        tags: ['chat-session'],
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
            type: 'object',
            required: ['id', 'userId', 'title', 'chats', 'createdAt', 'updatedAt'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid' },
              title: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              user: UserBaseSchema,
              chats: {
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
                    updatedAt: { type: 'string', format: 'date-time' }
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
      handler: chatSessionController.getSession.bind(chatSessionController),
    });

    sessionInstance.route({
      method: 'DELETE',
      url: '/:sessionId',
      schema: {
        description: 'Excluir uma sessão de chat específica e todas as suas mensagens',
        tags: ['chat-session'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: { type: 'string', format: 'uuid' }
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
      handler: chatSessionController.deleteSession.bind(chatSessionController),
    });

    sessionInstance.route({
      method: 'GET',
      url: '/:sessionId/chats',
      schema: {
        description: 'Obter todas as mensagens de chat de uma sessão específica',
        tags: ['chat-session'],
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
                updatedAt: { type: 'string', format: 'date-time' }
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