import { SwaggerOptions } from '@fastify/swagger';
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui';

export const swaggerOptions: SwaggerOptions = {
  swagger: {
    info: {
      title: 'Documentação da API Nuvigo',
      description: 'Documentação da API para serviços da Nuvigo',
      version: '1.0.0'
    },
    host: 'localhost:3333',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'auth', description: 'Endpoints de autenticação' },
      { name: 'user', description: 'Endpoints de gerenciamento de usuários' },
      { name: 'chat-session', description: 'Endpoints de sessões de chat' },
      { name: 'chat-message', description: 'Endpoints de mensagens de chat' },
      { name: 'weather', description: 'Endpoint de serviço de previsão do tempo' },
      { name: 'location', description: 'Endpoints de gerenciamento de localizações' }
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