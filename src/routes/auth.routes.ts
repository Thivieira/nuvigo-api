import { FastifyInstance, FastifyRequest, RouteHandlerMethod } from 'fastify';
import { AuthController } from '@/controllers/auth.controller';
import { AuthService } from '@/services/auth.service';
import { authenticate } from '@/middleware/auth.middleware';
import { RegisterDto } from '@/types/auth';

export default async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);
  const authController = new AuthController(authService);

  fastify.route({
    method: 'POST',
    url: '/register',
    schema: {
      description: 'Registrar um novo usuário',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
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
        }
      }
    },
    handler: async (request, reply) => {
      return authController.register(request as FastifyRequest<{ Body: RegisterDto }>, reply);
    },
  });

  fastify.route({
    method: 'POST',
    url: '/login',
    schema: {
      description: 'Login com email e senha',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                email: { type: 'string', format: 'email' }
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
        }
      }
    },
    handler: authController.login.bind(authController),
  });

  fastify.route({
    method: 'GET',
    url: '/me',
    schema: {
      description: 'Obter informações do usuário atual',
      tags: ['auth'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
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
        }
      }
    },
    preHandler: authenticate,
    handler: authController.me.bind(authController),
  });

  fastify.route({
    method: 'POST',
    url: '/refresh',
    schema: {
      description: 'Atualizar token de acesso usando token de refresh',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                name: { type: 'string' }
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
    handler: authController.refreshToken.bind(authController),
  });

  fastify.route({
    method: 'POST',
    url: '/logout',
    schema: {
      description: 'Logout e invalidar token de refresh',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' }
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
    handler: authController.logout.bind(authController),
  });

  fastify.route({
    method: 'POST',
    url: '/verify-email',
    schema: {
      description: 'Verificar email do usuário com token',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' }
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
    handler: authController.verifyEmail.bind(authController),
  });

  fastify.route({
    method: 'POST',
    url: '/forgot-password',
    schema: {
      description: 'Solicitar redefinição de senha por email',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' }
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
    handler: authController.forgotPassword.bind(authController),
  });

  fastify.route({
    method: 'POST',
    url: '/reset-password',
    schema: {
      description: 'Redefinir senha com token',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string' },
          password: { type: 'string', minLength: 6 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    },
    handler: authController.resetPassword.bind(authController),
  });

  fastify.route({
    method: 'POST',
    url: '/change-password',
    schema: {
      description: 'Alterar senha do usuário',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['oldPassword', 'newPassword'],
        properties: {
          oldPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 6 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      },
    },
    preHandler: authenticate,
    handler: authController.changePassword.bind(authController) as RouteHandlerMethod,
  });
}