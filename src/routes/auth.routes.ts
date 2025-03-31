import { FastifyInstance } from 'fastify';
import { AuthController } from '@/controllers/auth.controller';
import { RegisterDto, LoginDto } from '@/types/auth';
import { TokenService } from '@/services/token.service';
import { z } from 'zod';

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

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

  fastify.post('/auth/refresh', async (request, reply) => {
    try {
      const { refreshToken } = refreshTokenSchema.parse(request.body);

      const userId = await TokenService.validateRefreshToken(refreshToken);
      if (!userId) {
        return reply.status(401).send({ error: 'Invalid or expired refresh token' });
      }

      // Generate new access token
      const accessToken = TokenService.generateAccessToken(userId);

      // Generate new refresh token (optional - you might want to keep the same refresh token)
      const newRefreshToken = await TokenService.createRefreshToken(userId);

      // Revoke the old refresh token
      await TokenService.revokeRefreshToken(refreshToken);

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/auth/logout', async (request, reply) => {
    try {
      const { refreshToken } = refreshTokenSchema.parse(request.body);
      await TokenService.revokeRefreshToken(refreshToken);
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request body' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
} 