"use client";

import { SpeakerHigh, Trash } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { formatDuration, getKeepsakeBlob, type Keepsake } from "@/components/system/keepsakes";

/**
 * Plays a keepsake back from its original recording, loaded out of IndexedDB
 * only when the user actually presses play (so a page with several recordings
 * does not pull megabytes of audio on load).
 */
export function KeepsakePlayer({
  keepsake,
  onDelete,
}: {
  keepsake: Keepsake;
  onDelete?: (id: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const play = async () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    let source = url;
    if (!source) {
      const blob = await getKeepsakeBlob(keepsake.id);
      if (!blob) {
        setMissing(true);
        return;
      }
      source = URL.createObjectURL(blob);
      setUrl(source);
    }
    const el = audioRef.current;
    if (!el) return;
    el.src = source;
    try {
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <div className="keepsake">
      <button
        type="button"
        className={playing ? "keepsake__play keepsake__play--on" : "keepsake__play"}
        onClick={play}
        aria-label={playing ? "Pause this recording" : "Play this recording"}
        aria-pressed={playing}
      >
        <SpeakerHigh size={17} weight={playing ? "fill" : "regular"} aria-hidden="true" />
      </button>
      <span className="keepsake__copy">
        <strong>{keepsake.label ?? (keepsake.kind === "sound" ? "A sound I kept" : "I spoke this")}</strong>
        <small>{missing ? "This recording is no longer on this device" : formatDuration(keepsake.durationMs)}</small>
      </span>
      {onDelete ? (
        <button type="button" className="keepsake__delete" onClick={() => onDelete(keepsake.id)} aria-label="Remove this recording">
          <Trash size={14} weight="regular" aria-hidden="true" />
        </button>
      ) : null}
      <audio
        ref={audioRef}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        preload="none"
      />
    </div>
  );
}
