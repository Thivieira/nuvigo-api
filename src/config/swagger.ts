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
      { name: 'user', description: 'User management endpoints' },
      { name: 'chat-session', description: 'Chat session endpoints' },
      { name: 'chat-message', description: 'Chat message endpoints' },
      { name: 'weather', description: 'Weather service endpoint' },
      { name: 'location', description: 'Location management endpoints' }
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
    deepLinking: false,
    displayRequestDuration: true,
    filter: true
  },
  staticCSP: true,
  transformStaticCSP: (header) => header
}; 