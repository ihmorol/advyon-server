import { GoogleGenAI, Type } from '@google/genai';
import config from './index';

/**
 * Gemini AI Configuration
 * Used for multimodal document analysis (PDF, images)
 * Groq remains for chat functionality
 */

const apiKey = config.gemini_api_key || '';

// Initialize only if API Key exists
export const geminiAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Model for document analysis (supports vision/multimodal)
export const GEMINI_MODEL = 'gemini-2.0-flash';
console.log('Gemini Model:', GEMINI_MODEL);

// JSON schema for structured document analysis output
export const DOCUMENT_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'Professional executive summary (2-3 paragraphs)',
    },
    rawSummary: {
      type: Type.STRING,
      description: 'Detailed markdown explanation of document contents',
    },
    keyPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key points extracted from the document',
    },
    extractedEntities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING },
          count: { type: Type.NUMBER },
          mentions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
    legalRefs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          citation: { type: Type.STRING },
          description: { type: Type.STRING },
          relevance: { type: Type.STRING },
        },
      },
    },
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Actionable suggestions for this document',
    },
    documentCategory: {
      type: Type.STRING,
      description: 'Category: Affidavit, Evidence, Contract, Court Filing, Correspondence, Legal Brief, Pleading, Discovery, Motion, Order, Judgment, Settlement, or Other',
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: 'Confidence score between 0 and 1',
    },
  },
  required: ['summary', 'keyPoints', 'documentCategory', 'confidenceScore'],
};

export const isGeminiAvailable = (): boolean => {
  return geminiAI !== null;
};
