import type {
  MemoryEngineLanguage,
  MemoryPageResult,
  MemoryQuestionResult,
} from "@/lib/ai/memory-engine";

const feelingWords = [
  "happy", "grateful", "proud", "peaceful", "nostalgic", "surprised", "disappointed", "hurt", "unsure",
];

const ignoredNames = new Set([
  "Actually", "After", "And", "Basically", "Before", "But", "English", "Every", "First", "Friday",
  "Goa", "Happy", "He", "Hindi", "Hinglish", "Honestly", "I", "India", "It", "Last", "Lately",
  "Later", "Life", "Maybe", "Monday", "My", "Once", "One", "Our", "Paper", "Perhaps", "Recently",
  "Rishikesh", "Saturday", "She", "Some", "Sometimes", "Suddenly", "Sunday", "The", "Then", "They",
  "This", "Thursday", "Today", "Tuesday", "Wednesday", "We", "When", "While", "Yesterday",
]);

const stopWords = new Set([
  "about", "after", "again", "also", "because", "before", "being", "could", "from", "have", "just",
  "lately", "like", "memory", "moment", "more", "really", "recently", "remember", "said", "some",
  "something", "that", "their", "there", "these", "they", "thing", "this", "today", "very",
  "want", "was", "were", "what", "when", "which", "with", "would", "your",
]);

const weakAnchorWords = new Set([
  "actually", "basically", "first", "honestly", "last", "lately", "later", "maybe", "once",
  "perhaps", "recently", "sometimes", "something", "suddenly", "then", "today", "yesterday",
]);

export type MemoryGrounding = {
  person: string;
  place: string;
  feeling: string;
  language: MemoryEngineLanguage;
  topic: "app-feedback" | "appreciation" | "travel" | "conversation" | "work" | "reflection" | "moment";
};

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function detectLanguage(value: string): MemoryEngineLanguage {
  const devanagari = (value.match(/[\u0900-\u097F]/g) ?? []).length;
  const latin = value.match(/[A-Za-z]+/g) ?? [];
  const romanHindi = value.toLocaleLowerCase().match(/\b(?:aaj|achha|accha|bahut|bas|hai|hain|hum|kabhi|kya|lekin|main|maine|mera|meri|mujhe|nahi|par|phir|tha|thi|thoda|toh|yaad|yaar)\b/g) ?? [];
  if (devanagari && latin.length > 2) return "Mixed";
  if (devanagari) return "Hindi";
  if (romanHindi.length >= 2) return "Hinglish";
  return "English";
}

function detectPerson(value: string) {
  const explicit = value.match(/\b(?:my\s+(?:friend|colleague|cousin|sister|brother|mother|father|partner|teacher|mentor)\s+|named\s+|called\s+|met\s+|spoke to\s+|talked to\s+|talking about\s+|thinking about\s+|with\s+)([A-Z][a-z]{1,24})\b/)?.[1];
  if (explicit && !ignoredNames.has(explicit)) return explicit;
  const actingPerson = value.match(/\b([A-Z][a-z]{1,24})\s+(?:(?:ne|ney)\s+)?(?:said|told|asked|called|helped|came|left|made|gave|shared|wrote|messaged|bola|boli|kaha|poocha|pucha|bataya|likha|bheja)\b/i)?.[1];
  if (actingPerson && !ignoredNames.has(actingPerson)) return actingPerson;
  const subject = value.match(/(?:^|[.!?]\s+)([A-Z][a-z]{1,24})\s+(?:said|told|asked|called|helped|came|left|made|gave|was|is|had|has)\b/)?.[1];
  if (subject && !ignoredNames.has(subject)) return subject;
  const candidates = (value.match(/\b[A-Z][a-z]{1,24}\b/g) ?? []).filter((word) => !ignoredNames.has(word));
  return candidates.find((candidate) => candidates.filter((word) => word === candidate).length > 1) ?? "";
}

