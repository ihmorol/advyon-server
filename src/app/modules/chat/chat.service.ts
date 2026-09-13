import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/appError';
import { User } from '../user/user.model';
import { Conversation, ChatMessage } from './chat.model';
import { socketService } from '../socket/socket.service';

/**
 * Chat Service — handles conversation and message logic
 */

// Resolve user's MongoDB _id from their custom string id
const resolveUserId = async (userId: string): Promise<Types.ObjectId> => {
  let user;
  if (Types.ObjectId.isValid(userId)) {
    user = await User.findById(userId).select('_id');
  } else {
    user = await User.findOne({ id: userId }).select('_id');
  }
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user._id;
};

/**
 * Get or create a conversation between two users
 */
const getOrCreateConversation = async (currentUserId: string, otherUserId: string) => {
  const currentObjId = await resolveUserId(currentUserId);
  const otherObjId = await resolveUserId(otherUserId);

  if (currentObjId.equals(otherObjId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot create a conversation with yourself');
  }

  // Check if conversation already exists
  let conversation = await Conversation.findOne({
    participants: { $all: [currentObjId, otherObjId] },
  })
    .populate('participants', 'fullName displayName email avatarUrl role id phone')
    .lean();

  if (conversation) {
    return conversation;
  }

  // Create new conversation
  const newConv = await Conversation.create({
    participants: [currentObjId, otherObjId],
    lastMessage: '',
    lastMessageAt: new Date(),
    unreadCounts: new Map([
      [currentObjId.toString(), 0],
      [otherObjId.toString(), 0],
    ]),
  });

  // Return populated version
  conversation = await Conversation.findById(newConv._id)
    .populate('participants', 'fullName displayName email avatarUrl role id phone')
    .lean();

  return conversation;
};

/**
 * Get all conversations for a user
 */
const getConversations = async (userId: string) => {
  const userObjId = await resolveUserId(userId);

  const conversations = await Conversation.find({
    participants: userObjId,
  })
    .populate('participants', 'fullName displayName email avatarUrl role id phone')
    .sort({ lastMessageAt: -1 })
    .lean();

  // Attach unread count for this user
  return conversations.map((conv: any) => ({
    ...conv,
    unreadCount: conv.unreadCounts?.get?.(userObjId.toString()) ||
      (conv.unreadCounts && conv.unreadCounts[userObjId.toString()]) || 0,
  }));
};

/**
 * Get paginated messages for a conversation
 */
const getMessages = async (
  conversationId: string,
  userId: string,
  page = 1,
  limit = 50
) => {
  const userObjId = await resolveUserId(userId);

  // Verify user is a participant
  const conversation = await Conversation.findOne({
    _id: new Types.ObjectId(conversationId),
    participants: userObjId,
  });

  if (!conversation) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not a participant of this conversation');
  }

  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    ChatMessage.find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'fullName displayName avatarUrl id')
      .lean(),
    ChatMessage.countDocuments({ conversationId: new Types.ObjectId(conversationId) }),
  ]);

  return {
    messages: messages.reverse(), // Return in chronological order
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Send a message in a conversation
 */
const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string
) => {
  const senderObjId = await resolveUserId(senderId);

  // Verify sender is a participant
  const conversation = await Conversation.findOne({
    _id: new Types.ObjectId(conversationId),
    participants: senderObjId,
  });

  if (!conversation) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not a participant of this conversation');
  }

  // Create the message
  const chatMessage = await ChatMessage.create({
    conversationId: new Types.ObjectId(conversationId),
    senderId: senderObjId,
    content,
    status: 'sent',
  });

  // Update conversation
  const truncatedContent = content.length > 100 ? content.substring(0, 100) + '...' : content;

  // Increment unread count for the other participant
  const otherParticipant = conversation.participants.find(
    (p: Types.ObjectId) => !p.equals(senderObjId)
  );

  const updateObj: any = {
    lastMessage: truncatedContent,
    lastMessageAt: new Date(),
  };

  if (otherParticipant) {
    updateObj[`unreadCounts.${otherParticipant.toString()}`] =
      ((conversation.unreadCounts as any)?.get?.(otherParticipant.toString()) || 0) + 1;
  }

  await Conversation.findByIdAndUpdate(conversationId, { $set: updateObj });

  // Populate sender info for the response
  const populatedMessage = await ChatMessage.findById(chatMessage._id)
    .populate('senderId', 'fullName displayName avatarUrl id')
    .lean();

  // Emit via socket to the conversation room
  if (otherParticipant) {
    // Personal rooms are keyed by the custom user id (e.g. 'CLI-0001'),
    // not the Mongo ObjectId — resolve the participant's user document first.
    const otherUser = await User.findById(otherParticipant).select('id');
    if (otherUser) {
      socketService.emitToUser(otherUser.id, 'chat:message', {
        conversationId,
        message: populatedMessage,
      });
    }
    // Also emit to the conversation room for any connected participants
    const io = socketService.getIO();
    if (io) {
      io.to(`chat:${conversationId}`).emit('chat:message', {
        conversationId,
        message: populatedMessage,
      });
    }
  }

  return populatedMessage;
};

/**
 * Mark all messages as read for a user in a conversation
 */
const markAsRead = async (conversationId: string, userId: string) => {
  const userObjId = await resolveUserId(userId);

  // Verify participant
  const conversation = await Conversation.findOne({
    _id: new Types.ObjectId(conversationId),
    participants: userObjId,
  });

  if (!conversation) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not a participant of this conversation');
  }

  // Mark all unread messages sent by others as read
  await ChatMessage.updateMany(
    {
      conversationId: new Types.ObjectId(conversationId),
      senderId: { $ne: userObjId },
      status: { $ne: 'read' },
    },
    {
      status: 'read',
      readAt: new Date(),
    }
  );

  // Reset unread count for this user
  await Conversation.findByIdAndUpdate(conversationId, {
    $set: { [`unreadCounts.${userObjId.toString()}`]: 0 },
  });

  // Notify the other participant that messages were read
  const otherParticipant = conversation.participants.find(
    (p: Types.ObjectId) => !p.equals(userObjId)
  );
  if (otherParticipant) {
    // Personal rooms are keyed by the custom user id (e.g. 'CLI-0001'),
    // not the Mongo ObjectId — resolve the participant's user document first.
    const otherUser = await User.findById(otherParticipant).select('id');
    if (otherUser) {
      socketService.emitToUser(otherUser.id, 'chat:read', {
        conversationId,
        readBy: userObjId.toString(),
      });
    }
  }

  return { success: true };
};

export const ChatService = {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
};
