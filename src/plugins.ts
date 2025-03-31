import jwt from '@fastify/jwt';
import { env } from './env';
import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export default async function registerPlugins(app: FastifyInstance) {

  // Register JWT plugin
  app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: '24h'
    }
  });

  await app.register(swagger)

  await app.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    },
    uiHooks: {
      onRequest: function (request, reply, next) { next() },
      preHandler: function (request, reply, next) { next() }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => { return swaggerObject },
    transformSpecificationClone: true
  })

}

