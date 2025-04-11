import jwt from '@fastify/jwt';
import { env } from './env';
import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import cors from '@fastify/cors';
import { swaggerOptions, swaggerUiOptions } from './config/swagger';

export default async function registerPlugins(app: FastifyInstance) {
  // Register CORS
  app.register(cors, {
    origin: true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  // Register JWT plugin
  app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: '24h'
    }
  });

  // Register Swagger
  app.register(swagger, swaggerOptions);
  app.register(swaggerUi, swaggerUiOptions);

  // Add error handler for validation errors
  app.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
        code: 'VALIDATION_ERROR'
      });
    }

    if (error.statusCode === 401) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: error.message,
        code: 'UNAUTHORIZED'
      });
    }

    // Log the error
    app.log.error(error);

    // Send error response
    return reply.status(error.statusCode || 500).send({
      error: 'Internal Server Error',
      message: error.message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  });
}

