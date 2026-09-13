const CONTROL_CHAR_REGEX = /[\u0000-\u001f\u007f]/g;
const DANGEROUS_TAG_REGEX = /<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi;
const INLINE_EVENT_REGEX = /\son[a-z]+\s*=\s*(['"]).*?\1/gi;

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|earlier)\s+instructions?/i,
  /system\s+prompt/i,
  /developer\s+message/i,
  /reveal\s+(your|the)\s+instructions?/i,
  /act\s+as\s+an?\s+unrestricted\s+assistant/i,
];

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

export const sanitizeUserGeneratedText = (input: string): string => {
  if (!input) return '';

  const strippedDangerousTags = input.replace(DANGEROUS_TAG_REGEX, ' ');
  const strippedInlineEvents = strippedDangerousTags.replace(INLINE_EVENT_REGEX, '');
  const strippedControlChars = strippedInlineEvents.replace(CONTROL_CHAR_REGEX, ' ');

  return normalizeWhitespace(strippedControlChars);
};

export const sanitizeTagList = (tags: string[] = []): string[] =>
  tags
    .map(tag => sanitizeUserGeneratedText(tag))
    .filter(Boolean)
    .slice(0, 10);

export const detectPromptInjectionSignals = (input: string): string[] => {
  const sanitized = sanitizeUserGeneratedText(input);

  return PROMPT_INJECTION_PATTERNS
    .filter(pattern => pattern.test(sanitized))
    .map(pattern => pattern.source);
};

