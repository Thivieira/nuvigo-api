import jwt from '@fastify/jwt';
import { env } from './env';
import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { swaggerOptions, swaggerUiOptions } from './config/swagger';

export default async function registerPlugins(app: FastifyInstance) {
  // Register JWT plugin
  app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: '24h'
    }
  });

  // Register Swagger plugins
  await app.register(swagger, swaggerOptions);
  await app.register(swaggerUi, swaggerUiOptions);
}

