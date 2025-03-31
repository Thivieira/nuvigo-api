import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '@/services/user.service';
import { CreateUserDto, UpdateUserDto } from '@/types/user';
import { Prisma } from '@prisma/client';

const userService = new UserService();

export class UserController {
  async create(request: FastifyRequest<{ Body: CreateUserDto }>, reply: FastifyReply) {
    try {
      const user = await userService.create(request.body);
      return reply.status(201).send(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return reply.status(400).send({ error: 'Email already exists' });
        }
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const users = await userService.findAll();
      return reply.send(users);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async findById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const user = await userService.findById(request.params.id);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }
      return reply.send(user);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserDto }>,
    reply: FastifyReply
  ) {
    try {
      const user = await userService.update(request.params.id, request.body);
      return reply.send(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return reply.status(404).send({ error: 'User not found' });
        }
        if (error.code === 'P2002') {
          return reply.status(400).send({ error: 'Email already exists' });
        }
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await userService.delete(request.params.id);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return reply.status(404).send({ error: 'User not found' });
        }
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
} 