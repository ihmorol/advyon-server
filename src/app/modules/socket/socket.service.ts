import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '@clerk/clerk-sdk-node';
import { Types } from 'mongoose';
import config from '../../config';
import { User } from '../user/user.model';
import { CaseServices } from '../case/case.service';
import { Conversation } from '../chat/chat.model';

/**
 * Phase 8.1-8.2: WebSocket Service
 * Handles real-time notifications for:
 * - AI Analysis completion
 * - New message alerts
 * - Case status updates
 * - Dashboard stat updates
 * - Sidebar counters (WBS-5.2)
 * - Online status (WBS-5.2)
 */

// Event types for type safety
export const SOCKET_EVENTS = {
  // Server -> Client events
  CASE_UPDATED: 'case:updated',
  MSG_RECEIVED: 'message:received',
  ANALYSIS_COMPLETE: 'analysis:complete',
  STATS_UPDATED: 'stats:updated',
  NOTIFICATION: 'notification:new',
  SIDEBAR_UPDATE: 'sidebar:update', // WBS-5.2
  USER_ONLINE: 'user:online',       // WBS-5.2
  USER_OFFLINE: 'user:offline',     // WBS-5.2

  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  CHAT_STOP_TYPING: 'chat:stop-typing',
  CHAT_READ: 'chat:read',
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',

  // Client -> Server events
  JOIN_CASE: 'case:join',
  LEAVE_CASE: 'case:leave',
  SUBSCRIBE_USER: 'user:subscribe',
} as const;

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

class SocketService {
  private io: Server | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  /**
   * Initialize Socket.io server
   */
  initialize(httpServer: HttpServer): Server {
    this.io = new Server(httpServer, {
      cors: {
        origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth?.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify Clerk JWT
        const decoded = await verifyToken(token, {
          secretKey: config.clerk_secret_key as string,
          issuer: (iss) => iss.startsWith('https://'),
        });

        const user = await User.findOne({ clerkUserId: decoded.sub });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.userRole = user.role;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`[Socket] User connected: ${socket.userId}`);

      // Track user's socket connections
      if (socket.userId) {
        if (!this.userSockets.has(socket.userId)) {
          this.userSockets.set(socket.userId, new Set());
        }
        this.userSockets.get(socket.userId)!.add(socket.id);

        // Join user's personal room for targeted notifications
        socket.join(`user:${socket.userId}`);

        // Broadcast online status WBS-5.2
        this.broadcast(SOCKET_EVENTS.USER_ONLINE, { userId: socket.userId });
      }

      // Handle joining case rooms for case-specific updates
      // SECURITY: verify the user is allowed to view the case before joining,
      // reusing the same authorization logic as GET /cases/:caseId
      // (owner / primary client / shared access / admin).
      socket.on(SOCKET_EVENTS.JOIN_CASE, async (caseId: string) => {
        try {
          if (typeof caseId !== 'string' || !socket.userId) {
            throw new Error('Unauthorized');
          }

          // Throws (404/403) when the user cannot access the case
          await CaseServices.getCaseById(caseId, socket.userId);

          socket.join(`case:${caseId}`);
          console.log(`[Socket] User ${socket.userId} joined case:${caseId}`);
        } catch (error) {
          socket.emit('error:unauthorized', { room: `case:${caseId}` });
        }
      });

      socket.on(SOCKET_EVENTS.LEAVE_CASE, (caseId: string) => {
        socket.leave(`case:${caseId}`);
        console.log(`[Socket] User ${socket.userId} left case:${caseId}`);
      });

      // Chat room handlers
      // SECURITY: verify the user is a participant of the conversation before
      // joining. socket.userId is the custom user id (e.g. 'CLI-0001') while
      // conversation participants are stored as Mongo ObjectIds, so the user
      // document is loaded to compare against the participant list.
      socket.on(SOCKET_EVENTS.CHAT_JOIN, async (conversationId: string) => {
        try {
          if (
            typeof conversationId !== 'string' ||
            !socket.userId ||
            !Types.ObjectId.isValid(conversationId)
          ) {
            throw new Error('Unauthorized');
          }

          const user = await User.findOne({ id: socket.userId }).select('_id');
          if (!user) {
            throw new Error('Unauthorized');
          }

          const conversation = await Conversation.findOne({
            _id: new Types.ObjectId(conversationId),
            participants: user._id,
          });

          if (!conversation) {
            throw new Error('Unauthorized');
          }

          socket.join(`chat:${conversationId}`);
        } catch (error) {
          socket.emit('error:unauthorized', { room: `chat:${conversationId}` });
        }
      });

      socket.on(SOCKET_EVENTS.CHAT_LEAVE, (conversationId: string) => {
        socket.leave(`chat:${conversationId}`);
      });

      socket.on(SOCKET_EVENTS.CHAT_TYPING, (data: { conversationId: string }) => {
        socket.to(`chat:${data.conversationId}`).emit(SOCKET_EVENTS.CHAT_TYPING, {
          conversationId: data.conversationId,
          userId: socket.userId,
        });
      });

      socket.on(SOCKET_EVENTS.CHAT_STOP_TYPING, (data: { conversationId: string }) => {
        socket.to(`chat:${data.conversationId}`).emit(SOCKET_EVENTS.CHAT_STOP_TYPING, {
          conversationId: data.conversationId,
          userId: socket.userId,
        });
      });

      socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${socket.userId}`);
        if (socket.userId) {
          const userSockectSet = this.userSockets.get(socket.userId);
          if (userSockectSet) {
            userSockectSet.delete(socket.id);
            if (userSockectSet.size === 0) {
              this.userSockets.delete(socket.userId);
              // Broadcast offline status WBS-5.2
              this.broadcast(SOCKET_EVENTS.USER_OFFLINE, { userId: socket.userId });
            }
          }
        }
      });
    });

    console.log('[Socket] WebSocket server initialized');
    return this.io;
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  /**
   * Emit event to all users in a case room
   */
  emitToCase(caseId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`case:${caseId}`).emit(event, data);
    }
  }

  /**
   * Emit to all connected clients (admin broadcasts)
   */
  broadcast(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Notify user of new message
   */
  notifyNewMessage(userId: string, message: any): void {
    this.emitToUser(userId, SOCKET_EVENTS.MSG_RECEIVED, message);
    this.notifySidebarUpdate(userId, { type: 'messages' });
  }

  /**
   * Notify about AI analysis completion
   */
  notifyAnalysisComplete(userId: string, caseId: string, documentId: string, result: any): void {
    this.emitToUser(userId, SOCKET_EVENTS.ANALYSIS_COMPLETE, {
      caseId,
      documentId,
      result,
    });
    // Also notify everyone watching the case
    this.emitToCase(caseId, SOCKET_EVENTS.ANALYSIS_COMPLETE, {
      documentId,
      result,
    });
    this.notifySidebarUpdate(userId, { type: 'alerts' });
  }

  /**
   * Notify about case status change
   */
  notifyCaseUpdate(caseId: string, update: any): void {
    this.emitToCase(caseId, SOCKET_EVENTS.CASE_UPDATED, update);
  }

  /**
   * WBS-5.2: Send sidebar update trigger (counters, badges)
   */
  notifySidebarUpdate(userId: string, data: { type: 'cases' | 'messages' | 'alerts' | 'all' }): void {
    this.emitToUser(userId, SOCKET_EVENTS.SIDEBAR_UPDATE, data);
  }

  /**
   * Get Socket.io instance
   */
  getIO(): Server | null {
    return this.io;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}

// Singleton instance
export const socketService = new SocketService();
export default socketService;
