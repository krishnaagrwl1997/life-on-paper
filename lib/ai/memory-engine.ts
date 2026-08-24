export const editorialLayoutIds = [
  "story",
  "quote",
  "illustration",
  "little-things",
  "letter",
  "timeline",
  "travel",
  "people",
  "reflection",
] as const;

export type MemoryEngineAction = "question" | "page";
export type MemoryEngineLanguage = "English" | "Hindi" | "Hinglish" | "Mixed";
export type MemoryEngineLayoutId = (typeof editorialLayoutIds)[number];

export type MemoryEngineRequest = {
  action: MemoryEngineAction;
  memory: string;
  answers: string[];
  emotions: string[];
  questionIndex: number;
  speechLanguage: "auto" | "en-IN" | "hi-IN";
  attachment?: {
    name: string;
    kind: string;
  } | null;
};

export type MemoryQuestionResult = {
  source: "ai";
  language: MemoryEngineLanguage;
  question: string;
  suggestions: string[];
};

export type MemoryPageResult = {
  source: "ai";
  language: MemoryEngineLanguage;
  cleanTranscript: string;
  bookDraft: string;
  title: string;
  reflection: string;
  placement: {
    book: string;
    volume: string;
    chapter: string;
    chapterTitle: string;
    confidence: number;
    reason: string;
    needsConfirmation: boolean;
  };
  layout: {
    id: MemoryEngineLayoutId;
    reason: string;
  };
  signals: {
    people: string[];
    places: string[];
    dates: string[];
    themes: string[];
  };
};

export type MemoryEngineResult = MemoryQuestionResult | MemoryPageResult;

