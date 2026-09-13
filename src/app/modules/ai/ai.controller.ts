import { Request, Response } from 'express';
import httpStatus from 'http-status';
import AppError from '../../errors/appError';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AIContextManagerService } from './ai-context-manager.service';
import { AIService } from './ai.service';
import { AIToolService } from './ai.tool.service';

const getMongoUserIdOrThrow = (req: Request): string => {
  if (!req.user.mongoUserId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
  }

  return req.user.mongoUserId;
};

const chatWithAI = catchAsync(async (req: Request, res: Response) => {
  const { message, documentId, documentIds, caseId, history } = req.body;

  const preparedContext = await AIContextManagerService.prepareContext({
    userId: req.user.userId,
    message,
    documentId,
    documentIds,
    caseId,
    history,
  });

  if (!preparedContext.allowed) {
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'AI request rejected by policy guardrails',
      data: {
        response:
          preparedContext.rejectionMessage ||
          'I can only assist with legal and platform-related questions.',
        policySignals: preparedContext.policySignals,
      },
    });
  }

  const response = await AIService.chatWithAI(
    preparedContext.sanitizedMessage,
    preparedContext.contextPrompt,
    preparedContext.history,
  );

  await AIContextManagerService.appendAssistantMessage(
    preparedContext.memoryKey,
    response,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'AI response generated',
    data: { response },
  });
});

const runTool = catchAsync(async (req: Request, res: Response) => {
  const result = await AIToolService.runTool({
    userId: req.user.userId,
    toolKey: req.params.toolKey,
    input: req.body.input,
    caseId: req.body.caseId,
    documentId: req.body.documentId,
    documentIds: req.body.documentIds,
    history: req.body.history,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.blocked
      ? 'AI tool request blocked by policy guardrails'
      : 'AI tool executed successfully',
    data: result,
  });
});

const getToolHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await AIToolService.getHistory({
    userId: req.user.userId,
    toolKey: req.query.toolKey as string | undefined,
    status: req.query.status as string | undefined,
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'AI tool history retrieved',
    meta: result.meta,
    data: result.result,
  });
});

const exportToolHistory = catchAsync(async (req: Request, res: Response) => {
  const exportData = await AIToolService.exportHistory({
    userId: req.user.userId,
    toolKey: req.query.toolKey as string | undefined,
    format: req.query.format as string | undefined,
  });

  res.setHeader('Content-Type', exportData.contentType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${exportData.fileName}"`,
  );
  return res.status(200).send(exportData.body);
});

const getToolMetrics = catchAsync(async (req: Request, res: Response) => {
  const result = await AIToolService.getUsageMetrics({
    toolKey: req.query.toolKey as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'AI tool usage metrics retrieved',
    data: result,
  });
});

const getContextProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await AIContextManagerService.getUserContextProfile(
    req.user.userId,
    req.query.caseId as string | undefined,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'AI context profile retrieved',
    data: result,
  });
});

const createOrUpdateChat = catchAsync(async (req: Request, res: Response) => {
  const { chatId, message, context } = req.body;
  const mongoUserId = getMongoUserIdOrThrow(req);

  console.log('createOrUpdateChat params:', {
    chatId,
    message,
    userId: req.user.userId,
    mongoUserId,
  });

  let result;
  if (chatId) {
    result = await AIService.continueChat(chatId, message, context);
  } else {
    result = await AIService.createChat(mongoUserId, message, context);
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: chatId ? 'Chat continued' : 'Chat started',
    data: result,
  });
});

const getUserChats = catchAsync(async (req: Request, res: Response) => {
  const mongoUserId = getMongoUserIdOrThrow(req);
  console.log('getUserChats userId:', req.user.userId, 'mongoUserId:', mongoUserId);
  const result = await AIService.getUserChats(mongoUserId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User chats retrieved',
    data: result,
  });
});

const getChat = catchAsync(async (req: Request, res: Response) => {
  const mongoUserId = getMongoUserIdOrThrow(req);
  const result = await AIService.getChat(req.params.id);
  // Ensure user owns the chat
  if (!result || result.userId.toString() !== mongoUserId) {
     return sendResponse(res, {
      statusCode: 404, // or 403
      success: false,
      message: 'Chat not found',
      data: null
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Chat retrieved',
    data: result,
  });
});

const deleteChat = catchAsync(async (req: Request, res: Response) => {
  const mongoUserId = getMongoUserIdOrThrow(req);
  const chat = await AIService.getChat(req.params.id);
   if (!chat || chat.userId.toString() !== mongoUserId) {
     return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Chat not found',
      data: null
    });
  }

  await AIService.deleteChat(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Chat deleted',
    data: null,
  });
});


export const AIController = {
  chatWithAI,
  runTool,
  getToolHistory,
  exportToolHistory,
  getToolMetrics,
  getContextProfile,
  createOrUpdateChat,
  getUserChats,
  getChat,
  deleteChat
};
