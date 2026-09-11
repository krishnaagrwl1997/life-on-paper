"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { keepsakesSupported, saveKeepsake, type Keepsake } from "@/components/system/keepsakes";

/**
 * Records the sound of a moment (not a transcription) and stores it as a
 * keepsake. Independent of dictation: dictation turns speech into words, this
 * keeps the audio itself — laughter, a voice, rain.
 */
export function useKeepsakeRecorder({
  onSaved,
  onError,
}: {
  onSaved: (keepsake: Keepsake) => void;
  onError?: (message: string) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setIsRecording(false);
      return;
    }
    recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (!keepsakesSupported()) {
      onError?.("Recording isn't available in this browser. Your words are still kept.");
      return;
    }
    if (recorderRef.current) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError?.("Microphone access is off. Allow it in your browser to keep a sound.");
      return;
    }

    const mimeType = ["audio/webm", "audio/mp4", "audio/ogg"].find((type) =>
      typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type),
    );
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    streamRef.current = stream;
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setElapsedMs(0);

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onerror = () => {
      onError?.("The recording stopped unexpectedly. Nothing else was lost.");
      setIsRecording(false);
      cleanup();
    };
    recorder.onstop = () => {
      const durationMs = Date.now() - startedAtRef.current;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      chunksRef.current = [];
      setIsRecording(false);
      cleanup();
      if (!blob.size) {
        onError?.("That recording came out empty. Try once more.");
        return;
      }
      void saveKeepsake(blob, { durationMs, kind: "sound" })
        .then(onSaved)
        .catch(() => onError?.("That recording could not be saved on this device."));
    };

    recorder.start();
    setIsRecording(true);
    timerRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 200);
  }, [cleanup, onError, onSaved]);

  return { isRecording, elapsedMs, start, stop };
}
