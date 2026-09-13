import { Types } from 'mongoose';
import { AIContextManagerService } from '../ai/ai-context-manager.service';
import { AIService } from '../ai/ai.service';
import { sanitizeTagList, sanitizeUserGeneratedText } from '../ai/input-sanitizer';
import { Reply, Thread } from './community.model';

const COMMON_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'have',
  'what',
  'when',
  'where',
  'about',
  'your',
  'into',
  'would',
  'should',
  'could',
  'after',
  'before',
  'please',
  'need',
]);

const extractKeywords = (text: string): string[] =>
  sanitizeUserGeneratedText(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= 4 && !COMMON_STOP_WORDS.has(token));

const suggestSmartTags = (title: string, content: string): string[] => {
  const words = [...extractKeywords(title), ...extractKeywords(content)];
  const frequencies = words.reduce<Record<string, number>>((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word.replace(/_/g, '-'));

  return sanitizeTagList(sorted);
};

const findSimilarThreads = async (params: {
  title: string;
  content: string;
  threadId?: string;
  limit?: number;
}) => {
  const queryKeywords = Array.from(
    new Set([...extractKeywords(params.title), ...extractKeywords(params.content)]),
  ).slice(0, 8);

  if (!queryKeywords.length) return [];

  const regexClauses = queryKeywords.map(keyword => ({
    $or: [
      { title: { $regex: keyword, $options: 'i' } },
      { content: { $regex: keyword, $options: 'i' } },
      { tags: { $regex: keyword, $options: 'i' } },
    ],
  }));

  const filter: Record<string, unknown> = {
    isVisible: { $ne: false },
    $and: regexClauses,
  };

  if (params.threadId && Types.ObjectId.isValid(params.threadId)) {
    filter._id = { $ne: new Types.ObjectId(params.threadId) };
  }

  const limit = Math.min(10, Math.max(1, params.limit || 5));

  const threads = await Thread.find(filter)
    .sort({ upvotesCount: -1, repliesCount: -1, createdAt: -1 })
    .limit(limit)
    .select('title category tags upvotesCount repliesCount createdAt');

  return threads;
};

const summarizeThread = async (params: { threadId: string; userId: string }) => {
  const thread = await Thread.findOne({
    _id: params.threadId,
    isVisible: { $ne: false },
  }).select('title content category');
  if (!thread) return null;

  const replies = await Reply.find({
    threadId: thread._id,
    isVisible: { $ne: false },
  })
    .sort({ createdAt: 1 })
    .limit(20)
    .select('content');

  const combinedText = [
    `Thread title: ${thread.title}`,
    `Thread category: ${thread.category}`,
    `Question: ${thread.content}`,
    ...replies.map((reply, index) => `Reply ${index + 1}: ${reply.content}`),
  ].join('\n');

  const context = await AIContextManagerService.prepareContext({
    userId: params.userId,
    message: combinedText,
    history: [],
  });

  if (!context.allowed) {
    return {
      summary:
        'This discussion is available, but AI summary could not be generated due to policy guardrails.',
      legalReferences: [],
    };
  }

  const summaryPrompt = `
Summarize this legal community thread in 4-6 concise sentences.
Then provide up to 3 legal reference suggestions (statute/case-law topics) as a JSON array string under "refs".
Respond as:
{
  "summary": "...",
  "refs": ["...", "..."]
}`.trim();

  const output = await AIService.chatWithAI(
    summaryPrompt,
    `${context.contextPrompt}\n\nTHREAD CONTENT:\n${combinedText}`,
    context.history,
  );

  try {
    // Robust cleaning of the response
    let cleanedOutput = output
      .replace(/```json\n?/gi, '') // Remove start of markdown code block
      .replace(/```\n?/gi, '')     // Remove end of markdown code block
      .trim();

    // Find the JSON object bounds if there's extra text
    const jsonMatch = cleanedOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedOutput = jsonMatch[0];
    }

    const parsed = JSON.parse(cleanedOutput);

    // If parsing succeeds, return the cleaned fields
    return {
      summary: sanitizeUserGeneratedText(parsed.summary || ''),
      legalReferences: Array.isArray(parsed.refs)
        ? parsed.refs.map((item: string) => sanitizeUserGeneratedText(item)).slice(0, 3)
        : [],
    };
  } catch (_error) {
    // Fallback: If JSON parsing fails, we don't want to show the raw JSON prompt/output.
    // Instead, just return the raw text if it looks like a paragraph, or a generic message.
    
    // If the output looks like a JSON object we failed to parse, don't show it.
    if (output.trim().startsWith('{') || output.includes('"summary":')) {
         return {
            summary: "AI Summary generation failed to format correctly. Please try regenerating.",
            legalReferences: []
         };
    }

    return {
      summary: sanitizeUserGeneratedText(output),
      legalReferences: [],
    };
  }
};

const generateAnswerSuggestion = async (params: {
  userId: string;
  threadId?: string;
  draft?: string;
}) => {
  let threadContext = '';
  if (params.threadId) {
    const thread = await Thread.findOne({
      _id: params.threadId,
      isVisible: { $ne: false },
    }).select('title content category');
    if (thread) {
      threadContext = [
        `Thread title: ${thread.title}`,
        `Category: ${thread.category}`,
        `Question: ${thread.content}`,
      ].join('\n');
    }
  }

  const message = params.draft || threadContext || 'Generate a legal community answer.';
  const context = await AIContextManagerService.prepareContext({
    userId: params.userId,
    message,
    history: [],
  });

  if (!context.allowed) {
    return {
      suggestion:
        'AI suggestion is unavailable because the input is outside legal scope.',
      blocked: true,
    };
  }

  const prompt = `
Provide a suggested community answer in clear legal language.
- Keep tone professional and non-definitive.
- Include caveats when facts are missing.
- Suggest next practical steps for the user.
`.trim();

  const output = await AIService.chatWithAI(
    prompt,
    `${context.contextPrompt}\n\n${threadContext}\n\nDRAFT:\n${params.draft || ''}`,
    context.history,
  );

  return { suggestion: sanitizeUserGeneratedText(output), blocked: false };
};

const recommendLegalReferences = async (params: {
  userId: string;
  content: string;
}) => {
  const safeContent = sanitizeUserGeneratedText(params.content);
  const context = await AIContextManagerService.prepareContext({
    userId: params.userId,
    message: safeContent,
    history: [],
  });

  if (!context.allowed) {
    return [];
  }

  const prompt = `
List up to 5 legal-reference leads relevant to this question.
Return only bullet points, one reference per line.
Focus on legal topics (statutes, precedents, procedural rules).
`.trim();

  const output = await AIService.chatWithAI(
    prompt,
    `${context.contextPrompt}\n\nQUESTION:\n${safeContent}`,
    context.history,
  );

  return output
    .split('\n')
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5);
};

export const CommunityAIAssistService = {
  findSimilarThreads,
  suggestSmartTags,
  summarizeThread,
  generateAnswerSuggestion,
  recommendLegalReferences,
};

