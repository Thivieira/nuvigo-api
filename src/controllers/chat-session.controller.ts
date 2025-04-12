import { FastifyRequest, FastifyReply } from 'fastify';
import { ChatSessionService } from '@/services/chat-session.service';
import { BaseController } from './base.controller';

interface UpdateSessionParams {
  sessionId: string;
}

interface UpdateSessionBody {
  title: string;
}

export class ChatSessionController extends BaseController {
  constructor(private chatSessionService: ChatSessionService) {
    super();
  }

  async getSessions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const sessions = await this.chatSessionService.findSessionsByUserId(request.user!.userId);
      return this.sendSuccess(reply, sessions);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async getSession(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      // Since this route is protected by the authenticate middleware,
      // we can safely use non-null assertion for the user property
      const user = request.user!;

      const session = await this.chatSessionService.findSessionById(request.params.sessionId);

      if (!session) {
        return this.sendError(reply, {
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
          details: { message: 'The requested chat session does not exist' }
        }, 404);
      }

      // Check if user is admin or owner of the session
      if (user.role !== 'ADMIN' && user.userId !== session.userId) {
        return this.sendError(reply, {
          error: 'Forbidden',
          code: 'FORBIDDEN',
          details: { message: 'You do not have permission to access this chat session' }
        }, 403);
      }

      return this.sendSuccess(reply, session);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async createSession(request: FastifyRequest<{ Body: { title?: string } }>, reply: FastifyReply) {
    try {
      const session = await this.chatSessionService.createSession(
        request.user!.userId,
        request.body.title
      );
      return this.sendSuccess(reply, session, 201);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async updateSession(
    request: FastifyRequest<{ Params: UpdateSessionParams; Body: UpdateSessionBody }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user!;
      const { sessionId } = request.params;

      // Check if session exists and user has access
      const existingSession = await this.chatSessionService.findSessionById(sessionId);

      if (!existingSession) {
        return this.sendError(reply, {
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
          details: { message: 'The requested chat session does not exist' }
        }, 404);
      }

      // Check if user is admin or owner of the session
      if (user.role !== 'ADMIN' && user.userId !== existingSession.userId) {
        return this.sendError(reply, {
          error: 'Forbidden',
          code: 'FORBIDDEN',
          details: { message: 'You do not have permission to modify this chat session' }
        }, 403);
      }

      const updatedSession = await this.chatSessionService.updateSession(
        sessionId,
        request.body.title
      );
      return this.sendSuccess(reply, updatedSession);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async deleteSession(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      const user = request.user!;
      const { sessionId } = request.params;

      // Check if session exists and user has access
      const existingSession = await this.chatSessionService.findSessionById(sessionId);

      if (!existingSession) {
        return this.sendError(reply, {
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
          details: { message: 'The requested chat session does not exist' }
        }, 404);
      }

      // Check if user is admin or owner of the session
      if (user.role !== 'ADMIN' && user.userId !== existingSession.userId) {
        return this.sendError(reply, {
          error: 'Forbidden',
          code: 'FORBIDDEN',
          details: { message: 'You do not have permission to delete this chat session' }
        }, 403);
      }

      await this.chatSessionService.deleteSession(sessionId);
      return this.sendSuccess(reply, null, 204);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }
} 