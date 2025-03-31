import { FastifyInstance } from 'fastify';
import { UserController } from '@/controllers/user.controller';
import { UserService } from '@/services/user.service';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

const userService = new UserService();
const userController = new UserController(userService);

// Define Zod schemas
const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().optional(),
});

const UserIdParamSchema = z.object({
  id: z.string().uuid(),
});

const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  emailVerified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const UsersResponseSchema = z.array(UserResponseSchema);

const ErrorResponseSchema = z.object({
  error: z.string(),
});

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/users',
    schema: {
      description: 'Create a new user',
      tags: ['users'],
      body: CreateUserSchema,
      response: {
        201: UserResponseSchema,
        400: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: userController.create.bind(userController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/users',
    schema: {
      description: 'Get all users',
      tags: ['users'],
      response: {
        200: UsersResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: userController.findAll.bind(userController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/users/:id',
    schema: {
      description: 'Get user by ID',
      tags: ['users'],
      params: UserIdParamSchema,
      response: {
        200: UserResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: userController.findById.bind(userController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/users/:id',
    schema: {
      description: 'Update user by ID',
      tags: ['users'],
      params: UserIdParamSchema,
      body: UpdateUserSchema,
      response: {
        200: UserResponseSchema,
        404: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: userController.update.bind(userController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'DELETE',
    url: '/users/:id',
    schema: {
      description: 'Delete user by ID',
      tags: ['users'],
      params: UserIdParamSchema,
      response: {
        204: z.null(),
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: userController.delete.bind(userController),
  });
} 