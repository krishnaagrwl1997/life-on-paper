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
}: {
  value: string;
  onChange: (value: string) => void;
  onError?: (message: string) => void;
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  const baseTextRef = useRef("");

  useEffect(() => {
    setIsSupported(Boolean(recognitionConstructor()));
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const start = useCallback(() => {
    const RecognitionApi = recognitionConstructor();
    if (!RecognitionApi) {
      setIsSupported(false);
      onError?.("Live transcription is not available in this browser. You can still type your memory.");
      return;
    }

    recognitionRef.current?.abort();
    baseTextRef.current = value.trim();
    const recognition = new RecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
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
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      onError?.("The microphone is already starting. Give it a moment, then speak naturally.");
    }
  }, [onChange, onError, value]);

  return { interimTranscript, isListening, isSupported, start, stop };
}
