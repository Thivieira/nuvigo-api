import { FastifyInstance } from 'fastify';
import { LocationController } from '../controllers/location.controller';
import { authenticate } from '../middleware/auth.middleware';

export async function locationRoutes(fastify: FastifyInstance) {
  // Apply authentication middleware to all location routes
  fastify.addHook('onRequest', authenticate);

  // Get all locations for the authenticated user
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {
      description: 'Get all locations for the authenticated user',
      tags: ['location'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            locations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        }
      }
    },
    handler: LocationController.getLocations
  });

  // Add a new location
  fastify.route({
    method: 'POST',
    url: '/',
    schema: {
      description: 'Add a new location for the authenticated user',
      tags: ['location'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            description: 'Name of the location'
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        }
      }
    },
    handler: LocationController.addLocation
  });

  // Set a location as active
  fastify.route({
    method: 'PATCH',
    url: '/:id/active',
    schema: {
      description: 'Set a location as active for the authenticated user',
      tags: ['location'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Location ID'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        }
      }
    },
    handler: LocationController.setActiveLocation
  });

  // Delete a location
  fastify.route({
    method: 'DELETE',
    url: '/:id',
    schema: {
      description: 'Delete a location for the authenticated user',
      tags: ['location'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Location ID'
          }
        }
      },
      response: {
        204: { type: 'null' },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        }
      }
    },
    handler: LocationController.deleteLocation
  });
} 