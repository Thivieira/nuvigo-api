import jwt from '@fastify/jwt';
import { env } from './env';
import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { swaggerOptions, swaggerUiOptions } from './config/swagger';
import {
  serializerCompiler,
  validatorCompiler
} from 'fastify-type-provider-zod';

export default async function registerPlugins(app: FastifyInstance) {
  // Set Zod validator and serializer compilers
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register JWT plugin
  app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: '24h'
    }
  });

  await app.register(swagger)

  await app.register(swaggerUi, swaggerUiOptions);
}

