import { FastifyRequest, FastifyReply } from 'fastify';
import { LocationService } from '../services/location.service';
import { HTTPException } from '../exceptions';
import { JWTPayload } from '../types/auth';
import axios from 'axios';

interface AddLocationRequest {
  name: string;
}

export class LocationController {
  static async getLocations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as JWTPayload;
      const locations = await LocationService.getUserLocations(user.userId);
      return reply.send({ locations });
    } catch (error) {
      if (error instanceof HTTPException) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async addLocation(
    request: FastifyRequest<{ Body: AddLocationRequest }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as JWTPayload;
      const { name } = request.body;
      const location = await LocationService.addLocation(user.userId, name);
      return reply.status(201).send(location);
    } catch (error) {
      if (error instanceof HTTPException) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async setActiveLocation(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as JWTPayload;
      const { id } = request.params;
      const location = await LocationService.setActiveLocation(user.userId, id);
      return reply.send(location);
    } catch (error) {
      if (error instanceof HTTPException) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async deleteLocation(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as JWTPayload;
      const { id } = request.params;
      await LocationService.deleteLocation(user.userId, id);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof HTTPException) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
} 