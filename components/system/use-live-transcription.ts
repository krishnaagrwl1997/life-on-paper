"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type RecognitionEvent = {
  results: { length: number; [index: number]: RecognitionResult };
};

type RecognitionErrorEvent = { error?: string };

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export type LiveTranscriptionLanguage = "auto" | "en-IN" | "hi-IN";

function recognitionTag(language: string) {
  // "auto" is not a valid BCP-47 tag; en-IN handles Hinglish best.
  return language.includes("hi") ? "hi-IN" : "en-IN";
}

// Browsers don't punctuate dictation, so people say it out loud.
const SPOKEN_MARKS: Array<[RegExp, string]> = [
  [/\s*\b(?:new|next) paragraph\b\s*/gi, "\n\n"],
  [/\s*\b(?:new|next) line\b\s*/gi, "\n"],
  [/\s*\bfull stop\b/gi, "."],
  [/\s*\bcomma\b/gi, ","],
  [/\s*\bquestion mark\b/gi, "?"],
  [/\s*\bexclamation (?:mark|point)\b/gi, "!"],
  [/\s*पूर्ण विराम/g, "।"],
  [/\s*प्रश्न चिह्न/g, "?"],
];

export function applySpokenMarks(text: string) {
  return SPOKEN_MARKS.reduce((out, [pattern, mark]) => out.replace(pattern, mark), text);
}

function endsSentence(text: string) {
  return !text.trim() || /[.!?।]\s*$/.test(text) || /\n\s*$/.test(text);
}

function capitaliseSentences(text: string, startsSentence: boolean) {
  const opened = startsSentence ? text.replace(/^(\s*)(\p{Ll})/u, (_, gap: string, letter: string) => gap + letter.toUpperCase()) : text;
  return opened.replace(/([.!?]\s+|\n\s*)(\p{Ll})/gu, (_, gap: string, letter: string) => gap + letter.toUpperCase());
}

/** Joins what was already written with newly spoken words, spacing them like prose. */
export function joinSpeech(before: string, spoken: string) {
  const said = spoken.replace(/[ \t]+/g, " ").replace(/^ /, "");
  if (!said.trim()) return before;
  if (!before.trim()) return said.replace(/^\s+/, "");
  if (/^[.,?!।\n]/.test(said) || /\n$/.test(before)) return before.replace(/[ \t]+$/, "") + said;
  return before.replace(/[ \t]+$/, "") + " " + said;
}

export function composeSpeech(base: string, heard: string) {
  return joinSpeech(base, capitaliseSentences(applySpokenMarks(heard), endsSentence(base)));
}

/** Stop listening after this long without hearing a word, so the mic isn't left on. */
const IDLE_STOP_MS = 60_000;

/**
 * Live dictation that writes into an existing text.
 *
 * The Web Speech API ends its session on every pause. We restart it quietly
 * and keep `isListening` true throughout, so the interface stays steady
 * instead of flickering off and on between sentences. What was written
 * before, plus everything heard since, is rebuilt into one value on every
 * event, so nothing is overwritten or lost. If the person types while
 * dictating, their edit becomes the new starting point.
 */
