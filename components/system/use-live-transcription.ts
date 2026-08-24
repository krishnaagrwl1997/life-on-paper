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

export function useLiveTranscription({
  value,
  onChange,
  onError,
  language,
}: {
  value: string;
  onChange: (value: string) => void;
  onError?: (message: string) => void;
  language?: string;
}) {
  const [isListening, setIsListening] = useState(false);
  const isSupported = typeof window === "undefined" ? true : Boolean(recognitionConstructor());
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  const baseTextRef = useRef("");
  const shouldListenRef = useRef(false);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const start = useCallback(() => {
    const RecognitionApi = recognitionConstructor();
    if (!RecognitionApi) {
      onError?.("Live transcription is not available in this browser. You can still type your memory.");
      return;
    }

    shouldListenRef.current = false;
    recognitionRef.current?.abort();
    shouldListenRef.current = true;
    baseTextRef.current = value.trim();
    const recognition = new RecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    if (language) recognition.lang = language;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      setInterimTranscript(interimText.trim());
      const spokenText = `${finalText}${interimText}`.trim();
      onChange([baseTextRef.current, spokenText].filter(Boolean).join(baseTextRef.current && spokenText ? " " : ""));
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") shouldListenRef.current = false;
      const message = event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microphone access is off. Allow it in your browser, or keep typing."
        : event.error === "no-speech"
          ? "I didn’t hear anything yet. Tap the microphone when you’re ready."
          : "Live transcription paused. Your words are still here, and you can keep typing.";
      onError?.(message);
      setIsListening(false);
      setInterimTranscript("");
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      if (shouldListenRef.current) {
        window.setTimeout(() => {
          if (!shouldListenRef.current) return;
          try {
            recognition.start();
          } catch {
            shouldListenRef.current = false;
          }
        }, 180);
      }
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