function detectPlace(value: string) {
  if (/\brishikesh|rishi\s*kej\b/i.test(value)) return "Rishikesh";
  if (/\bgoa\b/i.test(value)) return "Goa";
  const landmark = value.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\s+(?:Park|Beach|Fort|Temple|Lake|Hostel|Station|Airport))\b/)?.[1];
  if (landmark) return landmark;
  const knownPlace = value.match(/\b(Bangalore|Bengaluru|Mumbai|Bombay|Delhi|Kolkata|Calcutta|Chennai|Pune|Jaipur|Udaipur|Manali|Kerala|Varanasi|Agra)\b/i)?.[1];
  if (knownPlace) return knownPlace.charAt(0).toUpperCase() + knownPlace.slice(1).toLocaleLowerCase();
  return value.match(/\b(?:in|at|to|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ?? "";
}

export function groundMemory(memory: string, answers: string[] = [], emotions: string[] = []): MemoryGrounding {
  const source = compact([memory, ...answers].filter(Boolean).join(" "));
  const lower = source.toLocaleLowerCase();
  const place = detectPlace(source);
  const feeling = emotions[0]?.toLocaleLowerCase() ?? feelingWords.find((item) => lower.includes(item)) ?? "";
  const topic = /follow[- ]?up|question|option|screen|feature|\bapp\b|user experience|\bux\b/.test(lower)
    ? "app-feedback"
    : /appreciat|compliment|prais|thank|noticed|\bnotice\b|tareef|acha|achha|accha/.test(lower)
      ? "appreciation"
      : /travel|trip|journey|solo|flight|train|road|beach|hostel|hotel|park|went|visited|gayi|gaya|goa|rishikesh/.test(lower) && Boolean(place || /travel|trip|journey/.test(lower))
        ? "travel"
        : /conversation|said|told|spoke|talk|message|called/.test(lower)
          ? "conversation"
          : /work|office|job|client|manager|team|promotion|project/.test(lower)
            ? "work"
            : /learn|realis|realiz|understood|noticed|confidence|alone/.test(lower)
              ? "reflection"
              : "moment";
  return { person: detectPerson(source), place, feeling, language: detectLanguage(source), topic };
}

function questionSet(memory: string, answers: string[], emotions: string[], index: number) {
  const grounding = groundMemory(memory, answers, emotions);
  const source = compact([memory, ...answers].filter(Boolean).join(" "));
  const lowerSource = source.toLocaleLowerCase();
  const latest = compact(answers.at(-1) ?? "");
  const feeling = grounding.feeling || "that way";

  if (grounding.language === "Hindi") {
    if (grounding.person) return [`${grounding.person} ने ऐसा क्या कहा या किया जो तुम्हें अब भी याद है?`, `${grounding.person} ने ठीक-ठीक क्या कहा था?`, `उसके बाद तुमने क्या किया?`, `उस बात का तुम पर क्या असर हुआ?`];
    if (grounding.place) return [`${grounding.place} की उस याद में सबसे पहले क्या दिखाई देता है?`, `यह ${grounding.place} की कौन-सी यात्रा थी?`, `वहाँ तुम्हारे साथ कौन था?`, `उस दिन आगे क्या हुआ?`];
    return ["उस पल में ऐसा क्या हुआ जो अब भी याद है?", "सबसे पहले क्या हुआ था?", "वहाँ कौन था?", "उसके बाद क्या हुआ?"];
  }

  if (grounding.language === "Hinglish" || grounding.language === "Mixed") {
    if (grounding.person && grounding.topic === "appreciation") return [
      `${grounding.person} ne tumhare kaam ke baare mein exactly kya kaha tha?`,
      `${grounding.person} ne tumhare kaam mein kya notice kiya?`,
      `${grounding.person} ki baat sunke tumhe sabse zyada kya feel hua?`,
      `Kya tumne ${grounding.person} ko kuch jawab diya?`,
    ];
    if (grounding.person) return [`${grounding.person} ne aisa kya kaha ya kiya jo abhi bhi yaad hai?`, `${grounding.person} ne exactly kya kaha tha?`, `Uske baad tumne kya kiya?`, `Woh baat tumhare saath kyun reh gayi?`];
    if (grounding.place && /baarish|rain/.test(memory.toLocaleLowerCase())) return [`${grounding.place} mein baarish ke baad aisa kya tha jisne tumhe ghar jaisa feel karaya?`, `Us waqt ${grounding.place} mein tum kya dekh rahi thi?`, `Bangalore ghar jaisa kab feel hua?`, `Us pal tumhare saath kaun tha?`];
    if (grounding.place) return [`${grounding.place} ki iss memory mein sabse pehle kya yaad aata hai?`, `${grounding.place} mein exactly kahan thi?`, `Tumhare saath kaun tha?`, `Uske baad kya hua?`];
    return ["Iss moment mein exactly kya hua tha?", "Sabse pehle kya hua?", "Wahan kaun tha?", "Uske baad kya hua?"];
  }

  if (latest) {
    const cue = latest.replace(/[.!?]+$/, "").split(/\s+/).slice(0, 8).join(" ");
    if (/said|told|words|message|conversation/.test(latest.toLocaleLowerCase())) return ["What did you do after hearing that?", "What were the exact words?", "How did you answer?", "Why did those words stay with you?"];
    if (/free|alone|independent/.test(latest.toLocaleLowerCase())) return [grounding.place ? `What could you do in ${grounding.place} that made you feel free?` : "What could you do then that made you feel free?", "When did you first notice that feeling?", "Were you alone or with someone?", "What happened next?"];
    return [`You mentioned “${cue}${latest.split(/\s+/).length > 8 ? "…" : ""}” — what happened next?`, "What happened just before that?", "Who else was there?", "Why has that detail stayed with you?"];
  }

  if (grounding.topic === "app-feedback") return ["Which question felt unrelated to what you had shared?", "What detail should the app have noticed?", "What would a natural follow-up have sounded like?", "What did you expect to happen next?"];
  if (grounding.person && grounding.topic === "conversation") return [`What did ${grounding.person} say that stayed with you?`, `What exactly did ${grounding.person} say?`, `How did you answer ${grounding.person}?`, "What changed after that conversation?"];
  if (grounding.person) return [`What did ${grounding.person} do that you want to remember?`, `What did ${grounding.person} say?`, `Where were you both?`, `Why has this memory of ${grounding.person} stayed?`];
  if (grounding.topic === "appreciation") {
    const appreciationAnchor = /ai tools|content|creating|created|work|project|team|coffee|run|founders/i.test(source)
      ? source.match(/\b(?:ai tools?|good content|creating good content|project|team|coffee|weekly runs?|founders running club|work)\b/i)?.[0]
      : "";
    return [
      grounding.feeling ? `What about that appreciation made you feel ${feeling}?` : appreciationAnchor ? `What exactly did they appreciate about your ${appreciationAnchor}?` : "What exactly did they appreciate about you?",
      appreciationAnchor ? `What had you done with ${appreciationAnchor} that they noticed?` : "What had you done that they noticed?",
      "What exactly did they say to you?",
      "Why did their words stay with you?",
    ];
  }
  if (grounding.topic === "travel" && grounding.place) return [grounding.feeling ? `What happened in ${grounding.place} that made you feel ${feeling}?` : `What happened first when you reached ${grounding.place}?`, `Which ${grounding.place} trip was this?`, `Who was with you in ${grounding.place}?`, `What can you still see or hear from that day?`];
  if (grounding.topic === "travel") return ["Which trip was this?", "Where were you?", "Who were you travelling with?", "What happened first?"];
  if (grounding.topic === "work") return [grounding.feeling ? `What happened at work that made you feel ${feeling}?` : "What happened at work?", "Who was part of that moment?", "What did they say or do?", "Why did it matter to you?"];
  if (grounding.feeling) return [`What happened that made you feel ${feeling}?`, "Who was with you?", "What did they say or do?", "What happened next?"];
  if (grounding.topic === "reflection") {
    if (/alone|on my own|spend time alone/.test(lowerSource)) return ["What happened that made being alone feel important?", "When did you first feel capable on your own?", "What did you believe about confidence before?", "What changed after you realised this?"];
    if (/confidence/.test(lowerSource)) return ["What made you rethink where confidence comes from?", "What promise did you keep to yourself?", "What were you scared of doing?", "What changed after you showed up?"];
    return ["What happened that first made you realise this?", "What did you believe before?", "Was there one moment when it became clear?", "What changed afterwards?"];
  }
  return index > 0
    ? anchoredFallbackQuestions(source, "next")
    : anchoredFallbackQuestions(source, "first");
}

export function fallbackQuestion(memory: string, answers: string[], emotions: string[], index: number) {
  const questions = questionSet(memory, answers, emotions, index);
  return { question: questions[0], suggestions: questions.slice(1, 4) };
}

function contentTokens(value: string) {
  return new Set((value.toLocaleLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []).filter((word) => word.length > 3 && !stopWords.has(word)));
}

function anchoredFallbackQuestions(source: string, position: "first" | "next") {
  const tokens = [...contentTokens(source)].filter((token) => !weakAnchorWords.has(token));
  const anchor = tokens.slice(0, 3).join(" ");
  if (!anchor) return position === "next"
    ? ["What changed after that?", "What words do you remember?", "What detail should stay in the book?", "What did it make you feel?"]
    : ["What happened that you want to keep?", "What words do you remember?", "What detail should stay in the book?", "What did it make you feel?"];
  const label = anchor.length > 42 ? `${anchor.slice(0, 42).trim()}…` : anchor;
  return [
    position === "next" ? `What changed after ${label}?` : `What about ${label} made you want to keep this?`,
    `What detail from ${label} should stay exactly as it happened?`,
    `What did ${label} make you feel?`,
    "Tell me in your own words.",
  ];
}

function startsWithWeakAnchor(value: string) {
  return weakAnchorWords.has(value.trim().split(/\s+/)[0]?.toLocaleLowerCase() ?? "");
}

function isGroundedQuestion(question: string, memory: string, answers: string[], emotions: string[]) {
  const lower = question.toLocaleLowerCase();
  if (!question.trim().endsWith("?") || question.split(/\s+/).length > 22) return false;
  if (/feels? most alive|first thing you remember about lately|about lately|in this moment|tell me more|anything else|future self|one more detail/.test(lower)) return false;
  const grounding = groundMemory(memory, answers, emotions);
  if (grounding.person && lower.includes(grounding.person.toLocaleLowerCase())) return true;
  if (grounding.place && lower.includes(grounding.place.toLocaleLowerCase())) return true;
  if (grounding.feeling && lower.includes(grounding.feeling)) return true;
  const sourceTokens = contentTokens([memory, ...answers].join(" "));
  const questionTokens = [...contentTokens(question)].filter((token) => !weakAnchorWords.has(token));
  const sharesDetail = questionTokens.some((token) => sourceTokens.has(token));
  if (questionTokens.length > 0 && questionTokens.every((token) => weakAnchorWords.has(token))) return false;
  if (grounding.person || grounding.place || grounding.feeling || sourceTokens.size >= 4) return sharesDetail;
  return sharesDetail || /what happened|who was|what did (?:they|he|she)|what words|where were/.test(lower);
}

export function guardQuestionResult(
  result: Omit<MemoryQuestionResult, "source">,
  memory: string,
  answers: string[],
  emotions: string[],
  index: number,
): Omit<MemoryQuestionResult, "source"> {
  const fallback = fallbackQuestion(memory, answers, emotions, index);
  const question = isGroundedQuestion(result.question, memory, answers, emotions) ? compact(result.question) : fallback.question;
  const suggestions = result.suggestions
    .map(compact)
    .filter((item, suggestionIndex, all) => item && all.indexOf(item) === suggestionIndex)
    .filter((item) => item.trim().endsWith("?") && !startsWithWeakAnchor(item))
    .filter((item) => isGroundedQuestion(item, memory, answers, emotions))
    .slice(0, 3);
  return {
    language: groundMemory(memory, answers, emotions).language,
    question,
    suggestions: suggestions.length >= 2 ? suggestions : fallback.suggestions,
  };
}

function conservativeClean(value: string) {
  const cleaned = compact(value)
    .replace(/([a-z])([A-Z])/g, "$1. $2")
    .replace(/\b(?:um+|uh+|erm+)\b[,.]?\s*/gi, "")
    .replace(/\b(?:you know|i mean)\b[,.]?\s*/gi, "")
    .replace(/\bI was like\s+(?=(?:really\s+)*(?:happy|sad|proud|surprised|shocked|excited|confused)\b)/gi, "I was ")
    .replace(/\bmatlab\s+(?=mujhe\s+laga\b)/gi, ". Mujhe laga ")
    .replace(/\b(?:like|basically|actually)\b[,.]?\s+(?=\b(?:I|we|he|she|they|it|this|that)\b)/gi, "")
    .replace(/\bI was just remembering today\b/gi, "Today I remembered")
    .replace(/\bI was just remembering\b/gi, "I remembered")
    .replace(/\bI was feeling\b/gi, "I felt")
    .replace(/\bI am feeling\b/gi, "I feel")
    .replace(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?\s+back\b/gi, "$1 years ago")
    .replace(/\bso\s+and\b/gi, "and")
    .replace(/\b(and\s+)?then\s+then\b/gi, "then")
    .replace(/\bfor the first time\s+first day\b/gi, "for the first time. On the first day")
    .replace(/(?:^|[.!?]\s+)\b(?:so|basically|actually|you know|i mean|yeah)\b[,\s]*/gi, (match) => match.match(/[.!?]/)?.[0] ? `${match.match(/[.!?]/)?.[0]} ` : "")
    .replace(/\b(\p{L}+)(?:\s+\1\b)+/giu, "$1")
    .replace(/\b((?:\p{L}+[ '\-]+){1,3}\p{L}+)(?:\s+\1\b)+/giu, "$1")
    .replace(/\b(?:i|I)\s+(?:was\s+){2,}/g, "I was ")
    .replace(/\ban\s+(?=[bcdfghjklmnpqrstvwxyz]\w*)/gi, "a ")
    .replace(/\s+\bI\b\s+/g, ". I ")
    .replace(/([^.!?]{65,})\s+\bbut\b\s+/gi, "$1. But ")
    .replace(/([^.!?]{80,})\s+\band then\b\s+/gi, "$1. Then ")
    .replace(/\bwas soAnd\b/gi, "was so. And")
    .replace(/\s+([,.;!?।])/g, "$1")
    .trim();
  if (!cleaned) return "";
  const capitalized = /^[a-z]/.test(cleaned) ? `${cleaned[0].toUpperCase()}${cleaned.slice(1)}` : cleaned;
  return /[.!?।]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function tidyGeneratedText(value: string) {
  return value
    .replace(/,\s*\./g, ".")
    .replace(/\.\s*,/g, ".")
    .replace(/([!?])\s*[,.]/g, "$1")
    .replace(/\s+([,.;!?।])/g, "$1")
    .replace(/([,.;!?।])(?=[\p{L}\p{N}])/gu, "$1 ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function isBadTitle(value: string, memory: string, answers: string[]) {
  const title = compact(value);
  if (!title || title.split(/\s+/).length > 9) return true;
  if (/^(?:reflections? on|thoughts? on|a memory|my memory|the day i remember|something i learned|the day lately|the kind of person)/i.test(title)) return true;
  const grounding = groundMemory(memory, answers);
  if (grounding.person && !title.toLocaleLowerCase().includes(grounding.person.toLocaleLowerCase())) return true;
  if (grounding.place && grounding.topic === "travel" && !title.toLocaleLowerCase().includes(grounding.place.toLocaleLowerCase())) return true;
  const lowerTitle = title.toLocaleLowerCase();
  const lowerSource = [memory, ...answers].join(" ").toLocaleLowerCase();
  if (grounding.place && lowerTitle === grounding.place.toLocaleLowerCase() && /rain|baarish|home|ghar|first|hostel|beach|sea|ocean|morning|night|evening|free|freedom|alone/.test(lowerSource)) return true;
  if (grounding.person && lowerTitle === grounding.person.toLocaleLowerCase() && grounding.topic === "conversation") return true;
  return false;
}

function fallbackTitle(memory: string, answers: string[]) {
  const source = [memory, ...answers].join(" ");
  const lower = source.toLocaleLowerCase();
  const grounding = groundMemory(memory, answers);
  if (grounding.person && grounding.place) return `${grounding.place} with ${grounding.person}`;
  if (grounding.person && grounding.topic === "appreciation" && /work|office|job|client|manager|team|project|kaam/.test(lower)) return `What ${grounding.person} Noticed in My Work`;
  if (grounding.person && grounding.topic === "conversation") return `What ${grounding.person} Said`;
  if (grounding.person) return grounding.person;
  if (grounding.place && /\b(?:home|ghar)\b/.test(lower) && /\b(?:felt|feel|laga|jaisa)\b/.test(lower)) return `When ${grounding.place} Felt Like Home`;
  if (grounding.place && /\b(?:rain|baarish)\b/.test(lower)) return `After the Rain in ${grounding.place}`;
  if (grounding.place && /\b(?:free|freedom|independent|on my own)\b/.test(lower)) return `Feeling Free in ${grounding.place}`;
  if (grounding.place && /\bfirst\b/.test(lower) && /\bday|trip|time\b/.test(lower)) return `My First Day in ${grounding.place}`;
  if (grounding.place && /first/.test(lower)) return `My First Day in ${grounding.place}`;
  if (grounding.place && /hostel/.test(lower)) return `The Hostel in ${grounding.place}`;
  if (grounding.place) return grounding.place;
  if (grounding.topic === "appreciation" && /work|office|job|client|manager|team|project/.test(lower)) return "What They Noticed at Work";
  if (grounding.topic === "appreciation") return "What They Noticed";
  if (/confidence/.test(lower)) return "Where My Confidence Came From";
  if (/alone|on my own/.test(lower)) return "Learning to Be on My Own";
  if (grounding.topic === "conversation") return "The Words I Remember";
  return "A Moment I Want to Keep";
}

function guardedPlacement(result: Omit<MemoryPageResult, "source">["placement"], grounding: MemoryGrounding) {
  const placementText = `${result.volume} ${result.chapterTitle}`.toLocaleLowerCase();
  const generic = /things i learned|life lessons|everyday moments|people and conversations|reflections?|becoming|small things/.test(placementText);
  if (grounding.place && (generic || !placementText.includes(grounding.place.toLocaleLowerCase()))) {
    return {
      book: "Book One",
      volume: "Volume I · Places",
      chapter: "Chapter One",
      chapterTitle: grounding.place,
      confidence: 0.88,
      reason: `${grounding.place} is the clearest anchor in what you shared.`,
      needsConfirmation: false,
    };
  }
  if (grounding.person && (generic || !placementText.includes(grounding.person.toLocaleLowerCase()))) {
    return {
      book: "Book One",
      volume: "Volume I · People",
      chapter: "Chapter One",
      chapterTitle: grounding.person,
      confidence: 0.86,
      reason: `${grounding.person} is at the centre of this memory.`,
      needsConfirmation: false,
    };
  }
  return result;
}

function lexicalCoverage(draft: string, source: string) {
  const sourceTokens = contentTokens(source);
  const draftTokens = contentTokens(draft);
  if (!sourceTokens.size || !draftTokens.size) return 1;
  const supported = [...draftTokens].filter((token) => sourceTokens.has(token)).length;
  return supported / draftTokens.size;
}

function needsSpokenCleanup(value: string) {
  return /\b(?:um+|uh+|erm+|you know|i mean)\b|\bI was like\s*,?\s*(?:really\s*,?\s*)*(?:happy|sad|proud|surprised|shocked|excited|confused)\b|\bmatlab\s*,?\s*mujhe\s+laga\b|\b(\p{L}+)(?:\s+\1\b)+|\bfor the first time\s+first day\b|[a-z][A-Z]|\b(?:and\s+)?then\s+then\b/iu.test(value);
}

export function guardPageResult(
  result: Omit<MemoryPageResult, "source">,
  memory: string,
  answers: string[],
  emotions: string[],
): Omit<MemoryPageResult, "source"> {
  const original = [memory, ...answers].filter(Boolean).join("\n\n");
  const cleanTranscript = result.cleanTranscript.trim() && lexicalCoverage(result.cleanTranscript, original) >= 0.68
    ? tidyGeneratedText(result.cleanTranscript)
    : [memory, ...answers].map(conservativeClean).filter(Boolean).join("\n\n");
  const proposedBookDraft = result.bookDraft.trim() && lexicalCoverage(result.bookDraft, original) >= 0.58
    ? tidyGeneratedText(result.bookDraft)
    : cleanTranscript;
  const unchangedRamblingDraft = needsSpokenCleanup(original)
    && compact(proposedBookDraft).toLocaleLowerCase() === compact(original).toLocaleLowerCase();
  const stillRamblingDraft = needsSpokenCleanup(proposedBookDraft);
  const bookDraft = unchangedRamblingDraft || stillRamblingDraft
    ? [memory, ...answers].map(conservativeClean).filter(Boolean).join("\n\n")
    : proposedBookDraft;
  const grounding = groundMemory(memory, answers, emotions);
  const title = isBadTitle(result.title, memory, answers) ? fallbackTitle(memory, answers) : compact(result.title);
  const reflection = result.reflection.trim() && lexicalCoverage(result.reflection, original) >= 0.5
    ? tidyGeneratedText(result.reflection)
    : "";
  return {
    ...result,
    language: grounding.language,
    cleanTranscript,
    bookDraft,
    title,
    reflection,
    placement: guardedPlacement(result.placement, grounding),
  };
}
