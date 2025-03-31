import { FastifyInstance } from 'fastify';
import { UserController } from '@/controllers/user.controller';
import { CreateUserDto, UpdateUserDto } from '@/types/user';

const userController = new UserController();

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateUserDto }>(
    '/users',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            name: { type: 'string' },
          },
        },
      },
    },
    userController.create.bind(userController)
  );

  fastify.get('/users', userController.findAll.bind(userController));

  fastify.get<{ Params: { id: string } }>(
    '/users/:id',
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
    userController.findById.bind(userController)
  );

  fastify.put<{ Params: { id: string }; Body: UpdateUserDto }>(
    '/users/:id',
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
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            name: { type: 'string' },
          },
        },
      },
    },
    userController.update.bind(userController)
  );

  fastify.delete<{ Params: { id: string } }>(
    '/users/:id',
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
    userController.delete.bind(userController)
  );
} 