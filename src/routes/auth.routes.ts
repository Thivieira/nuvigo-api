import { FastifyInstance } from 'fastify';
import { AuthController } from '@/controllers/auth.controller';
import { AuthService } from '@/services/auth.service';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { authenticate } from '@/middleware/auth.middleware';

// Define Zod schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

const VerifyEmailSchema = z.object({
  token: z.string(),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
});

const RegisterResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

const TokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

const SuccessResponseSchema = z.object({
  success: z.boolean(),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
});

const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export default async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify as FastifyInstance);
  const authController = new AuthController(authService);

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/register',
    schema: {
      description: 'Register a new user',
      tags: ['auth'],
      body: RegisterSchema,
      response: {
        201: RegisterResponseSchema,
        400: ErrorResponseSchema,
        409: ErrorResponseSchema,
      },
    },
    handler: authController.register.bind(authController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/login',
    schema: {
      description: 'Login with email and password',
      tags: ['auth'],
      body: LoginSchema,
      response: {
        200: TokenResponseSchema,
        401: ErrorResponseSchema,
        400: ErrorResponseSchema,
      },
    },
    handler: authController.login.bind(authController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/refresh',
    schema: {
      description: 'Refresh access token using refresh token',
      tags: ['auth'],
      body: RefreshTokenSchema,
      response: {
        200: TokenResponseSchema,
        401: ErrorResponseSchema,
        400: ErrorResponseSchema,
      },
    },
    handler: authController.refreshToken.bind(authController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/logout',
    schema: {
      description: 'Logout and invalidate refresh token',
      tags: ['auth'],
      body: RefreshTokenSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: authController.logout.bind(authController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/verify-email',
    schema: {
      description: 'Verify user email with token',
      tags: ['auth'],
      body: VerifyEmailSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: authController.verifyEmail.bind(authController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/forgot-password',
    schema: {
      description: 'Request password reset email',
      tags: ['auth'],
      body: ForgotPasswordSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: authController.forgotPassword.bind(authController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/reset-password',
    schema: {
      description: 'Reset password with token',
      tags: ['auth'],
      body: ResetPasswordSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    handler: authController.resetPassword.bind(authController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/me',
    schema: {
      description: 'Get current user information',
      tags: ['auth'],
      response: {
        200: UserResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authenticate,
    handler: authController.me.bind(authController),
  });
} 