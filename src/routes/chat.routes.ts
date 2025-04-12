import { FastifyInstance } from 'fastify';
import { ChatController } from '@/controllers/chat.controller';
import { ChatService } from '@/services/chat.service';
import { WeatherService } from '@/services/weather.service';
import { authenticate } from '@/middleware/auth.middleware';
import { ChatCreate as CreateChatDto, ChatUpdate as UpdateChatDto } from '@/types/chat';
import { ChatBaseSchema, ChatCreateSchema, ChatUpdateSchema } from '@/types/chat';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const chatService = new ChatService(prisma);
const weatherService = new WeatherService();
const chatController = new ChatController(chatService, weatherService);

const UserBaseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string', nullable: true },
  }
};


export default async function chatRoutes(fastify: FastifyInstance) {
  fastify.register(async (sessionInstance) => {
    sessionInstance.addHook('preHandler', authenticate);

    sessionInstance.route({
      method: 'GET',
      url: '/sessions',
      schema: {
        description: 'Get all chat sessions for the authenticated user',
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
      handler: chatController.getSessions.bind(chatController),
    });

    sessionInstance.route({
      method: 'GET',
      url: '/sessions/:sessionId',
      schema: {
        description: 'Get a specific chat session by ID (includes messages)',
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
      handler: chatController.getSession.bind(chatController),
    });

    sessionInstance.route({
      method: 'DELETE',
      url: '/sessions/:sessionId',
      schema: {
        description: 'Delete a specific chat session and all its messages',
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
      handler: chatController.deleteChat.bind(chatController),
    });
  });

  fastify.register(async (chatInstance) => {
    chatInstance.addHook('preHandler', authenticate);

    chatInstance.route({
      method: 'POST',
      url: '/',
      schema: {
        description: 'Create a new chat message and get weather response if applicable',
        tags: ['chat'],
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
          201: {
            type: 'object',
            properties: {
              userMessage: {
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
              },
              assistantMessage: {
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
                    properties: {
                      weather: {
                        type: 'object',
                        properties: {
                          location: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              country: { type: 'string' },
                              lat: { type: 'number' },
                              lon: { type: 'number' }
                            }
                          },
                          current: {
                            type: 'object',
                            properties: {
                              temp: { type: 'number' },
                              feels_like: { type: 'number' },
                              humidity: { type: 'number' },
                              wind_speed: { type: 'number' },
                              description: { type: 'string' },
                              icon: { type: 'string' }
                            }
                          },
                          forecast: {
                            type: 'object',
                            properties: {
                              high: { type: 'number' },
                              low: { type: 'number' },
                              precipitation_chance: { type: 'number' }
                            }
                          }
                        }
                      },
                      source: { type: 'string' }
                    }
                  },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' }
                }
              },
              chatHistory: {
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
      method: 'GET',
      url: '/:id',
      schema: {
        description: 'Get a specific chat message by ID',
        tags: ['chat'],
        security: [{ bearerAuth: [] }],
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
      handler: chatController.getChat.bind(chatController)
    });

    chatInstance.route({
      method: 'PUT',
      url: '/:id',
      schema: {
        description: 'Update a chat message',
        tags: ['chat'],
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
              updatedAt: { type: 'string', format: 'date-time' }
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
      handler: chatController.updateChat.bind(chatController)
    });

    chatInstance.route({
      method: 'DELETE',
      url: '/:id',
      schema: {
        description: 'Delete a specific chat message',
        tags: ['chat'],
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
        tags: ['chat'],
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