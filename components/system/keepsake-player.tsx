"use client";

import { Pause, Play, Trash } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
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
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(keepsake.durationMs);
  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

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
    if (el.src !== source) el.src = source;
    if (el.ended) el.currentTime = 0;
    try {
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const seek = (event: PointerEvent<HTMLSpanElement>) => {
    const el = audioRef.current;
    if (!el || !el.src || !durationMs) return;
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    el.currentTime = (ratio * durationMs) / 1000;
    setPositionMs(ratio * durationMs);
  };

  return (
    <div className={playing ? "keepsake keepsake--playing" : "keepsake"}>
      <button
        type="button"
        className={playing ? "keepsake__play keepsake__play--on" : "keepsake__play"}
        onClick={play}
        aria-label={playing ? "Pause this recording" : "Play this recording"}
        aria-pressed={playing}
      >
        {playing ? <Pause size={16} weight="fill" aria-hidden="true" /> : <Play size={16} weight="fill" aria-hidden="true" />}
      </button>
      <span className="keepsake__copy">
        <strong>{keepsake.label ?? (keepsake.kind === "sound" ? "A sound I kept" : "I spoke this")}</strong>
        {missing ? (
          <small>This recording is no longer on this device</small>
        ) : (
          <span className="keepsake__track">
            <span className="keepsake__bar" onPointerDown={seek} aria-hidden="true">
              <span style={{ width: `${progress * 100}%` }} />
            </span>
            <small>
              {positionMs > 0 ? `${formatDuration(positionMs)} / ` : ""}
              {formatDuration(durationMs)}
            </small>
          </span>
        )}
      </span>
      {onDelete ? (
        <button type="button" className="keepsake__delete" onClick={() => onDelete(keepsake.id)} aria-label="Remove this recording">
          <Trash size={14} weight="regular" aria-hidden="true" />
        </button>
      ) : null}
      <audio
        ref={audioRef}
        onEnded={() => {
          setPlaying(false);
          setPositionMs(0);
        }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setPositionMs(event.currentTarget.currentTime * 1000)}
        onLoadedMetadata={(event) => {
          const seconds = event.currentTarget.duration;
          if (Number.isFinite(seconds) && seconds > 0) setDurationMs(seconds * 1000);
        }}
        preload="none"
      />
    </div>
  );
}
