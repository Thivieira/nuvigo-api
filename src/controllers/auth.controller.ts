import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { AuthService } from '@/services/auth.service';
import { RegisterDto, LoginDto } from '@/types/auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { TokenService } from '@/services/token.service';

const prisma = new PrismaClient();

export class AuthController {
  private authService: AuthService;

  constructor(fastify: FastifyInstance) {
    this.authService = new AuthService(fastify);
  }

  async register(request: FastifyRequest<{ Body: RegisterDto }>, reply: FastifyReply) {
    try {
      const { email, password, name } = request.body;

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      });

      const accessToken = TokenService.generateAccessToken(user.id);
      const refreshToken = await TokenService.createRefreshToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async login(request: FastifyRequest<{ Body: LoginDto }>, reply: FastifyReply) {
    try {
      const { email, password } = request.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const accessToken = TokenService.generateAccessToken(user.id);
      const refreshToken = await TokenService.createRefreshToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
} 