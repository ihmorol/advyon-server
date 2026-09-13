import httpStatus from 'http-status';
import AppError from '../../errors/appError';
import { AIContextManagerService } from './ai-context-manager.service';
import { AIService } from './ai.service';
import { AI_TOOL_KEYS, TAIToolKey } from './ai.tool.interface';
import { AIToolHistoryModel } from './ai.tool.model';
import { sanitizeUserGeneratedText } from './input-sanitizer';

const TOOL_LABELS: Record<TAIToolKey, string> = {
  'contract-analyzer': 'Contract Analyzer',
  'document-generator': 'Legal Document Generator',
  'case-law-researcher': 'Case Law Researcher',
  'legal-writing-assistant': 'Legal Writing Assistant',
  'deposition-summarizer': 'Deposition Summarizer',
  'brief-analyzer': 'Brief Analyzer',
};

const TOOL_PROMPTS: Record<TAIToolKey, string> = {
  'contract-analyzer':
    'Analyze the provided legal contract text. Return risks, ambiguous clauses, obligations, and suggested redline language.',
  'document-generator':
    'Generate a legal draft document based on user requirements. Include sectioned headings and placeholders where facts are missing.',
  'case-law-researcher':
    'Provide relevant case-law research guidance with likely jurisdictions, search terms, and citation-ready references where possible.',
  'legal-writing-assistant':
    'Improve legal writing quality for clarity, structure, tone, and persuasiveness while preserving legal intent.',
  'deposition-summarizer':
    'Summarize deposition-style content into chronology, key admissions, contradictions, and follow-up questions.',
  'brief-analyzer':
    'Analyze a legal brief for argument strength, missing authorities, logical gaps, and revision recommendations.',
};

const getDailyUsageLimit = (): number => {
  const parsed = Number(process.env.AI_TOOL_DAILY_LIMIT || 30);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(1, Math.min(parsed, 200));
};

const isValidToolKey = (toolKey: string): toolKey is TAIToolKey =>
  AI_TOOL_KEYS.includes(toolKey as TAIToolKey);

export const buildToolPrompt = (toolKey: TAIToolKey, userInput: string): string => {
  const safeInput = sanitizeUserGeneratedText(userInput);
  return [
    `TOOL: ${TOOL_LABELS[toolKey]}`,
    TOOL_PROMPTS[toolKey],
    '',
    'USER INPUT:',
    safeInput,
    '',
    'Return practical legal guidance and clearly mark any assumptions.',
  ].join('\n');
};

const getTodayStart = (): Date => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const runTool = async (params: {
  userId: string;
  toolKey: string;
  input: string;
  caseId?: string;
  documentId?: string;
  documentIds?: string[];
  history?: { role: 'user' | 'assistant'; content: string }[];
}) => {
  if (!isValidToolKey(params.toolKey)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Unsupported AI tool key.');
  }

  const safeInput = sanitizeUserGeneratedText(params.input);
  if (!safeInput) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tool input cannot be empty.');
  }

  const dailyLimit = getDailyUsageLimit();
  const todayStart = getTodayStart();
  const todayUsageCount = await AIToolHistoryModel.countDocuments({
    userId: params.userId,
    status: 'success',
    createdAt: { $gte: todayStart },
  });

  if (todayUsageCount >= dailyLimit) {
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      `Daily AI tool limit reached (${dailyLimit}). Try again tomorrow.`,
    );
  }

  const context = await AIContextManagerService.prepareContext({
    userId: params.userId,
    message: safeInput,
    caseId: params.caseId,
    documentId: params.documentId,
    documentIds: params.documentIds,
    history: params.history,
  });

  const startedAt = Date.now();

  if (!context.allowed) {
    const blocked = await AIToolHistoryModel.create({
      userId: params.userId,
      toolKey: params.toolKey,
      input: safeInput,
      output:
        context.rejectionMessage ||
        'Tool execution blocked by policy. Please submit a legal-domain request.',
      status: 'blocked',
      latencyMs: Date.now() - startedAt,
      model: 'policy-guard',
      policySignals: context.policySignals,
      metadata: {
        caseId: params.caseId,
        documentIds: params.documentIds,
      },
    });

    return {
      historyId: blocked._id,
      toolKey: params.toolKey,
      blocked: true,
      result: blocked.output,
      usage: {
        todayCount: todayUsageCount,
        dailyLimit,
      },
    };
  }

  try {
    const prompt = buildToolPrompt(params.toolKey, safeInput);
    const output = await AIService.chatWithAI(
      prompt,
      context.contextPrompt,
      context.history,
      { throwOnFailure: true },
    );
    await AIContextManagerService.appendAssistantMessage(context.memoryKey, output);

    const record = await AIToolHistoryModel.create({
      userId: params.userId,
      toolKey: params.toolKey,
      input: safeInput,
      output,
      status: 'success',
      latencyMs: Date.now() - startedAt,
      model: 'groq',
      policySignals: [],
      metadata: {
        caseId: params.caseId,
        documentIds: params.documentIds,
      },
    });

    return {
      historyId: record._id,
      toolKey: params.toolKey,
      blocked: false,
      result: output,
      usage: {
        todayCount: todayUsageCount + 1,
        dailyLimit,
      },
    };
  } catch (error) {
    const message = (error as Error)?.message || 'AI tool execution failed';

    await AIToolHistoryModel.create({
      userId: params.userId,
      toolKey: params.toolKey,
      input: safeInput,
      output: message,
      status: 'failed',
      latencyMs: Date.now() - startedAt,
      model: 'groq',
      policySignals: [],
      metadata: {
        caseId: params.caseId,
        documentIds: params.documentIds,
      },
    });

    throw new AppError(httpStatus.BAD_GATEWAY, message);
  }
};

