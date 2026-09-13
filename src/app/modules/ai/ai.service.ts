/* eslint-disable @typescript-eslint/no-var-requires */
import { Types } from 'mongoose';
import { groqClient, AI_MODEL as GROQ_MODEL } from '../../config/groq.config';
import { openrouterClient, OPENROUTER_VISION_MODEL, isOpenRouterAvailable } from '../../config/openrouter.config';
import { TAiAnalysis, TDocumentCategory } from '../document/document.interface';
import { AIChatModel } from './ai-chat.model';
import { OpenRouterService } from './openrouter.service';
import { TChatHistory } from './ai.interface';

const toObjectId = (value: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error('Invalid MongoDB user identifier.');
  }

  return new Types.ObjectId(value);
};

// Valid document categories
const VALID_CATEGORIES: TDocumentCategory[] = [
  'Affidavit', 'Evidence', 'Contract', 'Court Filing', 'Correspondence',
  'Legal Brief', 'Pleading', 'Discovery', 'Motion', 'Order', 'Judgment', 'Settlement', 'Other',
];

// Default analysis result
const DEFAULT_AI_ANALYSIS: TAiAnalysis = {
  summary: 'Unable to analyze document content.',
  rawSummary: '',
  keyPoints: [],
  extractedEntities: [],
  legalRefs: [],
  suggestions: [],
  documentCategory: 'Other',
  confidenceScore: 0,
  analyzedAt: new Date(),
  modelVersion: 'openrouter',
};

const LEGAL_ANALYSIS_PROMPT = `You are an expert legal document analyzer. Analyze this document and return a JSON response with:
{
  "summary": "2-3 paragraph professional summary",
  "rawSummary": "Detailed markdown explanation",
  "keyPoints": ["point 1", "point 2"],
  "extractedEntities": [{"name": "Entity", "type": "person/org/date", "count": 1}],
  "legalRefs": [{"citation": "Law Name", "description": "desc", "relevance": "high/medium/low"}],
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "documentCategory": "One of: ${VALID_CATEGORIES.join(', ')}",
  "confidenceScore": 0.85
}

Be thorough and accurate. Return ONLY valid JSON.`;

/**
 * Analyze document using OpenRouter (Primary - FREE)
 * Uses Gemini 2.0 Flash via OpenRouter with vision capabilities
 */
const analyzeWithOpenRouter = async (buffer: Buffer, mimeType: string): Promise<TAiAnalysis> => {
  if (!openrouterClient) {
    throw new Error('OpenRouter not configured - check OPENROUTER_API_KEY');
  }

  console.log(`[OpenRouter] Starting analysis. MIME: ${mimeType}, Size: ${buffer.length} bytes`);

  const base64Data = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const response = await openrouterClient.chat.completions.create({
    model: OPENROUTER_VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: LEGAL_ANALYSIS_PROMPT }
        ]
      }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4096,
  });

  const responseText = response.choices[0]?.message?.content || '{}';
  console.log(`[OpenRouter] Response received. Length: ${responseText.length}`);

  // Parse JSON response
  let parsedResult;
  try {
    // Try to extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    parsedResult = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
  } catch (e) {
    console.error('[OpenRouter] Failed to parse JSON:', e);
    parsedResult = {};
  }

  const analysis: TAiAnalysis = {
    summary: parsedResult.summary || DEFAULT_AI_ANALYSIS.summary,
    rawSummary: parsedResult.rawSummary || '',
    keyPoints: Array.isArray(parsedResult.keyPoints) ? parsedResult.keyPoints : [],
    extractedEntities: Array.isArray(parsedResult.extractedEntities) ? parsedResult.extractedEntities : [],
    legalRefs: Array.isArray(parsedResult.legalRefs) ? parsedResult.legalRefs : [],
    suggestions: Array.isArray(parsedResult.suggestions) ? parsedResult.suggestions : [],
    documentCategory: VALID_CATEGORIES.includes(parsedResult.documentCategory)
      ? parsedResult.documentCategory : 'Other',
    confidenceScore: typeof parsedResult.confidenceScore === 'number'
      ? Math.min(1, Math.max(0, parsedResult.confidenceScore)) : 0.5,
    analyzedAt: new Date(),
    modelVersion: OPENROUTER_VISION_MODEL,
  };

  console.log(`[OpenRouter] ✅ Analysis complete. Category: ${analysis.documentCategory}, Confidence: ${analysis.confidenceScore}`);
  return analysis;
};

/**
 * Main document analysis function
 * Priority: OpenRouter (free) → Fallback error
 */
