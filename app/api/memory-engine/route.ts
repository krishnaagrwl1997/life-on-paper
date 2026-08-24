import { NextResponse } from "next/server";
import {
  editorialLayoutIds,
  type MemoryEngineRequest,
  type MemoryEngineResult,
  type MemoryPageResult,
  type MemoryQuestionResult,
} from "@/lib/ai/memory-engine";
import { guardPageResult, guardQuestionResult } from "@/lib/ai/editorial-guardrails";

export const runtime = "nodejs";

const MAX_MEMORY_LENGTH = 12_000;
const MAX_ANSWER_LENGTH = 4_000;

const editorInstructions = `You are the private documentary editor for Life on Paper, an AI memoir app.

Your work must feel like an attentive human editor helping someone remember—not a chatbot, therapist, journaling prompt, or motivational coach.

Non-negotiable editorial rules:
- Preserve the user's facts, meaning, emotional temperature, humour, rhythm, and word choices.
- Keep the user's language and register. English stays English, Hindi stays Hindi, and Hinglish stays Hinglish. Never translate unless explicitly asked.
- For the finished page, lightly edit dictated speech: remove filler, accidental repetitions, false starts, and obvious grammar or transcription errors. Form clear sentences, but do not rewrite the person's life into your own prose.
- Never invent a scene, quote, sensory detail, person, date, place, interpretation, or lesson.
- Never imitate any named writer. Use an original, restrained, literary editorial voice.
- Avoid generic memoir clichés and AI phrases such as "what feels most alive", "a testament to", "a tapestry", "a reminder that", "in that moment", or "the kind of person I was becoming".
- Titles must be concrete, specific, and normally 3–8 words. Do not use abstract self-help titles.
- Build the title from the memory's central person, place, action, relationship, or an exact meaningful phrase the user supplied. Opening words such as "lately", "recently", "today", "actually", or "sometimes" are context—not subjects.
- A bare place or person name is not enough when the memory contains a distinctive action, phrase, atmosphere, or change. Combine the anchor with that detail: "After the Rain in Cubbon Park", "When Bangalore Felt Like Home", or "What Ria Said". Use a bare name only for a true portrait page with no stronger supplied detail.
- Never generate constructions such as "The Day Lately Was There", "Reflections on This Memory", "A Memory of...", or "The Day I Remember". Use "The Day..." only for a specific event that genuinely happened on one day.
- Before returning a title, verify that every named person, place, and event in it appears in the user's input and that the title still makes sense when read by itself.
- When a named person is central, make that person visible in the title. Prefer simple titles such as "Ria", "What Ria Said", or "Goa with Ria" over a generic emotional headline.
- The reflection must read like a natural sentence that belongs inside the story. Do not write an inspirational slogan, pull quote, moral, or highlighted takeaway.
- The bookDraft must be a genuine sentence-level edit, not a raw transcript copy when the source contains fillers, repeated words or phrases, false starts, run-on sentences, or transcription joins. Remove only those speech artifacts, restore punctuation and sentence boundaries, and preserve the user's vocabulary, language, order of events, uncertainty, and emotional tone. Never add literary imagery the user did not supply.
- A follow-up question must be one short, natural sentence, rooted in a specific detail already shared. Ask only what would materially improve the memory. Do not repeat an earlier question.
- Suggestions are optional follow-up angles the user may choose to answer. Write them as short questions, never as statements or claims about what happened. Every suggestion must repeat one concrete anchor from the memory—a person, place, action, object, exact phrase, or feeling. Generic suggestions such as "What happened next?", "Who was there?", or "What did you notice?" are forbidden whenever a concrete anchor exists. If there is not enough evidence for three genuinely relevant angles, return fewer suggestions—or none—instead of inventing content.
- Before returning a question, silently identify the three most concrete anchors in the user's words. The question must use the strongest anchor; each suggestion must use another anchor or explore a different aspect of the strongest one.
- Chapter placement should use time, place, people, and recurring subject matter. If evidence is weak or multiple trips/events could match, set needsConfirmation to true.
- Choose exactly one of these editorial page layouts: ${editorialLayoutIds.join(", ")}.
- Return only the requested JSON.`;

const questionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["language", "question", "suggestions"],
  properties: {
    language: { type: "string", enum: ["English", "Hindi", "Hinglish", "Mixed"] },
    question: { type: "string" },
    suggestions: {
      type: "array",
      minItems: 0,
      maxItems: 3,
      items: { type: "string" },
    },
  },
} as const;

const pageSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "language",
    "cleanTranscript",
    "bookDraft",
    "title",
    "reflection",
    "placement",
    "layout",
    "signals",
  ],
  properties: {
    language: { type: "string", enum: ["English", "Hindi", "Hinglish", "Mixed"] },
    cleanTranscript: { type: "string" },
    bookDraft: { type: "string" },
    title: { type: "string" },
    reflection: { type: "string" },
    placement: {
      type: "object",
      additionalProperties: false,
      required: ["book", "volume", "chapter", "chapterTitle", "confidence", "reason", "needsConfirmation"],
      properties: {
        book: { type: "string" },
        volume: { type: "string" },
        chapter: { type: "string" },
        chapterTitle: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        reason: { type: "string" },
        needsConfirmation: { type: "boolean" },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      required: ["id", "reason"],
      properties: {
        id: { type: "string", enum: editorialLayoutIds },
        reason: { type: "string" },
      },
    },
    signals: {
      type: "object",
      additionalProperties: false,
      required: ["people", "places", "dates", "themes"],
      properties: {
        people: { type: "array", items: { type: "string" } },
        places: { type: "array", items: { type: "string" } },
        dates: { type: "array", items: { type: "string" } },
        themes: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;

function sanitizeRequest(value: unknown): MemoryEngineRequest | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<MemoryEngineRequest>;
  if (candidate.action !== "question" && candidate.action !== "page") return null;
  if (typeof candidate.memory !== "string") return null;

  return {
    action: candidate.action,
    memory: candidate.memory.slice(0, MAX_MEMORY_LENGTH).trim(),
    answers: Array.isArray(candidate.answers)
      ? candidate.answers.filter((item): item is string => typeof item === "string").slice(0, 3).map((item) => item.slice(0, MAX_ANSWER_LENGTH).trim())
      : [],
    emotions: Array.isArray(candidate.emotions)
      ? candidate.emotions.filter((item): item is string => typeof item === "string").slice(0, 9).map((item) => item.slice(0, 40))
      : [],
    questionIndex: Math.max(0, Math.min(2, Number(candidate.questionIndex) || 0)),
    speechLanguage: candidate.speechLanguage === "en-IN" || candidate.speechLanguage === "hi-IN" ? candidate.speechLanguage : "auto",
    attachment: candidate.attachment && typeof candidate.attachment.name === "string"
      ? {
          name: candidate.attachment.name.slice(0, 240),
          kind: typeof candidate.attachment.kind === "string" ? candidate.attachment.kind.slice(0, 100) : "file",
        }
      : null,
  };
}

function extractOutputText(response: unknown) {
  if (!response || typeof response !== "object") return "";
  const candidate = response as {
    output_text?: string;
    output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof candidate.output_text === "string") return candidate.output_text;
  return candidate.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text" && typeof item.text === "string")
    ?.text ?? "";
}

function extractChatOutputText(response: unknown) {
  if (!response || typeof response !== "object") return "";
  const candidate = response as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };
  const content = candidate.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  return content
    ?.filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("") ?? "";
}

function extractGeminiOutputText(response: unknown) {
  if (!response || typeof response !== "object") return "";
  const candidate = response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  return candidate.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim() ?? "";
}

type AiProvider = "gemini" | "openrouter" | "openai";

type ProviderResult = {
  outputText: string;
  requestId: string | null;
};

async function callGemini(input: string, schema: typeof questionSchema | typeof pageSchema): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_NOT_CONFIGURED");

  const model = process.env.GEMINI_MEMORY_MODEL || "gemini-2.5-flash";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 24_000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: editorInstructions }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: input }],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: "application/json",
            responseJsonSchema: schema,
          },
        }),
        signal: controller.signal,
      },
    );

    const requestId = response.headers.get("x-goog-request-id") ?? response.headers.get("x-request-id");
    if (!response.ok) {
      throw new Error(`GEMINI_${response.status}:${requestId ?? "no-request-id"}`);
    }

    const raw = await response.json();
    return { outputText: extractGeminiOutputText(raw), requestId };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenRouter(input: string, schema: typeof questionSchema | typeof pageSchema, schemaName: string): Promise<ProviderResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_NOT_CONFIGURED");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 24_000);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://lifeonpaper.app",
        "X-Title": "Life on Paper",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MEMORY_MODEL || "openrouter/free",
        messages: [
          { role: "system", content: editorInstructions },
          { role: "user", content: input },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict: true,
            schema,
          },
        },
        provider: {
          require_parameters: true,
          data_collection: "deny",
        },
        temperature: 0.35,
      }),
      signal: controller.signal,
    });

    const requestId = response.headers.get("x-request-id");
    if (!response.ok) {
      throw new Error(`OPENROUTER_${response.status}:${requestId ?? "no-request-id"}`);
    }

    const raw = await response.json();
    return { outputText: extractChatOutputText(raw), requestId };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAi(input: string, schema: typeof questionSchema | typeof pageSchema, schemaName: string): Promise<ProviderResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 24_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MEMORY_MODEL || "gpt-5.6-terra",
        store: false,
        instructions: editorInstructions,
        input,
        reasoning: { effort: "low" },
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema,
          },
        },
      }),
      signal: controller.signal,
    });

    const requestId = response.headers.get("x-request-id");
    if (!response.ok) {
      throw new Error(`OPENAI_${response.status}:${requestId ?? "no-request-id"}`);
    }

    const raw = await response.json();
    return { outputText: extractOutputText(raw), requestId };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
  }

  let body: MemoryEngineRequest | null = null;
  try {
    body = sanitizeRequest(await request.json());
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  if (!body || (!body.memory && !body.attachment?.name)) {
    return NextResponse.json({ error: "INVALID_MEMORY" }, { status: 400 });
  }

  const task = body.action === "question"
    ? `Ask follow-up question ${body.questionIndex + 1} of at most 3. First identify the central named person, place, action, exact words, and feeling. The question and every suggestion must clearly use one of those details. Do not ask a generic sensory or reflective question when a more specific factual question is possible.`
    : "Prepare the finished memoir page and its library placement. Correct speech fragments, filler, repeated words, punctuation, and sentence structure while preserving the user's vocabulary, meaning, order of events, and language. The title must name the central person or place when one exists.";
  const input = JSON.stringify({
    task,
    originalMemory: body.memory,
    followUpAnswers: body.answers,
    selectedEmotions: body.emotions,
    speechLanguagePreference: body.speechLanguage,
    attachment: body.attachment,
  });

  const schema = body.action === "question" ? questionSchema : pageSchema;
  const schemaName = body.action === "question" ? "memory_follow_up" : "memory_page";
  const configuredProvider = process.env.AI_MEMORY_PROVIDER?.toLowerCase();
  const providers: AiProvider[] = configuredProvider === "openai"
    ? ["openai", "gemini", "openrouter"]
    : configuredProvider === "openrouter"
      ? ["openrouter", "gemini", "openai"]
      : ["gemini", "openrouter", "openai"];

  let lastRequestId: string | null = null;
  for (const provider of providers) {
    if (provider === "gemini" && !process.env.GEMINI_API_KEY) continue;
    if (provider === "openrouter" && !process.env.OPENROUTER_API_KEY) continue;
    if (provider === "openai" && !process.env.OPENAI_API_KEY) continue;

    try {
      const response = provider === "gemini"
        ? await callGemini(input, schema)
        : provider === "openrouter"
          ? await callOpenRouter(input, schema, schemaName)
          : await callOpenAi(input, schema, schemaName);
      lastRequestId = response.requestId;
      if (!response.outputText) throw new Error(`${provider.toUpperCase()}_EMPTY_RESPONSE`);

      const parsed = JSON.parse(response.outputText) as Omit<MemoryEngineResult, "source">;
      const result = body.action === "question" && "question" in parsed && "suggestions" in parsed
        ? guardQuestionResult(parsed as Omit<MemoryQuestionResult, "source">, body.memory, body.answers, body.emotions, body.questionIndex)
        : body.action === "page" && "bookDraft" in parsed && "placement" in parsed
          ? guardPageResult(parsed as Omit<MemoryPageResult, "source">, body.memory, body.answers, body.emotions)
          : null;
      if (!result) throw new Error(`${provider.toUpperCase()}_INVALID_SHAPE`);
      return NextResponse.json({ ...result, source: "ai" } as MemoryEngineResult);
    } catch (error) {
      console.error(
        `Memory engine ${provider} attempt failed`,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  return NextResponse.json({ error: "AI_UNAVAILABLE", requestId: lastRequestId }, { status: 502 });
}
