import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto } from '../types/auth';

export class AuthController {
  private authService: AuthService;

  constructor(fastify: FastifyInstance) {
    this.authService = new AuthService(fastify);
  }

  async register(request: FastifyRequest<{ Body: RegisterDto }>, reply: FastifyReply) {
    try {
      const result = await this.authService.register(request.body);
      return reply.status(201).send(result);
    } catch (error: any) {
      if (error.message === 'Email already registered') {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async login(request: FastifyRequest<{ Body: LoginDto }>, reply: FastifyReply) {
    try {
      const result = await this.authService.login(request.body);
      return reply.send(result);
    } catch (error: any) {
      if (error.message === 'Invalid email or password') {
        return reply.status(401).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
} 