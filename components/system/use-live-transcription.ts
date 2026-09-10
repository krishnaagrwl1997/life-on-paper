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

function joinParts(...parts: Array<string | undefined>) {
  return parts.map((part) => (part ?? "").trim()).filter(Boolean).join(" ");
}

export type LiveTranscriptionLanguage = "auto" | "en-IN" | "hi-IN";

/**
 * Live dictation that appends safely.
 *
 * The Web Speech API ends the session on every pause; we restart it, and the
 * tricky part is keeping what was already said. We therefore track the text
 * committed before the session, the finals of the current session, and the
 * live interim — and rebuild the composed value from all three on every event,
 * so nothing is ever overwritten or lost.
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
  const baseTextRef = useRef("");        // committed before this session
  const finalsRef = useRef("");          // finals of the current session
  const interimRef = useRef("");         // live interim of the current session
  const lastComposedRef = useRef("");    // what we last showed

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    // Keep anything spoken but not yet finalised — never drop words.
    const composed = joinParts(baseTextRef.current, finalsRef.current, interimRef.current);
    if (composed && composed !== lastComposedRef.current) {
      lastComposedRef.current = composed;
      onChange(composed);
    }
    setIsListening(false);
    setInterimTranscript("");
    interimRef.current = "";
  }, [onChange]);

  const start = useCallback(() => {
    const RecognitionApi = recognitionConstructor();
    if (!RecognitionApi) {
      onError?.("Live dictation is not available in this browser. You can still type your lines.");
      return;
    }

    shouldListenRef.current = false;
    recognitionRef.current?.abort();
    shouldListenRef.current = true;

    baseTextRef.current = value.trim();
    finalsRef.current = "";
    interimRef.current = "";
    lastComposedRef.current = baseTextRef.current;

    const recognition = new RecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    // "auto" is not a valid BCP-47 tag; en-IN handles Hinglish best.
    const tag = language && language !== "auto" ? language : "en-IN";
    recognition.lang = tag.includes("hi") ? "hi-IN" : "en-IN";
    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      finalsRef.current = finalText.trim();
      interimRef.current = interimText.trim();
      setInterimTranscript(interimRef.current);
      const composed = joinParts(baseTextRef.current, finalsRef.current, interimRef.current);
      lastComposedRef.current = composed;
      onChange(composed);
    };

    recognition.onerror = (event) => {
      const fatal = event.error === "not-allowed" || event.error === "service-not-allowed";
      if (fatal) shouldListenRef.current = false;
      const message = fatal
        ? "Microphone access is off. Allow it in your browser, or keep typing."
        : event.error === "no-speech"
          ? "I didn’t hear anything yet. Tap the microphone when you’re ready."
          : "Dictation paused. Your words are still here, and you can keep typing.";
      onError?.(message);
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      // Carry the composed value into the next session so a pause never loses words.
      baseTextRef.current = lastComposedRef.current;
      finalsRef.current = "";
      interimRef.current = "";
      if (!shouldListenRef.current) return;
      window.setTimeout(() => {
        if (!shouldListenRef.current) return;
        try {
          recognition.start();
        } catch {
          shouldListenRef.current = false;
        }
      }, 180);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      onError?.("The microphone is already starting. Give it a moment, then speak naturally.");
    }
  }, [language, onChange, onError, value]);

  return { interimTranscript, isListening, isSupported, start, stop };
}
