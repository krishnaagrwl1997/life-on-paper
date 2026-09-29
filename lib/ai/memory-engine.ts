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

export type MemoryEngineAction = "question" | "page" | "weave";
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
  /**
   * The public landing-page demo. It asks for a much smaller result (a title,
   * the edited lines, who was noticed, and a shelf label) with a short prompt,
   * because a visitor watching a demo will not wait for the full editorial
   * pass. The same no-invention guardrails still apply.
   */
  demo?: boolean;
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

export type MemoryWeaveResult = {
  source: "ai";
  language: MemoryEngineLanguage;
  title?: string;
  narrative: string[];
};

export type MemoryEngineResult = MemoryQuestionResult | MemoryPageResult | MemoryWeaveResult;

