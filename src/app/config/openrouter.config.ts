import OpenAI from 'openai';
import config from './index';

/**
 * OpenRouter Configuration
 * Uses OpenAI-compatible API with free vision models
 */

const apiKey = config.openrouter_api_key || '';

export const openrouterClient = apiKey ? new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: apiKey,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:5000',
    'X-Title': 'Advyon Legal Platform',
  },
}) : null;

// Vision model on OpenRouter
export const OPENROUTER_VISION_MODEL = 'google/gemini-2.5-flash-lite';
export const OPENROUTER_MODEL = OPENROUTER_VISION_MODEL;

export const openRouterConfig = {
  apiKey,
  model: OPENROUTER_MODEL,
};

export const isOpenRouterAvailable = (): boolean => {
  return openrouterClient !== null;
};

console.log('OpenRouter configured:', isOpenRouterAvailable() ? 'Yes' : 'No');
