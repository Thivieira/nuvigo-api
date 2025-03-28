import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller';
import { RegisterDto, LoginDto } from '../types/auth';

export default async function authRoutes(fastify: FastifyInstance) {
  const authController = new AuthController(fastify);

  fastify.post<{ Body: RegisterDto }>(
    '/register',
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
    authController.register.bind(authController)
  );

  fastify.post<{ Body: LoginDto }>(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    authController.login.bind(authController)
  );
} 