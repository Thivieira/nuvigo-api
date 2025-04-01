import { SwaggerOptions } from '@fastify/swagger';
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui';

export const swaggerOptions: SwaggerOptions = {
  swagger: {
    info: {
      title: 'Nuvigo API Documentation',
      description: 'API documentation for Nuvigo services',
      version: '1.0.0'
    },
    host: 'localhost:3333',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'users', description: 'User management endpoints' },
      { name: 'chat', description: 'Chat service endpoints' },
      { name: 'weather', description: 'Weather service endpoints' }
    ],
    securityDefinitions: {
      bearerAuth: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header'
      }
    }
  }
};

export const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false,
    displayRequestDuration: true,
    filter: true
  },
  staticCSP: true,
  transformStaticCSP: (header) => header
}; 