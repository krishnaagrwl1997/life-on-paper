"use client";

import Image from "next/image";
import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookmarkSimple,
  Books,
  Check,
  FileText,
  ImageSquare,
  Microphone,
  SpeakerHigh,
  Plus,
  Sparkle,
  Stop,
} from "@phosphor-icons/react";
import { useLiveTranscription } from "@/components/system/use-live-transcription";
import type {
  MemoryEngineAction,
  MemoryEngineResult,
  MemoryPageResult,
  MemoryQuestionResult,
} from "@/lib/ai/memory-engine";
import { fallbackQuestion } from "@/lib/ai/editorial-guardrails";

export type CaptureMode = "Write" | "Voice" | "Photo" | "Screenshot" | "File";
type SpeechLanguage = "auto" | "en-IN" | "hi-IN";
type WritingStyle = "almost-unchanged" | "gently-shaped" | "literary";
type ArtworkLevel = "none" | "subtle" | "illustrated";
type PhotoTreatment = "original" | "painterly";

export type KeptPage = {
  id: string;
  cloudId?: string;
  title: string;
  excerpt: string;
  body: string[];
  reflection: string;
  book: string;
  volume: string;
  chapter: string;
  chapterTitle: string;
  layout: string;
  date: string;
  photo?: string;
  originalText?: string;
  speechLanguage?: SpeechLanguage;
  writingLanguage?: "original";
  writingStyle?: WritingStyle;
  artworkLevel?: ArtworkLevel;
  photoTreatment?: PhotoTreatment;
  emotions?: string[];
  writingVersion?: number;
};

type Phase = "capture" | "interview" | "summary" | "placement" | "page";
type PlacementMode = "proposal" | "change" | "create" | "placed";
type PageMode = "assembling" | "ready" | "layouts";
type WritingReviewMode = "original" | "cleaned" | "book";
type EditorialLayoutId = "story" | "quote" | "illustration" | "little-things" | "letter" | "timeline" | "travel" | "people" | "reflection";

type ChapterPlacement = {
  id: string;
  book: string;
  volume: string;
  chapter: string;
  title: string;
  reason: string;
};

const paperEase = [0.22, 0.72, 0.26, 1] as const;

