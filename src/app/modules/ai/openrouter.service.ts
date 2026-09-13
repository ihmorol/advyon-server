import { OPENROUTER_MODEL, openrouterClient } from '../../config/openrouter.config';
import { TAiAnalysis, TDocumentCategory } from '../document/document.interface';
import { TChatHistory } from './ai.interface';

// Valid document categories
const VALID_CATEGORIES: TDocumentCategory[] = [
  'Affidavit',
  'Evidence',
  'Contract',
  'Court Filing',
  'Correspondence',
  'Legal Brief',
  'Pleading',
  'Discovery',
  'Motion',
  'Order',
  'Judgment',
  'Settlement',
  'Other',
];

// Default/fallback AI analysis result
const DEFAULT_AI_ANALYSIS: TAiAnalysis = {
  summary: 'Unable to analyze document content.',
  rawSummary: 'Unable to analyze document content.',
  extractedEntities: [],
  documentCategory: 'Other',
  confidenceScore: 0,
  analyzedAt: new Date(),
  modelVersion: OPENROUTER_MODEL,
};

const getClientOrThrow = () => {
  if (!openrouterClient) {
    throw new Error('OpenRouter is not configured. Set OPENROUTER_API_KEY.');
  }

  return openrouterClient;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Failed to process chat message';
};

const extractTextContent = (content: unknown): string => {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return '';
  }

  const text = content
    .map((item: any) => {
      if (typeof item === 'string') return item;
      if (item?.type === 'text' && typeof item.text === 'string') return item.text;
      return '';
    })
    .join('')
    .trim();

  return text;
};

/**
 * Analyze a legal document using OpenRouter (OpenAI-compatible)
 * @param fileText - The extracted text content from the document
 * @returns AI analysis results with summary, entities, category, and confidence
 */
const analyzeLegalDocument = async (fileText: string): Promise<TAiAnalysis> => {
  // Handle empty or very short text
  if (!fileText || fileText.trim().length < 10) {
    return {
      ...DEFAULT_AI_ANALYSIS,
      summary: 'Document contains insufficient text for analysis.',
      rawSummary: 'Document contains insufficient text for analysis.',
    };
  }

  // Truncate very long documents to avoid token limits (OpenRouter models vary in detailed limit, but 30k chars is safe for most)
  const truncatedText =
    fileText.length > 30000 ? fileText.substring(0, 30000) + '...' : fileText;

  const prompt = `You are a legal assistant AI. Analyze the following legal document text and extract key information.

IMPORTANT: Return ONLY a valid JSON object with NO additional text, markdown, or explanation. Do not use markdown code blocks.

The JSON must have this exact structure:
{
  "summary": "A concise 2-3 sentence summary of the document's main purpose and content",
  "extractedEntities": ["entity1", "entity2"],
  "documentCategory": "Category",
  "confidenceScore": 0.95
}

Rules:
- "summary": A clear, professional summary (max 500 characters)
- "extractedEntities": Array of important names (people, organizations), dates (in format "Date: YYYY-MM-DD"), locations, case numbers, law references, and monetary amounts found in the document
- "documentCategory": Must be exactly one of: "Affidavit", "Evidence", "Contract", "Court Filing", "Correspondence", "Legal Brief", "Pleading", "Discovery", "Motion", "Order", "Judgment", "Settlement", "Other"
- "confidenceScore": A number between 0 and 1 indicating your confidence in the analysis

DOCUMENT TEXT:
${truncatedText}

JSON RESPONSE:`;

  try {
    const client = getClientOrThrow();

    const completion = await client.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
    });

    const responseText = extractTextContent(completion.choices?.[0]?.message?.content) || '{}';

    // Bulletproof JSON cleaning - remove all markdown formatting
    let cleanedResponse = responseText
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .replace(/^\s*json\s*/i, '') // Remove leading "json" word
      .trim();

    // Try to extract JSON object if there's extra text around it
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedResponse = jsonMatch[0];
    }

    // Parse the JSON response
    const parsedResult = JSON.parse(cleanedResponse);

    // Validate and sanitize the response
    const summaryText = typeof parsedResult.summary === 'string'
          ? parsedResult.summary.substring(0, 1000)
          : DEFAULT_AI_ANALYSIS.summary;

    const analysis: TAiAnalysis = {
      summary: summaryText,
      rawSummary: summaryText,
      extractedEntities: Array.isArray(parsedResult.extractedEntities)
        ? parsedResult.extractedEntities
            .filter((e: unknown) => typeof e === 'string')
            .slice(0, 50)
        : [],
      documentCategory: VALID_CATEGORIES.includes(parsedResult.documentCategory)
        ? parsedResult.documentCategory
        : 'Other',
      confidenceScore:
        typeof parsedResult.confidenceScore === 'number' &&
        parsedResult.confidenceScore >= 0 &&
        parsedResult.confidenceScore <= 1
          ? parsedResult.confidenceScore
          : 0.5,
      analyzedAt: new Date(),
      modelVersion: OPENROUTER_MODEL,
    };

    return analysis;
  } catch (error) {
    // Log the error for debugging
    const reason = getErrorMessage(error);
    console.error('OpenRouter AI analysis error:', reason);

    // Return fallback object instead of throwing
    return {
      ...DEFAULT_AI_ANALYSIS,
      summary: error instanceof SyntaxError
          ? 'Failed to parse AI response. Document may require manual review.'
          : `AI analysis encountered an error: ${reason}`,
      rawSummary: '',
    };
  }
};

/**
 * Process chat message using OpenRouter
 */
const processChat = async (message: string, history: TChatHistory[], context?: string): Promise<string> => {
    try {
        const messages: any[] = [];
        
        // Add system/context message
        if (context) {
            messages.push({
                role: 'system',
                content: context
            });
        } else {
             messages.push({
                role: 'system',
                content: 'You are a helpful legal assistant.'
            });
        }

        // Add history
        history.forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        });

        // Add current message
        messages.push({
            role: 'user',
            content: message
        });

        const client = getClientOrThrow();

        const completion = await client.chat.completions.create({
            model: OPENROUTER_MODEL,
            messages: messages,
            stream: false
        });

        const responseText = extractTextContent(completion.choices?.[0]?.message?.content);
        if (responseText) {
          return responseText;
        }

        return 'No response generated.';

    } catch (error) {
        const reason = getErrorMessage(error);
        console.error('OpenRouter Chat error:', reason);
        throw new Error(reason);
    }
}

export const OpenRouterService = {
  analyzeLegalDocument,
  processChat
};
