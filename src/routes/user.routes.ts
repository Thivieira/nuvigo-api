import { FastifyInstance, FastifyRequest } from 'fastify';
import { UserController } from '@/controllers/user.controller';
import { UserService } from '@/services/user.service';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin } from '@/middleware/role.middleware';
import { AuthenticatedRequest } from '@/types/auth';

const userService = new UserService();
const userController = new UserController(userService);

export default async function userRoutes(fastify: FastifyInstance) {
  // Registrar rotas que requerem autenticação
  fastify.register(async (authenticatedInstance) => {
    // Aplicar middleware de autenticação em todas as rotas deste grupo
    authenticatedInstance.addHook('preHandler', authenticate);

    // Listar todos os usuários (apenas administradores)
    authenticatedInstance.route({
      method: 'GET',
      url: '/',
      schema: {
        description: 'Obter todos os usuários (apenas administradores)',
        tags: ['user'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string', enum: ['USER', 'ADMIN'] },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
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
      preHandler: isAdmin,
      handler: userController.findAll.bind(userController),
    });

    // Obter perfil do usuário atual
    authenticatedInstance.route({
      method: 'GET',
      url: '/me',
      schema: {
        description: 'Obter perfil do usuário atual',
        tags: ['user'],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['USER', 'ADMIN'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
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
      handler: userController.getCurrentUser.bind(userController),
    });

    // Obter usuário por ID (apenas administradores)
    authenticatedInstance.route({
      method: 'GET',
      url: '/:id',
      schema: {
        description: 'Obter usuário por ID (apenas administradores)',
        tags: ['user'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['USER', 'ADMIN'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
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
      preHandler: isAdmin,
      handler: userController.findById.bind(userController),
    });

    // Atualizar usuário (administrador ou próprio perfil)
    authenticatedInstance.route({
      method: 'PUT',
      url: '/:id?',
      schema: {
        description: 'Atualizar usuário por ID (administrador ou próprio perfil). Se nenhum ID for fornecido, atualiza o perfil do usuário atual.',
        tags: ['user'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            phone: { type: 'string' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['USER', 'ADMIN'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
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
      preHandler: async (request: AuthenticatedRequest<{ Params: { id?: string } }>, reply) => {
        const userId = request.params.id;
        if (userId && userId !== request.user.userId) {
          await isAdmin(request, reply);
        }
      },
      handler: userController.update.bind(userController),
    });

    // Deletar usuário (administrador ou próprio perfil)
    authenticatedInstance.route({
      method: 'DELETE',
      url: '/:id?',
      schema: {
        description: 'Deletar usuário por ID (administrador ou próprio perfil). Se nenhum ID for fornecido, deleta o perfil do usuário atual.',
        tags: ['user'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          204: { type: 'null' },
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
      preHandler: async (request: AuthenticatedRequest<{ Params: { id?: string } }>, reply) => {
        const userId = request.params.id;
        if (userId && userId !== request.user.userId) {
          await isAdmin(request, reply);
        }
      },
      handler: userController.delete.bind(userController),
    });
  });

  // Rotas públicas (não requerem autenticação)
  fastify.route({
    method: 'POST',
    url: '/',
    schema: {
      description: 'Criar um novo usuário',
      tags: ['user'],
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
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
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
    handler: userController.create.bind(userController),
  });
} 