async function requestMemoryEngine(
  action: MemoryEngineAction,
  input: {
    memory: string;
    answers: string[];
    emotions: string[];
    questionIndex: number;
    speechLanguage: SpeechLanguage;
    attachment: { name: string; kind: string } | null;
  },
): Promise<MemoryEngineResult | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 26_000);
  try {
    const response = await fetch("/api/memory-engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...input }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json() as MemoryEngineResult;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

const feelings = [
  { label: "Happy", cue: "light, joyful" },
  { label: "Grateful", cue: "thankful, held" },
  { label: "Proud", cue: "seen, capable" },
  { label: "Peaceful", cue: "calm, settled" },
  { label: "Nostalgic", cue: "warm, longing" },
  { label: "Surprised", cue: "unexpected" },
  { label: "Disappointed", cue: "let down" },
  { label: "Hurt", cue: "tender, upset" },
  { label: "Unsure", cue: "mixed, unclear" },
];

function contextualQuestion(memory: string, answers: string[], selectedFeelings: string[], index: number) {
  return fallbackQuestion(memory, answers, selectedFeelings, index).question;
}

function answerSuggestions(memory: string, selectedFeelings: string[], index: number, answers: string[]) {
  return fallbackQuestion(memory, answers, selectedFeelings, index).suggestions;
}

function cleanSpokenDraft(value: string) {
  const cleaned = value
    .replace(/[ \t]+/g, " ")
    .replace(/\bi\b/g, "I")
    .replace(/([a-z])([A-Z])/g, "$1. $2")
    .replace(/\b(?:um+|uh+|erm+)\b[,.]?\s*/gi, "")
    .replace(/\b(?:you know|I mean)\b[,.]?\s*/gi, "")
    .replace(/\bI was like\s+(?=(?:really\s+)*(?:happy|sad|proud|surprised|shocked|excited|confused)\b)/gi, "I was ")
    .replace(/\bmatlab\s+(?=mujhe\s+laga\b)/gi, ". Mujhe laga ")
    .replace(/\b(?:like|basically|actually)\b[,.]?\s+(?=\bI\b|\bwe\b|\bhe\b|\bshe\b|\bthey\b|\bit\b|\bthis\b|\bthat\b)/gi, "")
    .replace(/\boverwhelmind\b/gi, "overwhelming")
    .replace(/\bdefinately\b/gi, "definitely")
    .replace(/\brecieve(?:d)?\b/gi, (word) => word.toLowerCase().endsWith("d") ? "received" : "receive")
    .replace(/\bso\s+and\b/gi, "and")
    .replace(/\b(and\s+)?then\s+then\b/gi, "then")
    .replace(/\b(\w+)(?:\s+\1\b)+/gi, "$1")
    .replace(/\b((?:\w+\s+){1,4}\w+)(?:\s+\1\b)+/gi, "$1")
    .replace(/\blike\s+(?=(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+years?\s+(?:back|ago))/gi, "")
    .replace(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?\s+back\b/gi, "$1 years ago")
    .replace(/\bfor the first time\s+first day\b/gi, "for the first time. On the first day")
    .replace(/\bbut\s+when\b/gi, "But when")
    .replace(/\bwhat an overwhelming day today,\s*woke up\b/gi, "What an overwhelming day. I woke up")
    .replace(/,\s*(woke up|went|felt|saw|met|realised|realized|noticed)\b/gi, ". I $1")
    .replace(/,\s*have been\b/gi, ". I have been")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/([,.;!?])(?=[A-Za-z])/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const seen = new Set<string>();
  return cleaned
    .split(/(?<=[.!?।])\s+/)
    .filter((sentence) => {
      const key = sentence.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" ");
}

function preserveVoice(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => {
      const cleaned = cleanSpokenDraft(paragraph);
      if (!cleaned) return "";
      const withSentenceBreaks = cleaned
        .replace(/([^.!?]{55,})\s+\bbut\b\s+/gi, "$1. But ")
        .replace(/([^.!?]{70,})\s+\band\s+(?=I|we|he|she|they)\b/gi, "$1. ")
        .replace(/([^.!?]{85,})\s+\bso\b\s+(?=I|we|he|she|they)\b/gi, "$1. ")
        .replace(/\s+\bbut\s+(?=[A-Z]|\bI\b|\bwe\b|\bhe\b|\bshe\b|\bthey\b)/g, ". But ")
        .replace(/\s+\band then\s+(?=[A-Z]|\bI\b|\bwe\b|\bhe\b|\bshe\b|\bthey\b)/g, ". Then ")
        .replace(/,\s*\./g, ".")
        .replace(/\.\s*,/g, ".")
        .replace(/(^|[.!?]\s+)([a-z])/g, (_match, start: string, letter: string) => `${start}${letter.toUpperCase()}`);
      const capitalized = `${withSentenceBreaks.charAt(0).toUpperCase()}${withSentenceBreaks.slice(1)}`;
      return /[.!?…]$/.test(capitalized) ? capitalized : `${capitalized}.`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function shapeVoice(value: string, style: WritingStyle) {
  const original = preserveVoice(value);
  if (!original || style === "almost-unchanged") return original;

  const gentlyCleaned = original
    .replace(/\b(?:basically|actually)\b[,.]?\s*/gi, "")
    .replace(/\blike\b[,.]?\s+(?=\bI\b|\bwe\b|\bhe\b|\bshe\b|\bthey\b|\bit\b|\bthis\b|\bthat\b)/gi, "")
    .replace(/\bI was just remembering today\b/gi, "Today I remembered")
    .replace(/\bI just wanted to\b/gi, "I wanted to")
    .replace(/\bI was feeling\b/gi, "I felt")
    .replace(/\bI am feeling\b/gi, "I feel")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/([,.;!?])(?=[A-Za-z])/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (style === "gently-shaped") return gentlyCleaned;

  return gentlyCleaned
    .replace(/\s+\bbut\b\s+/gi, ". But ")
    .replace(/\s+\band then\b\s+/gi, ". Then ")
    .replace(/\s+\bbecause\b\s+/gi, ". Because ")
    .replace(/\.\s*\./g, ".")
    .replace(/(^|[.!?]\s+)([a-z])/g, (_match, start: string, letter: string) => `${start}${letter.toUpperCase()}`);
}

function detectWritingLanguage(value: string) {
  const devanagariCount = (value.match(/[\u0900-\u097F]/g) ?? []).length;
  const latinWords = value.toLocaleLowerCase().match(/[a-z]+/g) ?? [];
  const romanHindiWords = new Set([
    "aaj", "achha", "accha", "bahut", "bas", "dil", "hai", "hain", "hum", "kabhi", "kaafi",
    "kya", "lekin", "main", "maine", "matlab", "mera", "meri", "mujhe", "nahi", "par", "phir",
    "tha", "thi", "thoda", "toh", "yaad", "yaar",
  ]);
  const romanHindiCount = latinWords.filter((word) => romanHindiWords.has(word)).length;
  if (devanagariCount > 0 && latinWords.length > 2) return { id: "hinglish", label: "Hindi + English" };
  if (devanagariCount > 0) return { id: "hindi", label: "Hindi" };
  if (romanHindiCount >= 2) return { id: "hinglish", label: "Hinglish" };
  return { id: "english", label: "English" };
}

function composeBookDraft(memory: string, answers: string[], style: WritingStyle) {
  const candidates = [memory, ...answers]
    .map((item) => shapeVoice(item, style))
    .map((item) => item.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  return candidates
    .filter((item) => {
      const key = item.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n\n");
}

// Turn a raw memory into a structured narrative the reader can follow:
// an opening scene line, the ordered sequence, and a reflective close. Every
// sentence stays the user's own — this only arranges and lightly edits their
// words, never invents a scene, detail, or lesson.
function structureStoryDraft(memory: string, answers: string[], feelings: string[], languageId: string) {
  const source = [memory, ...answers].filter(Boolean).join("\n\n");
  const context = detectMemoryContext(memory);
  const sentences = source
    .split(/(?<=[.!?।])\s+/)
    .map((item) => shapeVoice(item, "gently-shaped").trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const ordered = sentences.filter((item) => {
    const key = item.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!ordered.length) return { paragraphs: [], scene: "", close: "" };

  const firstSentence = ordered[0];

  // A scene-setting lead, drawn only from the user's own words. Prefer a
  // time/place anchor they supplied; otherwise use their first concrete clause.
  const when = context.when || "";
  const place = context.place && context.place !== "A journey" ? context.place : "";
  const scene = when || place
    ? [when, place ? `in ${place}` : ""].filter(Boolean).join(" ")
    : "";
  // Avoid a bare fragment lead when the user's own first sentence already
  // establishes the same time or place — the scene is already set in their words.
  const firstSentenceStart = firstSentence.toLocaleLowerCase().slice(0, 48);
  const whenLower = when.toLocaleLowerCase();
  const placeLower = place.toLocaleLowerCase();
  const sceneAlreadyStated = Boolean(
    (when && firstSentenceStart.startsWith(whenLower)) ||
    (place && firstSentenceStart.includes(placeLower)) ||
    (when && firstSentenceStart.includes(whenLower)),
  );

  const sequence = ordered.filter((item) => item !== (scene || "__never__"));

  const close = (() => {
    const reflection = reflectionFromMemory(answers, feelings, languageId);
    if (!reflection) return "";
    if (sequence.some((item) => item.toLocaleLowerCase() === reflection.toLocaleLowerCase())) return "";
    return reflection;
  })();

  const paragraphs = [
    ...(scene && !sceneAlreadyStated ? [scene] : []),
    ...sequence,
    ...(close ? [close] : []),
  ];
  return { paragraphs, scene, close };
}

function reflectionFromMemory(answers: string[], selectedFeelings: string[], languageId: string) {
  const answer = [...answers]
    .reverse()
    .map((item) => preserveVoice(item))
    .find((item) => {
      const words = item.split(/\s+/).length;
      return words >= 4
        && words <= 24
        && !/^(something|it changed|it reminded me|what happened|the sound|the light)/i.test(item);
    });
  if (answer) return answer;
  if (!selectedFeelings.length) return "";
  const joined = selectedFeelings.map((feeling) => feeling.toLocaleLowerCase()).join(selectedFeelings.length > 1 ? " and " : "");
  if (languageId === "hindi") return `मुझे ${joined} महसूस हुआ।`;
  if (languageId === "hinglish") return `Mujhe ${joined} feel hua.`;
  return `I felt ${joined}.`;
}

function detectMemoryContext(memory: string) {
  const lower = memory.toLowerCase();
  const year = memory.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? "";
  const month = memory.match(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i)?.[0] ?? "";
  const tripOrder = memory.match(/\b(?:(?:my|our)\s+)?(?:first|second|third|fourth|fifth|last|recent)\s+(?:\w+\s+)?trip\b/i)?.[0] ?? "";
  const relativeTime = memory.match(/\b(?:last year|this year|last summer|this summer|last winter|this winter)\b/i)?.[0] ?? "";
  const yearsAgo = memory.match(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+years?\s+(?:ago|back)\b/i)?.[0]?.replace(/\s+back$/i, " ago") ?? "";
  const landmark = memory.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\s+(?:Park|Beach|Fort|Temple|Lake|Hostel|Station|Airport))\b/)?.[1] ?? "";
  const knownPlace = memory.match(/\b(Bangalore|Bengaluru|Mumbai|Bombay|Delhi|Kolkata|Calcutta|Chennai|Pune|Jaipur|Udaipur|Manali|Kerala|Varanasi|Agra)\b/i)?.[1] ?? "";
  const place = /rishikesh|rishi\s*kej/i.test(memory)
    ? "Rishikesh"
    : /\bgoa\b/i.test(memory)
      ? "Goa"
      : landmark || knownPlace || (memory.match(/\b(?:in|at|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ?? "");
  const isTravel = Boolean(place) || /travel|trip|journey|solo|flight|train|road|beach|mountain|river/.test(lower);
  return {
    isTravel,
    place: place || (isTravel ? "A journey" : ""),
    when: [month, year].filter(Boolean).join(" ") || relativeTime || yearsAgo || tripOrder,
  };
}

function detectPersonName(memory: string) {
  const ignored = new Set([
    "Actually", "After", "And", "Basically", "Before", "But", "English", "Every",
    "First", "Friday", "Goa", "Happy", "He", "Hindi", "Hinglish", "Honestly", "I",
    "India", "It", "Last", "Lately", "Later", "Life", "Maybe", "Monday", "My",
    "Once", "One", "Our", "Paper", "Perhaps", "Recently", "Rishikesh", "Saturday",
    "She", "Some", "Sometimes", "Suddenly", "Sunday", "The", "Then", "They", "This",
    "Thursday", "Today", "Tuesday", "Wednesday", "We", "When", "While", "Yesterday",
  ]);
  const isPossibleName = (value: string | undefined) => Boolean(value && !ignored.has(value));
  const explicitMatch = memory.match(
    /\b(?:my\s+(?:friend|colleague|cousin|sister|brother|mother|father|partner|teacher|mentor)\s+|named\s+|called\s+|met\s+|spoke to\s+|talked to\s+|with\s+)([A-Z][a-z]{1,24})\b/,
  )?.[1];
  if (isPossibleName(explicitMatch)) return explicitMatch ?? "";

  const actingPerson = memory.match(/\b([A-Z][a-z]{1,24})\s+(?:(?:ne|ney)\s+)?(?:said|told|asked|called|helped|came|left|made|gave|shared|wrote|messaged|bola|boli|kaha|poocha|pucha|bataya|likha|bheja)\b/i)?.[1];
  if (isPossibleName(actingPerson)) return actingPerson ?? "";

  const sentenceSubject = memory.match(/(?:^|[.!?]\s+)([A-Z][a-z]{1,24})\s+(?:said|told|asked|called|helped|came|left|made|gave|was|is|had|has)\b/)?.[1];
  if (isPossibleName(sentenceSubject)) return sentenceSubject ?? "";

  const candidates = (memory.match(/\b[A-Z][a-z]{1,24}\b/g) ?? []).filter((word) => isPossibleName(word));
  const repeated = candidates.find((candidate) => candidates.filter((word) => word === candidate).length >= 2);
  return repeated ?? "";
}

const chapterOptions: ChapterPlacement[] = [
  {
    id: "trust",
    book: "Book One",
    volume: "Volume II · Life Lessons",
    chapter: "Chapter Four",
    title: "Things I Learned About Myself",
    reason: "This belongs with moments that changed how you understood yourself.",
  },
  {
    id: "seen",
    book: "Book One",
    volume: "Volume I · People",
    chapter: "Chapter Three",
    title: "People and Conversations",
    reason: "Another person’s words or actions are at the centre of this memory.",
  },
  {
    id: "little-things",
    book: "Book One",
    volume: "Volume III · Everyday Life",
    chapter: "Chapter Six",
    title: "Everyday Moments",
    reason: "This is an ordinary moment that became worth remembering.",
  },
];

const editorialLayouts: Array<{ id: EditorialLayoutId; name: string; note: string }> = [
  { id: "story", name: "Story", note: "A complete scene with a beginning, turn, and close." },
  { id: "quote", name: "Quote", note: "One line strong enough to carry the whole page." },
  { id: "illustration", name: "Illustration", note: "A visual-led page for a memory with an image." },
  { id: "little-things", name: "Little Things", note: "Small details gathered like keepsakes." },
  { id: "letter", name: "Letter", note: "A memory written directly to someone—or yourself." },
  { id: "timeline", name: "Timeline", note: "Several moments arranged in the order they unfolded." },
  { id: "travel", name: "Travel", note: "A place-led story with movement and atmosphere." },
  { id: "people", name: "People", note: "A portrait of someone and what they changed in you." },
  { id: "reflection", name: "Reflection", note: "An inward moment that becomes a lasting lesson." },
];

function recommendPlacement(memory: string): ChapterPlacement {
  const lower = memory.toLowerCase();
  const context = detectMemoryContext(memory);
  const personName = detectPersonName(memory);
  if (context.isTravel) {
    const tripLabel = /\bfirst\b/i.test(context.when)
      ? `My First ${context.place} Trip`
      : context.when
        ? `${context.place} · ${context.when}`
        : `${context.place} Trips`;
    return {
      id: `journey-${context.place.toLowerCase().replace(/\s+/g, "-") || "travel"}`,
      book: "Book One",
      volume: context.when ? `Journeys · ${context.when}` : "Journeys · Date to confirm",
      chapter: context.place ? `${context.place} memories` : "Travel memories",
      title: context.place && context.place !== "A journey" ? tripLabel : "Trips and Journeys",
      reason: context.place
        ? `I matched this to ${context.place}${context.when ? ` and ${context.when}` : ""} from the details you shared.`
        : "I recognized this as a travel memory. Add a place or time only if it helps distinguish this trip.",
    };
  }
  if (/work|office|job|client|manager|team|promotion|project/.test(lower) && /appreciat|compliment|praised|thanked|noticed/.test(lower)) {
    return {
      ...chapterOptions[1],
      id: "work-recognition",
      title: "Work Moments",
      reason: "This is a moment from work that you want to remember clearly.",
    };
  }
  if (personName || /mother|father|friend|partner|teacher|mentor|someone|person|appreciat|compliment|thanked/.test(lower)) {
    return personName
      ? {
          ...chapterOptions[1],
          id: `person-${personName.toLocaleLowerCase()}`,
          title: personName,
          reason: `${personName} is at the centre of this memory, so I’ve kept it with the people who matter in your story.`,
        }
      : chapterOptions[1];
  }
  if (/small|ordinary|tea|coffee|window|morning|evening|tiny|little/.test(lower)) return chapterOptions[2];
  return chapterOptions[0];
}

function recommendLayout(memory: string, hasPhoto: boolean) {
  const lower = memory.toLowerCase();
  const personName = detectPersonName(memory);
  if (/goa|rishikesh|rishi\s*kej|travel|trip|journey|solo|flight|train|road|city|country/.test(lower)) return editorialLayouts.find((layout) => layout.id === "travel") ?? editorialLayouts[8];
  if (hasPhoto) return editorialLayouts.find((layout) => layout.id === "illustration") ?? editorialLayouts[8];
  if (personName || /mother|father|friend|partner|teacher|mentor|someone|person/.test(lower)) return editorialLayouts.find((layout) => layout.id === "people") ?? editorialLayouts[8];
  if (/small|ordinary|tea|coffee|window|morning|evening|tiny|little/.test(lower)) return editorialLayouts.find((layout) => layout.id === "little-things") ?? editorialLayouts[8];
  if (/said|told|words|quote|appreciat|compliment/.test(lower)) return editorialLayouts.find((layout) => layout.id === "quote") ?? editorialLayouts[8];
  return editorialLayouts[8];
}

function titleForLayout(layout: EditorialLayoutId) {
  if (layout === "people") return "Someone I Remember";
  if (layout === "travel") return "The Journey";
  if (layout === "little-things") return "One Small Thing";
  if (layout === "quote") return "Their Exact Words";
  if (layout === "letter") return "A Letter to Myself";
  return "The Day I Remember";
}

function titleForMemory(layout: EditorialLayoutId, memory: string) {
  const context = detectMemoryContext(memory);
  const lower = memory.toLowerCase();
  const personName = detectPersonName(memory);
  if (personName && context.place && context.place !== "A journey") return `${context.place} with ${personName}`;
  if (personName && /appreciat|compliment|prais|thank|noticed|notice|acha|achha|accha/.test(lower) && /work|office|job|client|manager|team|project|kaam/.test(lower)) return `What ${personName} Noticed in My Work`;
  if (personName && /conversation|said|told|spoke|talk|message|called/.test(lower)) return `What ${personName} Said`;
  if (personName && /help|support|there for me|stood by/.test(lower)) return `The Day ${personName} Was There`;
  if (personName && /miss|remember|thinking about|thought of/.test(lower)) return `Remembering ${personName}`;
  if (personName) return personName;
  if (context.place && context.place !== "A journey") {
    if (/\b(?:home|ghar)\b/.test(lower) && /\b(?:felt|feel|laga|jaisa)\b/.test(lower)) return `When ${context.place} Felt Like Home`;
    if (/\b(?:rain|baarish)\b/.test(lower)) return `After the Rain in ${context.place}`;
    if (/without (?:a |any )?plan|no plans|unplanned/.test(lower)) return `${context.place} Without a Plan`;
    if (/\bfree|freedom|independent|on my own\b/.test(lower)) return `Feeling Free in ${context.place}`;
    if (/\bfirst\b/.test(lower) && /\bday\b/.test(lower)) return `My First Day in ${context.place}`;
    if (/\bhostel\b/.test(lower)) return `The Hostel in ${context.place}`;
    if (/\bbeach\b|\bsea\b|\bocean\b/.test(lower)) return `A Day by the Sea in ${context.place}`;
    if (/\bmorning\b/.test(lower)) return `A Morning in ${context.place}`;
    if (/\bnight\b|\bevening\b/.test(lower)) return `A Night in ${context.place}`;
    return `${context.place}, ${context.when || "As I Remember It"}`;
  }
  if (/overwhelm|anxious|overthinking/.test(lower)) return "A Day My Mind Would Not Rest";
  if (/keeping (?:the )?(?:small )?promises to (?:myself|yourself)|promises? (?:i|you) (?:make|made|keep|kept) to (?:myself|yourself)/.test(lower)) return "The Promises I Keep to Myself";
  if (/spend(?:ing)? time alone|being alone|on my own/.test(lower) && /capable|confidence|trust|discover|learn|realiz/.test(lower)) return "Learning to Rely on Myself";
  if (/confidence/.test(lower) && /myself|yourself|own/.test(lower)) return "Where My Confidence Comes From";
  if (/lost trust|trust again|learning to trust/.test(lower)) return "Learning to Trust Again";
  if (/appreciat|compliment|praised|thanked|noticed/.test(lower) && /work|office|job|client|manager|team|project/.test(lower)) return "The Day My Work Was Noticed";
  if (/small|little/.test(lower) && /appreciat|compliment|praised|thanked|noticed/.test(lower)) return "The Small Thing They Noticed";
  if (/appreciat|compliment|praised|thanked/.test(lower)) return "The Words I Remember";
  if (/conversation|said|told|spoke|talk/.test(lower)) return "The Conversation";
  if (/learn|realiz|understood|noticed/.test(lower)) return "The Moment I Understood";
  if (/\bcoffee\b/.test(lower)) return "Coffee and a Conversation";
  if (/\btea\b/.test(lower)) return "Tea and a Conversation";
  if (/small|ordinary|window|morning|evening|tiny|little/.test(lower)) return "An Ordinary Day I Remember";
  const words = memory
    .replace(/[^\p{L}\p{N}'\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !/^(?:about|after|again|also|because|been|before|being|from|have|just|lately|like|really|something|that|there|these|they|this|today|very|with)$/i.test(word))
    .slice(0, 5);
  return words.length >= 2 ? words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") : titleForLayout(layout);
}

function hasBrokenGeneratedSubject(value: string) {
  return /^(?:Actually|After|Basically|Before|Every|First|Honestly|Last|Lately|Later|Maybe|Once|Perhaps|Recently|Sometimes|Suddenly|Then|Today|When|While|Yesterday)$/i.test(value.trim());
}

function isBadGeneratedTitle(value: string, memory = "") {
  const title = value.trim();
  if (!title) return true;
  if (/^(?:Reflections? on|Thoughts? on|A Memory|My Memory|The Day I Remember|Something I Learned)/i.test(title)) return true;
  const daySubject = title.match(/^The Day ([A-Za-z]+) Was There$/i)?.[1];
  if (daySubject && hasBrokenGeneratedSubject(daySubject)) return true;
  if (!memory) return false;
  const context = detectMemoryContext(memory);
  const personName = detectPersonName(memory);
  const lowerTitle = title.toLocaleLowerCase();
  const lowerMemory = memory.toLocaleLowerCase();
  if (personName && !lowerTitle.includes(personName.toLocaleLowerCase())) return true;
  if (context.place && lowerTitle === context.place.toLocaleLowerCase() && /rain|baarish|home|ghar|first|hostel|beach|sea|ocean|morning|night|evening|free|freedom|alone/.test(lowerMemory)) return true;
  if (personName && lowerTitle === personName.toLocaleLowerCase() && /conversation|said|told|spoke|talk|message|called/.test(lowerMemory)) return true;
  return false;
}

export function refineKeptPageWriting(page: KeptPage): KeptPage {
  if (page.writingVersion === 6) return page;

  const source = page.originalText?.trim() || page.body.join(" ");
  const layout = page.layout.toLowerCase().replace(/\s+/g, "-") as EditorialLayoutId;
  const placement = recommendPlacement(source);
  const oldGeneratedTitles = new Set([
    "The People Who Saw Me",
    "What I Carried Home",
    "Three Small Things I Kept",
    "The Words That Stayed",
    "A Note to the Person I Was",
    "The Kind of Person I Was Becoming",
    "The Goa I Carried Home",
    "What Their Words Let Me See",
    "The Sentence I Carried Away",
    "A Small Lesson, Kept",
    "The Ordinary Thing That Stayed",
    "What Happened That Day",
    "A Day Away",
    "A Small Moment",
    "What Was Said",
    "Someone I Remember",
    "The Journey",
    "One Small Thing",
    "Their Exact Words",
    "A Letter to Myself",
    "The Day I Remember",
    "The Conversation",
    "The Moment I Understood",
  ]);
  const oldGeneratedChapters = new Set([
    "Becoming Someone I Trust",
    "The People Who Saw Me",
    "Small Things I Carry Forward",
    "Places I Carried Home",
    "People and Conversations",
    "Things I Learned About Myself",
  ]);
  const shouldRefreshChapter = oldGeneratedChapters.has(page.chapterTitle);
  const shouldReplaceTitle = oldGeneratedTitles.has(page.title) || isBadGeneratedTitle(page.title, source);
  const shouldReplaceChapter = shouldRefreshChapter || hasBrokenGeneratedSubject(page.chapterTitle);
  const cleanedReflection = preserveVoice(page.reflection);
  const normalizedReflection = cleanedReflection.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const seenParagraphs = new Set<string>();
  const cleanedBody = page.body
    .map((paragraph) => preserveVoice(paragraph))
    .filter((paragraph) => {
      const key = paragraph.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      if (!key || key === normalizedReflection || seenParagraphs.has(key)) return false;
      seenParagraphs.add(key);
      return true;
    });

  return {
    ...page,
    title: shouldReplaceTitle ? titleForMemory(layout, source) : page.title,
    excerpt: preserveVoice(page.excerpt),
    body: cleanedBody.length ? cleanedBody : [preserveVoice(source)].filter(Boolean),
    reflection: cleanedReflection,
    volume: shouldReplaceChapter ? placement.volume : page.volume,
    chapterTitle: shouldReplaceChapter ? placement.title : page.chapterTitle,
    writingVersion: 6,
  };
}

export function MemoryInterview({
  initialMemory = "",
  initialMode = "Write",
  starterPrompt = "",
  onBack,
  onPageKept,
  onOpenLibrary,
}: {
  initialMemory?: string;
  initialMode?: CaptureMode;
  starterPrompt?: string;
  onBack: () => void;
  onPageKept?: (page: KeptPage) => void;
  onOpenLibrary?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(initialMemory.trim() ? "interview" : "capture");
  const [mode, setMode] = useState<CaptureMode>(initialMode);
  const [memory, setMemory] = useState(initialMemory);
  const [speechLanguage, setSpeechLanguage] = useState<SpeechLanguage>("auto");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answerHint, setAnswerHint] = useState("");
  const [customAnswerOpen, setCustomAnswerOpen] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<{ name: string; preview?: string; kind: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [placementMode, setPlacementMode] = useState<PlacementMode>("proposal");
  const [placement, setPlacement] = useState<ChapterPlacement>(chapterOptions[0]);
  const [tripContext, setTripContext] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [pageMode, setPageMode] = useState<PageMode>("assembling");
  const [selectedLayout, setSelectedLayout] = useState(editorialLayouts[8]);
  const [pageTitle, setPageTitle] = useState(titleForLayout("reflection"));
  const [aiQuestion, setAiQuestion] = useState<MemoryQuestionResult | null>(null);
  const [aiPage, setAiPage] = useState<MemoryPageResult | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "ready" | "fallback">("idle");
  const [writingStyle, setWritingStyle] = useState<WritingStyle>("almost-unchanged");
  const [writingReviewMode, setWritingReviewMode] = useState<WritingReviewMode>("book");
  const [editedBookDraft, setEditedBookDraft] = useState("");
  const [artworkLevel, setArtworkLevel] = useState<ArtworkLevel>("subtle");
  const [photoTreatment, setPhotoTreatment] = useState<PhotoTreatment>("painterly");
  const [pageSaved, setPageSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const initialQuestionRequestedRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const now = new Date();
  const memoryDate = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(now);
  const memoryFolio = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(now).replaceAll("/", " · ");

  useEffect(() => {
    return () => {
      if (attachment?.preview?.startsWith("blob:")) URL.revokeObjectURL(attachment.preview);
    };
  }, [attachment]);

  useEffect(() => {
    if (phase !== "page" || pageMode !== "assembling") return;
    const timer = window.setTimeout(() => {
      setPageMode("ready");
      window.scrollTo({ top: 0, behavior: "auto" });
    }, reduceMotion ? 150 : 1450);
    return () => window.clearTimeout(timer);
  }, [pageMode, phase, reduceMotion]);

  // Reset scroll to the top on every major phase transition. Opening the
  // next screen mid-scroll makes the header feel cropped and untrustworthy.
  const previousPhase = useRef<Phase>(phase);
  useEffect(() => {
    const previous = previousPhase.current;
    if (previous !== phase) {
      // Use "auto" so the scroll reset is immediate rather than animating
      // underneath the new phase and leaving the header visually cropped.
      window.scrollTo({ top: 0, behavior: "auto" });
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    }
    previousPhase.current = phase;
  }, [phase]);

  const chooseFile = (nextMode?: CaptureMode) => {
    if (nextMode) setMode(nextMode);
    window.setTimeout(() => fileRef.current?.click(), 0);
  };

  const acceptForMode = mode === "Photo"
    ? "image/*"
    : mode === "Screenshot"
      ? "image/png,image/jpeg,image/webp"
      : ".pdf,.doc,.docx,.txt,.rtf,image/*,audio/*";

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (attachment?.preview?.startsWith("blob:")) URL.revokeObjectURL(attachment.preview);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setAttachment({ name: file.name, preview: typeof reader.result === "string" ? reader.result : undefined, kind: file.type });
      });
      reader.readAsDataURL(file);
    } else {
      setAttachment({ name: file.name, kind: file.type || "Document" });
    }
    if (!memory.trim()) setMemory(`${mode} shared: ${file.name}`);
  };

  const canContinue = memory.trim().length > 0 || Boolean(attachment);

  const loadAiQuestion = useCallback(async (nextAnswers: string[], nextQuestionIndex: number) => {
    setAiQuestion(null);
    setAiStatus("thinking");
    const result = await requestMemoryEngine("question", {
      memory: memory || attachment?.name || "",
      answers: nextAnswers,
      emotions: selectedFeelings,
      questionIndex: nextQuestionIndex,
      speechLanguage,
      attachment: attachment ? { name: attachment.name, kind: attachment.kind } : null,
    });
    if (result && "question" in result) {
      setAiQuestion(result);
      setAiStatus("ready");
      return;
    }
    setAiStatus("fallback");
  }, [attachment, memory, selectedFeelings, speechLanguage]);

  useEffect(() => {
    if (phase !== "interview" || !initialMemory.trim() || initialQuestionRequestedRef.current) return;
    initialQuestionRequestedRef.current = true;
    void loadAiQuestion([], 0);
  }, [initialMemory, loadAiQuestion, phase]);

  const applyAiPage = (result: MemoryPageResult) => {
    const nextLayout = editorialLayouts.find((layout) => layout.id === result.layout.id) ?? editorialLayouts[8];
    const source = `${memory} ${result.cleanTranscript} ${tripContext}`.trim();
    const fallbackPlacement = recommendPlacement(source);
    const badChapterTitle = hasBrokenGeneratedSubject(result.placement.chapterTitle);
    setAiPage(result);
    setEditedBookDraft(result.bookDraft);
    setPlacement({
      id: badChapterTitle ? fallbackPlacement.id : `ai-${result.placement.chapterTitle.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      book: badChapterTitle ? fallbackPlacement.book : result.placement.book,
      volume: badChapterTitle ? fallbackPlacement.volume : result.placement.volume,
      chapter: badChapterTitle ? fallbackPlacement.chapter : result.placement.chapter,
      title: badChapterTitle ? fallbackPlacement.title : result.placement.chapterTitle,
      reason: badChapterTitle ? fallbackPlacement.reason : result.placement.reason,
    });
    setSelectedLayout(nextLayout);
    setPageTitle(isBadGeneratedTitle(result.title, source) ? titleForMemory(nextLayout.id, source) : result.title);
  };

  const startInterview = () => {
    if (!canContinue) {
      setNotice(mode === "Write" ? "Begin with one detail. A sentence is enough." : `Add a ${mode.toLowerCase()} before continuing.`);
      return;
    }
    setNotice(null);
    setPhase("interview");
    void loadAiQuestion([], 0);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const keepAnswer = () => {
    const nextAnswers = answer.trim() ? [...answers, answer.trim()] : answers;
    const placementSource = `${memory} ${nextAnswers.join(" ")} ${tripContext}`.trim() || attachment?.name || "";
    const nextPlacement = recommendPlacement(placementSource);
    const recommended = recommendLayout(memory || attachment?.name || "", Boolean(attachment?.preview));
    setAnswers(nextAnswers);
    setAnswer("");
    setAnswerHint("");
    setNotice(null);
    setPlacement(nextPlacement);
    setPlacementMode("proposal");
    setSelectedLayout(recommended);
    setPageTitle(titleForMemory(recommended.id, placementSource));
    setPageSaved(false);
    setPageMode("assembling");
    setPhase("page");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    setAiStatus("thinking");
    void requestMemoryEngine("page", {
      memory: memory || attachment?.name || "",
      answers: nextAnswers,
      emotions: selectedFeelings,
      questionIndex,
      speechLanguage,
      attachment: attachment ? { name: attachment.name, kind: attachment.kind } : null,
    }).then((result) => {
      if (result && "bookDraft" in result) {
        applyAiPage(result);
        setAiStatus("ready");
      } else {
        setAiStatus("fallback");
      }
    });
  };

  const askAnotherQuestion = () => {
    const nextAnswers = answer.trim() ? [...answers, answer.trim()] : answers;
    const nextQuestionIndex = Math.min(questionIndex + 1, 2);
    setAnswers(nextAnswers);
    setAnswer("");
    setAnswerHint("");
    setCustomAnswerOpen(false);
    setQuestionIndex(nextQuestionIndex);
    void loadAiQuestion(nextAnswers, nextQuestionIndex);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const editInterview = () => {
    setSaved(false);
    setPhase("interview");
    setQuestionIndex(0);
    setAnswer("");
    setAnswerHint("");
    void loadAiQuestion([], 0);
  };

  // Reset back to a fresh capture sheet after saving, so the completed draft
  // is never silently kept as a future duplicate.
  const startNewMemory = () => {
    setMemory("");
    setAnswers([]);
    setAnswer("");
    setAnswerHint("");
    setSelectedFeelings([]);
    setAttachment(null);
    setSaved(false);
    setPageSaved(false);
    setQuestionIndex(0);
    setAiQuestion(null);
    setAiPage(null);
    setAiStatus("idle");
    setEditedBookDraft("");
    setPlacementMode("proposal");
    setPhase("capture");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const openPlacement = () => {
    setPlacementMode("proposal");
    setPhase("placement");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const choosePlacement = (choice: ChapterPlacement) => {
    setPlacement(choice);
    setPlacementMode("proposal");
    setNotice(null);
  };

  const createChapter = () => {
    const title = newChapterTitle.trim();
    if (!title) {
      setNotice("Give the new chapter a title first.");
      return;
    }
    setPlacement({
      id: `new-${title}`,
      book: "Book One",
      volume: "Volume II · Life Lessons",
      chapter: "New chapter",
      title,
      reason: "You created this chapter because this memory begins a thread that deserves its own place.",
    });
    setPlacementMode("proposal");
    setNotice(null);
  };

  const designPage = () => {
    const recommended = recommendLayout(memory || attachment?.name || "", Boolean(attachment?.preview));
    const fullMemory = `${memory} ${answers.join(" ")} ${tripContext}`.trim();
    setSelectedLayout(recommended);
    setPageTitle(titleForMemory(recommended.id, fullMemory));
    setPageSaved(false);
    setPageMode("assembling");
    setPhase("page");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const chooseLayout = (layout: (typeof editorialLayouts)[number]) => {
    const fullMemory = `${memory} ${answers.join(" ")} ${tripContext}`.trim();
    setSelectedLayout(layout);
    setPageTitle(titleForMemory(layout.id, fullMemory));
    setPageSaved(false);
    setPageMode("ready");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const keepPage = () => {
    if (pageSaved) return;
    setPageSaved(true);
    onPageKept?.({
      id: `kept-${selectedLayout.id}-${memory.trim().slice(0, 24).toLowerCase().replace(/[^a-z0-9]+/g, "-") || "memory"}`,
      title: pageTitle.trim() || titleForLayout(selectedLayout.id),
      excerpt: pageReflection || pageSource,
      body: pageBodyParagraphs,
      reflection: pageReflection,
      book: placement.book,
      volume: placement.volume,
      chapter: placement.chapter,
      chapterTitle: placement.title,
      layout: selectedLayout.name,
      date: storyDate,
      photo: attachment?.preview,
      originalText: memory,
      speechLanguage,
      writingLanguage: "original",
      writingStyle,
      artworkLevel,
      photoTreatment,
      emotions: selectedFeelings,
      writingVersion: 6,
    });
  };

  const originalTranscript = [memory, ...answers].filter(Boolean).join("\n\n");
  const writingLanguage = detectWritingLanguage(originalTranscript);
  const cleanedTranscript = aiPage?.cleanTranscript
    || [memory, ...answers].map((item) => shapeVoice(item, "almost-unchanged")).filter(Boolean).join("\n\n");
  // When the AI editor is unavailable, arrange the user's own words into a
  // structured narrative (scene lead, ordered sequence, reflective close)
  // rather than a bare chunk of cleaned speech.
  const structured = structureStoryDraft(memory, answers, selectedFeelings, writingLanguage.id);
  const structuredDraft = structured.paragraphs.join("\n\n");
  const generatedBookDraft = aiPage?.bookDraft || structuredDraft || composeBookDraft(memory, answers, writingStyle);
  const activeBookDraft = editedBookDraft || generatedBookDraft || attachment?.name || "A small moment I wanted to remember.";
  const pageParagraphs = activeBookDraft.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  const pageReflection = aiPage?.reflection || structured.close || reflectionFromMemory(answers, selectedFeelings, writingLanguage.id);
  const normalizedReflection = pageReflection.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const pageBodyParagraphs = pageParagraphs.filter((paragraph) => {
    const normalized = paragraph.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    return !normalizedReflection || normalized !== normalizedReflection;
  });
  const pageSource = pageBodyParagraphs[0] || pageParagraphs[0] || "A small moment I wanted to remember.";
  const pageDetails = pageBodyParagraphs.slice(1);
  const pageScene = pageDetails.join("\n\n");
  const pageInsight = pageReflection;
  const currentQuestion = aiQuestion?.question
    || contextualQuestion(memory || attachment?.name || "", answers, selectedFeelings, questionIndex);
  const suggestedAnswers = aiQuestion?.suggestions
    || answerSuggestions(memory || attachment?.name || "", selectedFeelings, questionIndex, answers);
  const memoryContext = detectMemoryContext(`${memory} ${answers.join(" ")} ${tripContext}`.trim());
  const storyDate = memoryContext.when || memoryDate;

  const toggleFeeling = (feeling: string) => {
    setSelectedFeelings((current) => current.includes(feeling) ? current.filter((item) => item !== feeling) : [...current, feeling]);
  };

  const updateTripContext = (value: string) => {
    setTripContext(value);
    setPlacement(recommendPlacement(`${memory} ${value}`.trim()));
  };

  return (
    <div className="memory-desk">
      <header className="memory-header">
        <button type="button" className="memory-back" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          Home
        </button>
        <div className="memory-brand">
          <p>Life on Paper</p>
          <span>New memory</span>
        </div>
        <span className="memory-folio">{memoryFolio}</span>
      </header>

      <ConversationProgress phase={phase} />

      <AnimatePresence mode="wait">
        {phase === "capture" ? (
          <motion.section
            key="capture"
            className="memory-phase capture-phase"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
            aria-labelledby="capture-title"
          >
            <div className="memory-phase-intro">
              <p className="memory-eyebrow">I&apos;m here</p>
              <h1 id="capture-title">What&apos;s on your mind, buddy?</h1>
              <p>Tell me as you&apos;d tell a friend. Type it, say it, or add a photo—I&apos;ll keep the meaning and help shape the page.</p>
              {starterPrompt ? <aside className="memory-starter-prompt"><span>Need somewhere to begin?</span><strong>{starterPrompt}</strong></aside> : null}
            </div>

            <div className="capture-workspace capture-workspace--composer">
              <div className="capture-sheet capture-sheet--composer">
                <CaptureSurface
                  mode={mode}
                  memory={memory}
                  setMemory={setMemory}
                  attachment={attachment}
                  chooseFile={chooseFile}
                  onContinue={startInterview}
                  starterPrompt={starterPrompt}
                  speechLanguage={speechLanguage}
                  setSpeechLanguage={setSpeechLanguage}
                />

                <input ref={fileRef} className="sr-only" type="file" accept={acceptForMode} onChange={handleFile} />
              </div>
            </div>
          </motion.section>
        ) : null}

        {phase === "interview" ? (
          <motion.section
            key={`interview-${questionIndex}`}
            className="memory-phase interview-phase interview-phase--chat"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18, rotate: reduceMotion ? 0 : -0.25 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
            aria-labelledby="interview-question"
          >
            <article className="interview-page interview-page--chat">
              <div className="question-count">
                <span>Let&apos;s stay with this</span>
                <span>
                  {aiStatus === "thinking" ? "Reading what you shared…" : `${questionIndex + 1} of up to 3 · optional`}
                </span>
              </div>
              <div className="conversation-prompt">
                <div className="conversation-avatar"><Sparkle size={18} weight="fill" aria-hidden="true" /></div>
                <div>
                  <span>I&apos;m listening</span>
                  <h1 id="interview-question" aria-busy={aiStatus === "thinking"}>
                    {aiStatus === "thinking" ? <span className="question-assembling">Finding the detail worth staying with<span aria-hidden="true">…</span></span> : currentQuestion}
                  </h1>
                </div>
              </div>

              <details className="conversation-context">
                <summary>Want to see what I heard?</summary>
                <blockquote>{memory || attachment?.name}</blockquote>
                {attachment?.preview ? (
                  <div className="interview-thumb"><Image src={attachment.preview} alt="Attached memory preview" fill unoptimized sizes="160px" /></div>
                ) : null}
              </details>

              <div className="answer-suggestions" aria-label="Choose a detail to explore" aria-busy={aiStatus === "thinking"}>
                {aiStatus !== "thinking" ? suggestedAnswers.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    aria-pressed={customAnswerOpen && answerHint === suggestion}
                    onClick={() => {
                      setAnswer("");
                      setAnswerHint(suggestion);
                      setCustomAnswerOpen(true);
                    }}
                  >
                    <span>{suggestion}</span><ArrowRight size={15} aria-hidden="true" />
                  </button>
                )) : <div className="question-options-assembling" aria-hidden="true"><i /><i /><i /></div>}
                <button
                  type="button"
                  className={customAnswerOpen && !answerHint ? "is-selected" : ""}
                  aria-expanded={customAnswerOpen}
                  onClick={() => {
                    setAnswer("");
                    setAnswerHint("");
                    setCustomAnswerOpen(true);
                  }}
                >
                  <span>Tell me in my own words</span><Plus size={15} aria-hidden="true" />
                </button>
              </div>
              {customAnswerOpen ? (
                <>
                  <div className="optional-detail-heading"><strong>Your answer</strong><span>Optional</span></div>
                  <MemoryComposer
                    id="interview-answer"
                    value={answer}
                    onChange={setAnswer}
                    onSubmit={keepAnswer}
                    onAddAttachment={() => chooseFile("Photo")}
                    onError={setNotice}
                    placeholder={answerHint || "Write or speak your answer…"}
                    submitLabel="Next"
                    compact
                    allowEmpty
                    spokenPrompt={currentQuestion}
                  />
                </>
              ) : null}
              <input ref={fileRef} className="sr-only" type="file" accept={acceptForMode} onChange={handleFile} />

              <fieldset className="feeling-picker feeling-picker--multi feeling-picker--focused">
                <legend>And how did that make you feel? <span>Pick one, a few, or leave it for now</span></legend>
                <div>{feelings.map((feeling) => {
                  const selected = selectedFeelings.includes(feeling.label);
                  return (
                    <button key={feeling.label} type="button" aria-pressed={selected} onClick={() => toggleFeeling(feeling.label)}>
                      <i aria-hidden="true">{selected ? <Check size={12} weight="bold" /> : null}</i>
                      <span><strong>{feeling.label}</strong><small>{feeling.cue}</small></span>
                    </button>
                  );
                })}</div>
                {selectedFeelings.length ? <small>{selectedFeelings.length} selected · tap again to remove</small> : <small>Feelings can be mixed. This is optional.</small>}
              </fieldset>

              <div className="conversation-next-dock">
                {questionIndex < 2 ? (
                  <button type="button" className="conversation-more" onClick={askAnotherQuestion}>
                    Ask me one more
                  </button>
                ) : null}
                <button type="button" className="conversation-next" onClick={keepAnswer}>
                  Turn this into a page <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </button>
              </div>
            </article>
          </motion.section>
        ) : null}

        {phase === "summary" ? (
          <motion.section
            key="summary"
            className="memory-phase summary-phase"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
            aria-labelledby="summary-title"
          >
            <div className="summary-heading">
              <p className="memory-eyebrow">The conversation, gathered</p>
              <h1 id="summary-title">Here&apos;s what I heard.</h1>
              <p>Your meaning stays yours. We remove speech fillers, repeated words, and obvious grammar mistakes so it reads clearly.</p>
            </div>

            <article className="summary-manuscript">
              <header>
                <span>Memory · {memoryDate}</span>
                <span>{answers.length} follow-up{answers.length === 1 ? "" : "s"}</span>
              </header>
              <p className="summary-opening">{preserveVoice(memory) || attachment?.name}</p>
              {selectedFeelings.length ? <p className="summary-feeling"><span>Feelings</span>{selectedFeelings.join(" · ")}</p> : null}
              {answers.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}
              <div className="summary-rule"><span>End of conversation</span></div>
            </article>

            <aside className={saved ? "placement-note placement-note--saved" : "placement-note"}>
              {saved ? <Check size={21} weight="bold" aria-hidden="true" /> : <FileText size={21} aria-hidden="true" />}
              <div>
                <strong>{saved ? "Memory kept" : "Nothing has been placed yet"}</strong>
                <p>{saved ? "It is ready for chapter placement." : "Review the memory, then choose where it belongs."}</p>
              </div>
            </aside>

            <div className="summary-actions">
              <button type="button" className="quiet-action" onClick={editInterview}>Return to conversation</button>
              <button type="button" className="interview-primary" onClick={saved ? openPlacement : () => setSaved(true)}>
                {saved ? "Find its chapter" : "Keep this memory"}
                {saved ? <Books size={18} weight="bold" aria-hidden="true" /> : <ArrowRight size={18} weight="bold" aria-hidden="true" />}
              </button>
            </div>
          </motion.section>
        ) : null}

        {phase === "placement" ? (
          <motion.section
            key={`placement-${placementMode}`}
            className="memory-phase placement-phase"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
            aria-labelledby="placement-title"
          >
            {placementMode === "placed" ? (
              <div className="placement-confirmation">
                <div className="placement-seal"><BookmarkSimple size={25} weight="fill" aria-hidden="true" /></div>
                <p className="memory-eyebrow">Placed with care</p>
                <h1 id="placement-title">Your memory has found its chapter.</h1>
                <div className="placed-path">
                  <span>{placement.book}</span>
                  <span>{placement.volume}</span>
                  <span>{placement.chapter}</span>
                  <strong>{placement.title}</strong>
                </div>
                <p className="placement-stop-note">The memory is placed. It is ready to become a page in your book.</p>
                <div className="placed-actions">
                  <button type="button" className="quiet-action" onClick={() => setPlacementMode("proposal")}>Reconsider placement</button>
                  <button type="button" className="interview-primary" onClick={designPage}>Create the page <ArrowRight size={18} weight="bold" aria-hidden="true" /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="placement-heading placement-heading--simple">
                  <p className="memory-eyebrow">Organized for you</p>
                  <h1 id="placement-title">We found a home for this memory.</h1>
                  <p>I used the people, place, and time in your words. Confirm it, or change it if something feels wrong.</p>
                </div>

                <div className="placement-memory-preview">
                  <span>Your words</span>
                  <p>{preserveVoice(memory || attachment?.name || "")}</p>
                  <button type="button" className="quiet-action" onClick={editInterview}>Edit memory</button>
                </div>

                <article className="chapter-proposal chapter-proposal--simple">
                  <div className="chapter-proposal-mark"><BookmarkSimple size={22} weight="fill" aria-hidden="true" /></div>
                  <span>Suggested chapter</span>
                  <h2>{placement.title}</h2>
                  <p>{placement.reason}</p>
                  <dl className="placement-signals">
                    {memoryContext.place ? <div><dt>Place</dt><dd>{memoryContext.place}</dd></div> : null}
                    <div><dt>When</dt><dd>{memoryContext.when || "Not mentioned yet"}</dd></div>
                    <div><dt>Section</dt><dd>{placement.chapter}</dd></div>
                  </dl>
                </article>

                {memoryContext.isTravel && !memoryContext.when && placementMode === "proposal" ? (
                  <label className="trip-context-question" htmlFor="trip-context">
                    <strong>Which {memoryContext.place !== "A journey" ? memoryContext.place : ""} trip was this?</strong>
                    <span>This helps keep multiple trips in the right order. You can leave it blank.</span>
                    <input id="trip-context" value={tripContext} onChange={(event) => updateTripContext(event.target.value)} placeholder="For example: November 2023 or my second Goa trip" />
                  </label>
                ) : null}

                {placementMode === "change" ? (
                  <section className="chapter-picker" aria-labelledby="change-chapter-title">
                    <div className="chapter-picker-heading">
                      <div><p className="memory-eyebrow">Other possible homes</p><h2 id="change-chapter-title">Choose the thread that feels truest.</h2></div>
                      <button type="button" className="quiet-action" onClick={() => setPlacementMode("proposal")}>Cancel</button>
                    </div>
                    <div className="chapter-options">
                      {chapterOptions.map((option) => (
                        <button key={option.id} type="button" className={placement.id === option.id ? "chapter-option chapter-option--selected" : "chapter-option"} onClick={() => choosePlacement(option)}>
                          <span>{option.volume}</span>
                          <strong>{option.title}</strong>
                          <small>{option.reason}</small>
                          {placement.id === option.id ? <Check size={18} weight="bold" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
                        </button>
                      ))}
                      <button type="button" className="chapter-option chapter-option--new" onClick={() => setPlacementMode("create")}>
                        <Plus size={20} aria-hidden="true" />
                        <strong>Create a new chapter</strong>
                        <small>Start a new section in Volume II · Life Lessons.</small>
                        <ArrowRight size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </section>
                ) : null}

                {placementMode === "create" ? (
                  <section className="new-chapter-sheet" aria-labelledby="new-chapter-title">
                    <div>
                      <p className="memory-eyebrow">A new thread</p>
                      <h2 id="new-chapter-title">Name the chapter this memory begins.</h2>
                      <p>It will live in Book One · Volume II, Life Lessons. You can reorganize the larger book later.</p>
                    </div>
                    <div className="new-chapter-entry">
                      <label htmlFor="chapter-name">Chapter title</label>
                      <input id="chapter-name" value={newChapterTitle} onChange={(event) => setNewChapterTitle(event.target.value)} placeholder="The Things Others Helped Me See" autoFocus />
                      <div>
                        <button type="button" className="quiet-action" onClick={() => setPlacementMode("change")}>Back</button>
                        <button type="button" className="interview-primary" onClick={createChapter}>Create this chapter <ArrowRight size={18} weight="bold" aria-hidden="true" /></button>
                      </div>
                    </div>
                  </section>
                ) : null}

                {placementMode === "proposal" ? (
                  <div className="placement-actions">
                    <button type="button" className="quiet-action" onClick={() => setPlacementMode("change")}>Change chapter</button>
                    <button type="button" className="interview-primary" onClick={designPage}>Looks right — create page <Check size={18} weight="bold" aria-hidden="true" /></button>
                  </div>
                ) : null}
              </>
            )}
          </motion.section>
        ) : null}

        {phase === "page" ? (
          <motion.section
            key={`page-${pageMode}-${selectedLayout.id}`}
            className="memory-phase page-phase"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
            aria-labelledby="page-title"
          >
            {pageMode === "assembling" ? (
              <div className="page-assembling" aria-live="polite">
                <p className="memory-eyebrow">Designing from your words</p>
                <h1 id="page-title">Your page is taking shape.</h1>
                <p>I chose a reflective layout because this memory turns a small moment into something you want to carry forward.</p>
                <div className="page-assembly-stack" aria-hidden="true">
                  <motion.div initial={{ x: -42, y: 18, rotate: -4, opacity: 0 }} animate={{ x: 0, y: 0, rotate: -2, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }} />
                  <motion.div initial={{ x: 38, y: 28, rotate: 5, opacity: 0 }} animate={{ x: 0, y: 0, rotate: 2, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.28, ease: paperEase }} />
                  <motion.div initial={{ y: 48, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.56, ease: paperEase }}>
                    <span>{selectedLayout.name}</span>
                    <strong>{pageTitle}</strong>
                  </motion.div>
                </div>
                <ol className="assembly-steps">
                  <li><Check size={14} weight="bold" aria-hidden="true" /> Reading the shape of the memory</li>
                  <li><Check size={14} weight="bold" aria-hidden="true" /> Choosing the editorial layout</li>
                  <li><FileText size={14} aria-hidden="true" /> Balancing the final page</li>
                </ol>
              </div>
            ) : pageMode === "layouts" ? (
              <div className="layout-library">
                <div className="layout-library-heading">
                  <div>
                    <p className="memory-eyebrow">Nine ways a memory can live</p>
                    <h1 id="page-title">Choose a different page shape.</h1>
                    <p>{selectedLayout.name} is the current recommendation, but the final page is yours to shape.</p>
                  </div>
                  <button type="button" className="quiet-action" onClick={() => setPageMode("ready")}>Back to page</button>
                </div>
                <div className="layout-options">
                  {editorialLayouts.map((layout, index) => {
                    const unavailable = layout.id === "illustration" && !attachment?.preview;
                    return (
                      <button
                        key={layout.id}
                        type="button"
                        className={selectedLayout.id === layout.id ? "layout-option layout-option--selected" : "layout-option"}
                        aria-pressed={selectedLayout.id === layout.id}
                        disabled={unavailable}
                        onClick={() => chooseLayout(layout)}
                      >
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{layout.name}</strong>
                        <small>{unavailable ? "Add a photo to use this layout." : layout.note}</small>
                        {selectedLayout.id === layout.id ? <Check size={18} weight="bold" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="page-heading page-heading--simple">
                  <p className="memory-eyebrow">Your page</p>
                  <h1 id="page-title">Here&apos;s your memory, kept in your words.</h1>
                  <p>Read it once. If it still feels like you, keep it in your book.</p>
                </div>

                <section className="writing-studio" aria-labelledby="writing-studio-title">
                  <header>
                    <div>
                      <p className="memory-eyebrow">Writing Studio</p>
                      <h2 id="writing-studio-title">See exactly what changed.</h2>
                    </div>
                    <span>{writingLanguage.label} detected · No facts or feelings are added.</span>
                  </header>
                  <div className="writing-studio-tabs" role="tablist" aria-label="Compare versions of this memory">
                    {([
                      ["original", "What you said"],
                      ["cleaned", "Clean transcript"],
                      ["book", "Book version"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={writingReviewMode === value}
                        onClick={() => setWritingReviewMode(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="writing-studio-paper" role="tabpanel">
                    {writingReviewMode === "original" ? (
                      <>
                        <span>Unedited · exactly as captured</span>
                        <p>{originalTranscript || attachment?.name}</p>
                      </>
                    ) : writingReviewMode === "cleaned" ? (
                      <>
                        <span>Filler and repetition removed</span>
                        <p>{cleanedTranscript || attachment?.name}</p>
                      </>
                    ) : (
                      <>
                        <div className="writing-studio-editor-heading">
                          <span>Ready for your page · editable</span>
                          {editedBookDraft ? <button type="button" onClick={() => setEditedBookDraft("")}>Reset edits</button> : null}
                        </div>
                        <label htmlFor="book-draft-editor">Edit the final wording</label>
                        <textarea
                          id="book-draft-editor"
                          value={activeBookDraft}
                          onChange={(event) => setEditedBookDraft(event.target.value)}
                          rows={8}
                        />
                      </>
                    )}
                  </div>
                  <p className="writing-studio-note">
                    {writingReviewMode === "original"
                      ? "This remains attached to the page as your source."
                      : writingReviewMode === "cleaned"
                        ? "Only speech errors, repetition, punctuation, and sentence breaks are corrected."
                        : "This is the exact text that will appear in your book."}
                  </p>
                </section>

                <details className="page-options">
                  <summary>Page options <span>Writing, artwork, title, and chapter</span></summary>
                  <fieldset className="page-writing-style">
                    <legend>How much should we shape your words?</legend>
                    <div>
                      {([
                        ["almost-unchanged", "Clean transcript"],
                        ["gently-shaped", "Polish the flow"],
                        ["literary", "Literary rhythm"],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={writingStyle === value}
                          onClick={() => {
                            setWritingStyle(value);
                            setEditedBookDraft("");
                            setWritingReviewMode("book");
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p>{writingStyle === "almost-unchanged" ? "Removes filler, repetition, and obvious mistakes while keeping your wording." : writingStyle === "gently-shaped" ? "Forms smoother sentences and paragraphs without changing what happened." : "Adds stronger rhythm and paragraph breaks without inventing anything."}</p>
                  </fieldset>
                  <fieldset className="page-artwork-style">
                    <legend>Watercolor atmosphere</legend>
                    <div>
                      {([
                        ["none", "No artwork"],
                        ["subtle", "Subtle"],
                        ["illustrated", "Illustrated"],
                      ] as const).map(([value, label]) => (
                        <button key={value} type="button" aria-pressed={artworkLevel === value} onClick={() => setArtworkLevel(value)}>{label}</button>
                      ))}
                    </div>
                    <p>Artwork follows places and details you mentioned. It never invents people or events.</p>
                    {attachment?.preview ? (
                      <div className="page-photo-treatment">
                        <span>Uploaded photograph</span>
                        <button type="button" aria-pressed={photoTreatment === "original"} onClick={() => setPhotoTreatment("original")}>Keep original</button>
                        <button type="button" aria-pressed={photoTreatment === "painterly"} onClick={() => setPhotoTreatment("painterly")}>Painterly wash</button>
                      </div>
                    ) : null}
                  </fieldset>
                  <label className="page-title-editor" htmlFor="page-title-input">
                    <span>Page title</span>
                    <input id="page-title-input" value={pageTitle} onChange={(event) => setPageTitle(event.target.value)} />
                  </label>
                  <div><button type="button" className="quiet-action" onClick={() => setPageMode("layouts")}>Change layout</button><button type="button" className="quiet-action" onClick={() => { setPlacementMode("proposal"); setPhase("placement"); window.scrollTo({ top: 0, behavior: "auto" }); }}>Change chapter</button></div>
                </details>

                <div className={pageSaved ? "page-route-card page-route-card--saved" : "page-route-card"}>
                  <div><span>{pageSaved ? "Saved in your book" : "Page ready"}</span><strong>{pageSaved ? "Continue to your Library to read it." : "Keep it when it feels true to you."}</strong></div>
                  {pageSaved ? (
                    <div className="page-route-actions">
                      <button type="button" className="interview-primary" onClick={onOpenLibrary ?? onBack}>See it in Contents <Books size={18} weight="bold" aria-hidden="true" /></button>
                      <button type="button" className="quiet-action" onClick={startNewMemory}>Write another</button>
                    </div>
                  ) : (
                    <div><button type="button" className="quiet-action" onClick={editInterview}>Back</button><button type="button" className="interview-primary" onClick={keepPage}>Keep in my book <BookmarkSimple size={18} weight="fill" aria-hidden="true" /></button></div>
                  )}
                </div>

                <div className="page-review-workspace">
                  <article className={`memoir-page memoir-page--${selectedLayout.id} memoir-page--art-${artworkLevel}`} aria-label={`${selectedLayout.name} memoir page preview`}>
                    {/goa/i.test(`${memory} ${memoryContext.place}`) && artworkLevel !== "none" ? (
                      <div className="memoir-watercolor-motifs" aria-hidden="true"><Image src="/assets/goa-watercolor-motifs.png" alt="" fill unoptimized sizes="760px" /></div>
                    ) : null}
                    <header>
                      <span>{placement.book} · {placement.title}</span>
                      <span>{storyDate}</span>
                    </header>
                    <div className="memoir-page-content">
                      <p className="memoir-page-date">{storyDate}</p>
                      {selectedLayout.id === "letter" ? <p className="memoir-salutation">Dear future me,</p> : null}
                      <h2>{pageTitle.trim() || titleForLayout(selectedLayout.id)}</h2>
                      <p className="memory-voice-note"><Sparkle size={13} weight="fill" aria-hidden="true" /> {writingStyle === "almost-unchanged" ? "Your wording, cleaned into readable sentences." : writingStyle === "gently-shaped" ? "Polished for clarity; still unmistakably your voice." : "Shaped for rhythm without inventing details."}</p>
                      {attachment?.preview && (selectedLayout.id === "travel" || selectedLayout.id === "illustration") ? (
                        <MemoryArtwork
                          photo={attachment?.preview}
                          place={memoryContext.place}
                          isTravel={selectedLayout.id === "travel"}
                          painterly={photoTreatment === "painterly"}
                        />
                      ) : null}
                      {selectedLayout.id === "timeline" ? (
                        <div className="memoir-timeline">
                          <p><span>Before</span>{pageSource}</p>
                          {pageScene ? <p><span>The moment</span>{pageScene}</p> : null}
                          {pageInsight ? <p><span>What stayed</span>{pageInsight}</p> : null}
                        </div>
                      ) : selectedLayout.id === "little-things" ? (
                        <ol className="little-things-list">
                          {[pageSource, ...pageDetails].filter(Boolean).map((item) => <li key={item}>{item}</li>)}
                        </ol>
                      ) : (
                        <div className="memoir-page-body">
                          <p>{pageSource}</p>
                          {pageDetails.map((detail, index) => <p key={`${index}-${detail}`}>{detail}</p>)}
                          {pageReflection ? <p className="memoir-page-reflection">{pageReflection}</p> : null}
                        </div>
                      )}
                      {selectedLayout.id === "letter" ? <p className="memoir-signoff">With gratitude,<br />Me</p> : null}
                    </div>
                    <footer><span>Life on Paper</span><span>04 · 01</span></footer>
                  </article>
                </div>

                {pageSaved ? (
                  <div className="page-kept-note">
                    <div><Check size={20} weight="bold" aria-hidden="true" /></div>
                    <span>Page kept</span>
                    <strong>Added to {placement.title}</strong>
                    <p>Your original memory and conversation remain attached behind this page.</p>
                  </div>
                ) : null}
              </>
            )}
          </motion.section>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {notice ? (
          <motion.p
            className="memory-notice"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
            role="status"
          >
            {notice}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MemoryArtwork({
  photo,
  place,
  isTravel,
  painterly = false,
}: {
  photo?: string;
  place: string;
  isTravel: boolean;
  painterly?: boolean;
}) {
  const theme = /goa/i.test(place) ? "goa" : /rishikesh|rishi\s*kej/i.test(place) ? "rishikesh" : "journey";

  return (
    <figure className={`memory-artwork memory-artwork--${theme}${photo ? " memory-artwork--photo" : ""}${painterly ? " memory-artwork--painterly" : ""}`}>
      {photo ? <Image src={photo} alt={`A painterly interpretation of this ${place || "travel"} memory`} width={1600} height={1200} unoptimized sizes="680px" /> : null}
      <span className="memory-artwork-wash" aria-hidden="true" />
      <figcaption>
        <span>{isTravel ? "A sense of place" : "From your photograph"}</span>
        <strong>{place || "The atmosphere of this memory"}</strong>
      </figcaption>
    </figure>
  );
}

function ConversationProgress({ phase }: { phase: Phase }) {
  const phases: Array<{ id: "capture" | "interview" | "placement"; label: string }> = [
    { id: "capture", label: "What happened" },
    { id: "interview", label: "Let’s talk" },
    { id: "placement", label: "Your page" },
  ];
  const activePhase = phase === "capture" ? "capture" : phase === "interview" ? "interview" : "placement";
  const current = Math.max(0, phases.findIndex((item) => item.id === activePhase));

  return (
    <div className="memory-journey-progress" aria-label={`Step ${current + 1} of ${phases.length}: ${phases[current].label}`}>
      <div><strong>{phases[current].label}</strong><span>{current + 1} of {phases.length}</span></div>
      <span className="memory-journey-track" aria-hidden="true"><i style={{ width: `${((current + 1) / phases.length) * 100}%` }} /></span>
    </div>
  );
}

function CaptureSurface({
  mode,
  memory,
  setMemory,
  attachment,
  chooseFile,
  onContinue,
  speechLanguage,
  setSpeechLanguage,
  starterPrompt,
}: {
  mode: CaptureMode;
  memory: string;
  setMemory: (value: string) => void;
  attachment: { name: string; preview?: string; kind: string } | null;
  chooseFile: (mode?: CaptureMode) => void;
  onContinue: () => void;
  speechLanguage: SpeechLanguage;
  setSpeechLanguage: (language: SpeechLanguage) => void;
  starterPrompt?: string;
}) {
  const speechLanguageLabel = speechLanguage === "hi-IN" ? "हिन्दी" : speechLanguage === "en-IN" ? "English" : "Auto · English & Hinglish";
  return (
    <div className="capture-composer-surface">
      {attachment ? (
        <div className="composer-attachment">
          {attachment.preview ? (
            <div className="composer-attachment-preview">
              <Image src={attachment.preview} alt="Attached to this memory" fill unoptimized sizes="96px" />
            </div>
          ) : (
            <span className="composer-file-icon"><FileText size={20} aria-hidden="true" /></span>
          )}
          <div>
            <strong>{attachment.name}</strong>
            <span>{attachment.kind || mode}</span>
          </div>
          <button type="button" onClick={() => chooseFile(mode)}>Replace</button>
        </div>
      ) : null}

      <MemoryComposer
        id="new-memory-text"
        value={memory}
        onChange={setMemory}
        onSubmit={onContinue}
        onAddAttachment={() => chooseFile("File")}
        onAddPhoto={() => chooseFile("Photo")}
        placeholder={starterPrompt ? "Tell me what happened…" : "So, what happened?"}
        submitLabel="Let’s talk about it"
        allowAttachment={Boolean(attachment)}
        speechLanguage={speechLanguage === "auto" ? undefined : speechLanguage}
        spokenPrompt={starterPrompt || "I’m listening. What’s on your mind?"}
        autoFocus
      />

      <details className="memory-language-choice">
        <summary><span>Speaking language</span><strong>{speechLanguageLabel}</strong></summary>
        <div>
          {([
            ["auto", "Auto"],
            ["en-IN", "English"],
            ["hi-IN", "हिन्दी"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={speechLanguage === value ? "is-selected" : ""}
              onClick={() => setSpeechLanguage(value)}
              aria-pressed={speechLanguage === value}
            >
              {label}
            </button>
          ))}
        </div>
        <p>
          {speechLanguage === "auto"
            ? "Best for English or Hinglish. Your page keeps the language and script you use."
            : speechLanguage === "hi-IN"
              ? "Speak naturally in Hindi. Your words will remain in Hindi unless you choose a translation later."
              : "Best for English speech. Hinglish words will stay part of your original memory."}
        </p>
      </details>

      <div className="capture-composer-hint">
        <span><Microphone size={15} weight="fill" aria-hidden="true" /> Tap the microphone to see your words appear live.</span>
        <span>Press Enter to continue · Shift + Enter for a new line</span>
      </div>
    </div>
  );
}

function MemoryComposer({
  id,
  value,
  onChange,
  onSubmit,
  onAddAttachment,
  onAddPhoto,
  onError,
  placeholder,
  submitLabel,
  allowAttachment = false,
  allowEmpty = false,
  compact = false,
  autoFocus = false,
  speechLanguage,
  spokenPrompt,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAddAttachment: () => void;
  onAddPhoto?: () => void;
  onError?: (message: string) => void;
  placeholder: string;
  submitLabel: string;
  allowAttachment?: boolean;
  allowEmpty?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
  speechLanguage?: string;
  spokenPrompt?: string;
}) {
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSpeakingPrompt, setIsSpeakingPrompt] = useState(false);
  const voiceSessionRef = useRef(false);
  const speech = useLiveTranscription({
    value,
    onChange,
    onError: (message) => {
      setSpeechError(message);
      onError?.(message);
    },
    language: speechLanguage,
  });
  const canSubmit = Boolean(value.trim()) || allowAttachment || allowEmpty;

  useEffect(() => {
    return () => {
      voiceSessionRef.current = false;
      window.speechSynthesis?.cancel();
    };
  }, []);

  const submit = () => {
    if (speech.isListening) speech.stop();
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (compact) return;
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSubmit) submit();
  };

  const toggleSpeech = () => {
    setSpeechError(null);
    if (speech.isListening) speech.stop();
    else speech.start();
  };

  const openVoiceConversation = () => {
    setSpeechError(null);
    setVoiceMode(true);
    voiceSessionRef.current = true;
    window.setTimeout(() => {
      if (voiceSessionRef.current) speech.start();
    }, 180);
  };

  const closeVoiceConversation = () => {
    voiceSessionRef.current = false;
    if (speech.isListening) speech.stop();
    window.speechSynthesis?.cancel();
    setIsSpeakingPrompt(false);
    setVoiceMode(false);
  };

  const hearPrompt = () => {
    if (!spokenPrompt || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speech.isListening) speech.stop();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenPrompt);
    utterance.lang = speechLanguage || "en-IN";
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeakingPrompt(true);
    utterance.onend = () => setIsSpeakingPrompt(false);
    utterance.onerror = () => {
      setIsSpeakingPrompt(false);
      setSpeechError("I couldn’t read that aloud, but the question is still here for you.");
    };
    window.speechSynthesis.speak(utterance);
  };

  const finishVoiceConversation = () => {
    closeVoiceConversation();
    if (!compact && canSubmit) onSubmit();
  };

  if (voiceMode) {
    return (
      <section className={speech.isListening ? "voice-conversation voice-conversation--listening" : "voice-conversation"} aria-label="Voice conversation" role="dialog" aria-modal="true">
        <header>
          <button type="button" onClick={closeVoiceConversation} aria-label="Return to typing">
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
          </button>
          <div>
            <span>{compact ? "Answer aloud" : "Speak your memory"}</span>
            <strong>{spokenPrompt || "Say it exactly as you remember it."}</strong>
          </div>
          {spokenPrompt ? (
            <button
              type="button"
              className={isSpeakingPrompt ? "voice-conversation__speaker is-speaking" : "voice-conversation__speaker"}
              onClick={hearPrompt}
              aria-label={isSpeakingPrompt ? "Reading the question aloud" : "Hear this question aloud"}
              disabled={isSpeakingPrompt}
            >
              <SpeakerHigh size={18} weight="fill" aria-hidden="true" />
            </button>
          ) : null}
        </header>

        <div className="voice-conversation__center">
          <button
            type="button"
            className="voice-conversation__orb"
            onClick={toggleSpeech}
            aria-label={speech.isListening ? "Pause listening" : "Continue listening"}
            aria-pressed={speech.isListening}
          >
            <i aria-hidden="true" />
            <i aria-hidden="true" />
            <span>{speech.isListening ? <Stop size={24} weight="fill" aria-hidden="true" /> : <Microphone size={27} weight="fill" aria-hidden="true" />}</span>
          </button>
          <p><strong>{isSpeakingPrompt ? "Reading the question" : speech.isListening ? "I’m listening" : value.trim() ? "Paused" : "Ready when you are"}</strong><span>{isSpeakingPrompt ? "When it finishes, tap the circle and answer naturally." : speech.isListening ? "Speak naturally. Your words appear as you say them." : "Tap the circle whenever you want to speak."}</span></p>
        </div>

        <div className="voice-conversation__transcript" aria-live="polite">
          <span>{speech.isListening ? "Writing as you speak" : "What I heard"}</span>
          <p>{value.trim() || speech.interimTranscript || "Your words will appear here as you speak…"}</p>
        </div>

        {speechError ? <p className="voice-conversation__error">{speechError}</p> : null}

        <footer>
          <button type="button" className="quiet-action" onClick={closeVoiceConversation}>Switch to typing</button>
          <button type="button" className="interview-primary" onClick={finishVoiceConversation} disabled={!canSubmit}>
            {compact ? "Use these words" : "Continue"} <ArrowRight size={17} weight="bold" aria-hidden="true" />
          </button>
        </footer>
      </section>
    );
  }

  return (
    <div className={[
      "conversation-composer",
      "conversation-composer--unified",
      speech.isListening ? "conversation-composer--listening" : "",
      compact ? "conversation-composer--compact" : "",
    ].filter(Boolean).join(" ")}>
      <label className="sr-only" htmlFor={id}>Tell me what happened</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => {
          if (speech.isListening) speech.stop();
          setSpeechError(null);
          onChange(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
      />

      <div className="conversation-live-status" aria-live="polite">
        {speech.isListening ? (
          <>
            <span className="live-transcript-dot" aria-hidden="true" />
            <strong>Listening live</strong>
            <span>{speech.interimTranscript || "Start speaking — your words will appear above."}</span>
          </>
        ) : speechError ? (
          <span>{speechError}</span>
        ) : null}
      </div>

      <div className="conversation-composer-tools">
        <div className="composer-actions">
          {!compact ? (
            <>
              <button type="button" onClick={onAddAttachment} aria-label="Attach a file">
                <Plus size={19} weight="bold" aria-hidden="true" />
                <span>File</span>
              </button>
              {onAddPhoto ? (
                <button type="button" onClick={onAddPhoto} aria-label="Add a photo">
                  <ImageSquare size={19} aria-hidden="true" />
                  <span>Photo</span>
                </button>
              ) : null}
            </>
          ) : null}
          <span>{speech.isListening ? "Transcribing as you speak" : compact ? "Optional" : "Add a photo, file, or speak"}</span>
        </div>

        <div className="composer-primary-actions">
          <button
            type="button"
            className="composer-mic"
            onClick={openVoiceConversation}
            aria-label="Open voice conversation"
            disabled={!speech.isSupported}
          >
            <Microphone size={19} weight="fill" aria-hidden="true" />
            {!compact ? <span>Talk</span> : null}
          </button>
          {!compact ? (
            <>
              {!canSubmit ? <span className="composer-submit-hint">Start with a few words</span> : null}
              <button
                type="button"
                className="conversation-send"
                onClick={submit}
                aria-label={submitLabel}
                disabled={!canSubmit}
              >
                <ArrowRight size={20} weight="bold" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
