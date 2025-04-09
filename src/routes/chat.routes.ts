import { FastifyInstance } from 'fastify';
import { ChatController } from '@/controllers/chat.controller';
import { ChatService } from '@/services/chat.service';
import { authenticate } from '@/middleware/auth.middleware';
import { CreateChatDto, UpdateChatDto } from '@/types/chat';

const chatService = new ChatService();
const chatController = new ChatController(chatService);

const UserBaseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string', nullable: true },
  }
};

const ChatBaseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    chatSessionId: { type: 'string', format: 'uuid' },
    location: { type: 'string' },
    temperature: { type: 'string' },
    condition: { type: 'string' },
    naturalResponse: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  }
};

const SessionBaseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    title: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
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
              allOf: [
                SessionBaseSchema,
                {
                  type: 'object',
                  properties: {
                    user: UserBaseSchema,
                    chats: {
                      type: 'array',
                      items: ChatBaseSchema
                    }
                  }
                }
              ]
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
      handler: chatController.findUserSessions.bind(chatController),
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
            allOf: [
              SessionBaseSchema,
              {
                type: 'object',
                properties: {
                  user: UserBaseSchema,
                  chats: {
                    type: 'array',
                    items: ChatBaseSchema
                  }
                }
              }
            ]
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
      handler: chatController.findSessionById.bind(chatController),
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
      handler: chatController.deleteSession.bind(chatController),
    });
  });

  fastify.register(async (chatInstance) => {
    chatInstance.addHook('preHandler', authenticate);

    chatInstance.route({
      method: 'POST',
      url: '/chats',
      schema: {
        description: 'Create a new chat message within a session',
        tags: ['chat-message'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['chatSessionId', 'location', 'temperature', 'condition', 'naturalResponse'],
          properties: {
            chatSessionId: { type: 'string', format: 'uuid' },
            location: { type: 'string' },
            temperature: { type: 'string' },
            condition: { type: 'string' },
            naturalResponse: { type: 'string' }
          }
        },
        response: {
          201: {
            allOf: [
              ChatBaseSchema,
              {
                type: 'object',
                properties: {
                  chatSession: {
                    allOf: [
                      SessionBaseSchema,
                      { properties: { user: UserBaseSchema } }
                    ]
                  }
                }
              }
            ]
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
      handler: chatController.createChatMessage.bind(chatController),
    });

    chatInstance.route({
      method: 'GET',
      url: '/chats/:chatId',
      schema: {
        description: 'Get a specific chat message by ID',
        tags: ['chat-message'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['chatId'],
          properties: {
            chatId: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          200: {
            allOf: [
              ChatBaseSchema,
              {
                type: 'object',
                properties: {
                  chatSession: {
                    allOf: [
                      SessionBaseSchema,
                      { properties: { user: UserBaseSchema } }
                    ]
                  }
                }
              }
            ]
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
      handler: chatController.findChatById.bind(chatController),
    });

    chatInstance.route({
      method: 'PUT',
      url: '/chats/:chatId',
      schema: {
        description: 'Update a specific chat message by ID',
        tags: ['chat-message'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['chatId'],
          properties: {
            chatId: { type: 'string', format: 'uuid' }
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
            allOf: [
              ChatBaseSchema,
              {
                type: 'object',
                properties: {
                  chatSession: {
                    allOf: [
                      SessionBaseSchema,
                      { properties: { user: UserBaseSchema } }
                    ]
                  }
                }
              }
            ]
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
      handler: chatController.updateChatMessage.bind(chatController),
    });

    chatInstance.route({
      method: 'DELETE',
      url: '/chats/:chatId',
      schema: {
        description: 'Delete a specific chat message by ID',
        tags: ['chat-message'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['chatId'],
          properties: {
            chatId: { type: 'string', format: 'uuid' }
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
      handler: chatController.deleteChatMessage.bind(chatController),
    });
  });
} 