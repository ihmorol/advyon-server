export type TChatHistory = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type TChatRequest = {
  caseId: string;
  message: string;
  history: TChatHistory[];
  documentIds?: string | string[]; // Single ID or array of IDs
};

export type TSuggestedAction = {
  label: string;
  action: string;
  payload: {
    id: string;
  };
};

export type TChatResponse = {
  response: string;
  suggestedActions: TSuggestedAction[];
};

export type TDocumentAnalysisResponse = {
  summary: {
    refined: string;
    raw: string;
  };
  entities: {
    type: 'person' | 'organization' | 'date' | 'amount' | 'location';
    name: string;
    count: number;
  }[];
  keyPoints: {
    id: number | string;
    text: string;
    importance: 'high' | 'medium' | 'low';
  }[];
  legalRefs: {
    citation: string;
    description: string;
    relevance: 'high' | 'medium' | 'low';
  }[];
};