export function useLiveTranscription({
  value,
  onChange,
  onError,
  language = "en-IN",
}: {
  value: string;
  onChange: (value: string) => void;
  onError?: (message: string) => void;
  language?: LiveTranscriptionLanguage | string;
}) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const isSupported = typeof window === "undefined" ? true : Boolean(recognitionConstructor());
  const recognitionRef = useRef<Recognition | null>(null);
  const shouldListenRef = useRef(false);
  const baseTextRef = useRef("");        // written before this stretch of speech
  const heardRef = useRef("");           // heard this session, not yet in the base
  const skipResultsRef = useRef(0);      // results already absorbed into the base
  const seenResultsRef = useRef(0);      // results the session has reported so far
  const lastComposedRef = useRef("");    // what we last wrote into the field
  const languageRef = useRef(language);
  const idleTimerRef = useRef<number | null>(null);
  const retriesRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onChangeRef.current = onChange;
    onErrorRef.current = onError;
  });

  const clearIdle = () => {
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  };

  const publish = (composed: string) => {
    if (composed === lastComposedRef.current) return;
    lastComposedRef.current = composed;
    onChangeRef.current(composed);
  };

  const finish = useCallback((message?: string) => {
    shouldListenRef.current = false;
    clearIdle();
    const composed = composeSpeech(baseTextRef.current, heardRef.current);
    publish(composed);
    baseTextRef.current = composed;
    heardRef.current = "";
    setIsListening(false);
    setInterimTranscript("");
    if (message) onErrorRef.current?.(message);
    return composed;
  }, []);

  const armIdle = useCallback(() => {
    clearIdle();
    idleTimerRef.current = window.setTimeout(() => {
      recognitionRef.current?.stop();
      finish("Paused after a quiet minute. Tap Speak to carry on.");
    }, IDLE_STOP_MS);
  }, [finish]);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      clearIdle();
      recognitionRef.current?.abort();
    };
  }, []);

  // The person typed or edited while dictating: their text becomes the new
  // base, and words already heard are not added a second time.
  useEffect(() => {
    if (!shouldListenRef.current || value === lastComposedRef.current) return;
    baseTextRef.current = value;
    lastComposedRef.current = value;
    heardRef.current = "";
    skipResultsRef.current = seenResultsRef.current;
  }, [value]);

  // Switching language mid-sentence: end this stretch, and the quiet restart
  // picks up the new language.
  useEffect(() => {
    languageRef.current = language;
    if (shouldListenRef.current) recognitionRef.current?.stop();
  }, [language]);

  const stop = useCallback(() => {
    if (!shouldListenRef.current) return null;
    recognitionRef.current?.stop();
    // Keep anything spoken but not yet finalised — never drop words.
    return finish();
  }, [finish]);

  const start = useCallback(() => {
    const RecognitionApi = recognitionConstructor();
    if (!RecognitionApi) {
      onErrorRef.current?.("Live dictation is not available in this browser. You can still type your lines.");
      return;
    }

    shouldListenRef.current = false;
    recognitionRef.current?.abort();
    shouldListenRef.current = true;
    retriesRef.current = 0;

    baseTextRef.current = value;
    lastComposedRef.current = value;
    heardRef.current = "";
    skipResultsRef.current = 0;
    seenResultsRef.current = 0;
    setIsListening(true);
    armIdle();

    const recognition = new RecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = recognitionTag(languageRef.current);

    recognition.onstart = () => {
      retriesRef.current = 0;
    };

    recognition.onresult = (event) => {
      if (!shouldListenRef.current) return;
      seenResultsRef.current = event.results.length;
      let heard = "";
      let interim = "";
      for (let index = skipResultsRef.current; index < event.results.length; index += 1) {
        const result = event.results[index];
        heard += " " + result[0].transcript;
        if (!result.isFinal) interim += " " + result[0].transcript;
      }
      heardRef.current = heard.trim();
      setInterimTranscript(interim.trim());
      armIdle();
      publish(composeSpeech(baseTextRef.current, heardRef.current));
    };

    recognition.onerror = (event) => {
      const error = event.error ?? "";
      if (error === "not-allowed" || error === "service-not-allowed") {
        finish("Microphone access is off. Allow it in your browser, or keep typing.");
      } else if (error === "audio-capture") {
        finish("No microphone was found. You can keep typing.");
      } else if (error === "network") {
        retriesRef.current += 1;
        if (retriesRef.current > 3) finish("Dictation needs a connection. Your words are still here.");
      }
      // "no-speech" and "aborted" are just pauses — keep listening quietly.
    };

    recognition.onend = () => {
      // Fold this stretch into the base so the next session carries on from it.
      baseTextRef.current = composeSpeech(baseTextRef.current, heardRef.current);
      publish(baseTextRef.current);
      heardRef.current = "";
      skipResultsRef.current = 0;
      seenResultsRef.current = 0;
      setInterimTranscript("");
      if (!shouldListenRef.current) return;
      recognition.lang = recognitionTag(languageRef.current);
      try {
        recognition.start();
      } catch {
        window.setTimeout(() => {
          if (!shouldListenRef.current) return;
          try {
            recognition.start();
          } catch {
            finish("Dictation paused. Your words are still here — tap Speak to carry on.");
          }
        }, 250);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      finish("The microphone is busy. Give it a moment, then tap Speak again.");
    }
  }, [armIdle, finish, value]);

  return { interimTranscript, isListening, isSupported, start, stop };
}