const analyzeLegalDocument = async (
  _fileText: string,
  buffer?: Buffer,
  mimeType?: string
): Promise<TAiAnalysis> => {
  console.log(`[AI Service] analyzeLegalDocument called. Buffer: ${buffer?.length || 0} bytes`);

  if (!buffer || !mimeType) {
    return { ...DEFAULT_AI_ANALYSIS, summary: 'No file content provided.' };
  }

  // Use OpenRouter (FREE)
  if (isOpenRouterAvailable()) {
    try {
      return await analyzeWithOpenRouter(buffer, mimeType);
    } catch (error: any) {
      console.error('[AI Service] OpenRouter failed:', error.message);
      return { ...DEFAULT_AI_ANALYSIS, summary: `Analysis failed: ${error.message}` };
    }
  }

  return { ...DEFAULT_AI_ANALYSIS, summary: 'No AI provider available. Configure OPENROUTER_API_KEY.' };
};

/**
 * Chat with AI (Uses OpenRouter via OpenRouterService)
 * Kept for backward compatibility, but delegates to OpenRouter
 */
const chatWithAI = async (
  message: string,
  context: string,
  history: any[] = [],
  options?: { throwOnFailure?: boolean },
): Promise<string> => {
  try {
    const formattedHistory: TChatHistory[] = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));

    const systemContext = `You are an expert AI assistant named Advyon AI.
    ${context ? `CONTEXT:\n${context}` : ''}
    INSTRUCTION: Keep your answers short and precise.`;

    const response = await OpenRouterService.processChat(message, formattedHistory, systemContext);
    return response;
  } catch (error) {
    const reason = (error as Error)?.message || 'AI provider request failed.';
    console.error('OpenRouter chat error:', reason);
    if (options?.throwOnFailure !== false) {
      throw new Error(reason);
    }
    return `AI provider request failed: ${reason}`;
  }
};

// --- Persistent Chat Methods ---

const createChat = async (mongoUserId: string, message: string, context?: any) => {
    // 1. Create new chat doc
    const chat = await AIChatModel.create({
        userId: toObjectId(mongoUserId),
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        messages: [{ role: 'user', content: message, timestamp: new Date() }],
        context
    });

    // 2. Get AI response
    // Construct system prompt with "Keeping answer short and precise"
    const contextString = context ? JSON.stringify(context) : '';
    const systemContext = `You are an expert AI assistant named Advyon AI.
    ${contextString ? `CONTEXT:\n${contextString}` : ''}
    INSTRUCTION: Keep your answers short and precise.`;

    const aiResponse = await OpenRouterService.processChat(message, [], systemContext);

    // 3. Save AI response
    chat.messages.push({ role: 'assistant', content: aiResponse, timestamp: new Date() });
    await chat.save();

    return chat;
};

const continueChat = async (chatId: string, message: string, context?: any) => {
    const chat = await AIChatModel.findById(chatId);
    if (!chat) throw new Error('Chat not found');

    // Update context if provided
    if (context) {
        // dynamic merge or overwrite? For now, let's assume we might want to accumulate or replace.
        // If it's an array of items (which frontend sends), we might want to check for duplicates?
        // Simple approach: Replace context with new context or merge?
        // Let's assume the frontend sends the *active* context for this turn.
        // If we want the AI to know about ALL context ever sent, we should probably merge.
        // But for "Chat with specific context" usually means "Here is the context for this question".
        // However, persistent chat implies context retention.
        // Let's merge: if context has 'items', append them?
        // For Mixed type, let's just save what we get for now, or maybe intelligent merge if it's valid structure.
        // Safer: If context is provided, update the chat's context field.
         chat.context = context; // Replaces previous context with the current relevant context
    }

    // Append user message
    chat.messages.push({ role: 'user', content: message, timestamp: new Date() });
    await chat.save();

    // Prepare history for AI
    const history: TChatHistory[] = chat.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        }));
    
    // Context logic
    const contextString = chat.context ? JSON.stringify(chat.context) : '';
    const systemContext = `You are an expert AI assistant named Advyon AI.
    ${contextString ? `CONTEXT:\n${contextString}` : ''}
    INSTRUCTION: Keep your answers short and precise.`;

    // Exclude the last message (current user message) from history passed to processChat, 
    // because processChat appends the message argument to history.
    const pastHistory = history.slice(0, -1); 

    const aiResponse = await OpenRouterService.processChat(message, pastHistory, systemContext);

    // Append AI message
    chat.messages.push({ role: 'assistant', content: aiResponse, timestamp: new Date() });
    await chat.save();

    return chat;
};

const getUserChats = async (mongoUserId: string) => {
    return AIChatModel.find({ userId: toObjectId(mongoUserId) }).sort({ updatedAt: -1 }).select('title updatedAt createdAt');
};

const getChat = async (chatId: string) => {
    return AIChatModel.findById(chatId);
};

const deleteChat = async (chatId: string) => {
    return AIChatModel.findByIdAndDelete(chatId);
};

export const AIService = {
  analyzeLegalDocument,
  analyzeWithOpenRouter,
  chatWithAI,
  isOpenRouterAvailable,
  createChat,
  continueChat,
  getUserChats,
  getChat,
  deleteChat
};