const getHistory = async (params: {
  userId: string;
  toolKey?: string;
  status?: string;
  page?: string;
  limit?: string;
}) => {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { userId: params.userId };
  if (params.toolKey && isValidToolKey(params.toolKey)) {
    filter.toolKey = params.toolKey;
  }
  if (params.status && ['success', 'blocked', 'failed'].includes(params.status)) {
    filter.status = params.status;
  }

  const [result, total] = await Promise.all([
    AIToolHistoryModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AIToolHistoryModel.countDocuments(filter),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    result,
  };
};

export const serializeHistoryToCsv = (items: any[]): string => {
  const headers = ['createdAt', 'toolKey', 'status', 'latencyMs', 'input', 'output'];
  const escape = (value: unknown): string =>
    `"${String(value ?? '')
      .replace(/"/g, '""')
      .replace(/\r?\n/g, ' ')}"`;

  const rows = items.map(item =>
    [
      item.createdAt?.toISOString?.() || item.createdAt || '',
      item.toolKey || '',
      item.status || '',
      item.latencyMs || 0,
      item.input || '',
      item.output || '',
    ]
      .map(escape)
      .join(','),
  );

  return [headers.join(','), ...rows].join('\n');
};

const exportHistory = async (params: {
  userId: string;
  toolKey?: string;
  format?: string;
}) => {
  const filter: Record<string, unknown> = { userId: params.userId };
  if (params.toolKey && isValidToolKey(params.toolKey)) {
    filter.toolKey = params.toolKey;
  }

  const items = await AIToolHistoryModel.find(filter).sort({ createdAt: -1 }).limit(1000);
  const format = (params.format || 'json').toLowerCase();

  if (format === 'csv') {
    return {
      contentType: 'text/csv',
      fileName: 'ai-tools-history.csv',
      body: serializeHistoryToCsv(items),
    };
  }

  return {
    contentType: 'application/json',
    fileName: 'ai-tools-history.json',
    body: JSON.stringify(items, null, 2),
  };
};

const getUsageMetrics = async (params: {
  toolKey?: string;
  from?: string;
  to?: string;
}) => {
  const match: Record<string, unknown> = {};
  if (params.toolKey && isValidToolKey(params.toolKey)) {
    match.toolKey = params.toolKey;
  }

  if (params.from || params.to) {
    const createdAt: Record<string, Date> = {};
    if (params.from) createdAt.$gte = new Date(params.from);
    if (params.to) createdAt.$lte = new Date(params.to);
    match.createdAt = createdAt;
  }

  const grouped = await AIToolHistoryModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          toolKey: '$toolKey',
          status: '$status',
        },
        count: { $sum: 1 },
        avgLatencyMs: { $avg: '$latencyMs' },
      },
    },
  ]);

  const byTool: Record<
    string,
    {
      total: number;
      success: number;
      blocked: number;
      failed: number;
      avgLatencyMs: number;
      completionRate: number;
    }
  > = {};
  const latencyAccumulator: Record<string, number> = {};

  grouped.forEach((item) => {
    const toolKey = item?._id?.toolKey || 'unknown';
    const status = item?._id?.status || 'unknown';
    const count = Number(item?.count || 0);
    const latency = Number(item?.avgLatencyMs || 0);

    if (!byTool[toolKey]) {
      byTool[toolKey] = {
        total: 0,
        success: 0,
        blocked: 0,
        failed: 0,
        avgLatencyMs: 0,
        completionRate: 0,
      };
      latencyAccumulator[toolKey] = 0;
    }

    byTool[toolKey].total += count;
    if (status === 'success') byTool[toolKey].success += count;
    if (status === 'blocked') byTool[toolKey].blocked += count;
    if (status === 'failed') byTool[toolKey].failed += count;
    latencyAccumulator[toolKey] += latency * count;
  });

  Object.keys(byTool).forEach((toolKey) => {
    const tool = byTool[toolKey];
    tool.avgLatencyMs = tool.total ? Number((latencyAccumulator[toolKey] / tool.total).toFixed(2)) : 0;
    tool.completionRate = tool.total ? Number((tool.success / tool.total).toFixed(4)) : 0;
  });

  return byTool;
};

export const AIToolService = {
  runTool,
  getHistory,
  exportHistory,
  getUsageMetrics,
};
