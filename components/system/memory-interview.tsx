"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  FileText,
  ImageSquare,
  Microphone,
  Paperclip,
  Pause,
  PencilSimple,
  Sparkle,
  Stop,
} from "@phosphor-icons/react";

export type CaptureMode = "Write" | "Voice" | "Photo" | "Screenshot" | "File";

type Phase = "capture" | "interview" | "summary";

const paperEase = [0.22, 0.72, 0.26, 1] as const;

const captureModes = [
  { label: "Write" as const, icon: PencilSimple, note: "Start in your own words" },
  { label: "Voice" as const, icon: Microphone, note: "Speak naturally" },
  { label: "Photo" as const, icon: Camera, note: "Share a photograph" },
  { label: "Screenshot" as const, icon: ImageSquare, note: "Keep what you saw" },
  { label: "File" as const, icon: Paperclip, note: "Bring in a document" },
];

const questions = [
  "Take me to the exact moment. Where were you, and what was happening just before it?",
  "What did you notice in yourself that you might have missed at the time?",
  "Years from now, what would you want this moment to remind you of?",
];

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function MemoryInterview({
  initialMemory = "",
  initialMode = "Write",
  onBack,
}: {
  initialMemory?: string;
  initialMode?: CaptureMode;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(initialMemory.trim() ? "interview" : "capture");
  const [mode, setMode] = useState<CaptureMode>(initialMode);
  const [memory, setMemory] = useState(initialMemory);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<{ name: string; preview?: string; kind: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
    };
  }, [attachment]);

  const selectMode = (nextMode: CaptureMode) => {
    setMode(nextMode);
    setNotice(null);
    setRecorded(false);
    setRecordingSeconds(0);
    setIsRecording(false);
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
    setAttachment(null);
  };

  const chooseFile = () => fileRef.current?.click();

  const acceptForMode = mode === "Photo"
    ? "image/*"
    : mode === "Screenshot"
      ? "image/png,image/jpeg,image/webp"
      : ".pdf,.doc,.docx,.txt,.rtf,image/*,audio/*";

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    setAttachment({ name: file.name, preview, kind: file.type || "Document" });
    if (!memory.trim()) setMemory(`${mode} shared: ${file.name}`);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setRecorded(true);
    if (!memory.trim()) setMemory(`Voice memory recorded for ${formatTime(Math.max(recordingSeconds, 1))}.`);
  };

  const canContinue = memory.trim().length > 0 || Boolean(attachment) || recorded;

  const startInterview = () => {
    if (!canContinue) {
      setNotice(mode === "Write" ? "Begin with one detail. A sentence is enough." : `Add a ${mode.toLowerCase()} before continuing.`);
      return;
    }
    setNotice(null);
    setPhase("interview");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const keepAnswer = () => {
    if (!answer.trim()) {
      setNotice("Answer in your own words, or choose “I’ve said enough.”");
      return;
    }
    const nextAnswers = [...answers, answer.trim()];
    setAnswers(nextAnswers);
    setAnswer("");
    setNotice(null);
    if (questionIndex === questions.length - 1) {
      setPhase("summary");
    } else {
      setQuestionIndex((index) => index + 1);
    }
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const finishEarly = () => {
    const nextAnswers = answer.trim() ? [...answers, answer.trim()] : answers;
    setAnswers(nextAnswers);
    setAnswer("");
    setNotice(null);
    setPhase("summary");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const editInterview = () => {
    setSaved(false);
    setPhase("interview");
    setQuestionIndex(Math.max(0, Math.min(answers.length, questions.length - 1)));
    setAnswer("");
  };

  return (
    <div className="memory-desk">
      <header className="memory-header">
        <button type="button" className="memory-back" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          Home
        </button>
        <div className="memory-brand">
          <p>Life In Books</p>
          <span>New memory</span>
        </div>
        <span className="memory-folio">13 · 07 · 26</span>
      </header>

      <InterviewProgress phase={phase} />

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
              <p className="memory-eyebrow">First, the raw material</p>
              <h1 id="capture-title">Begin with what happened.</h1>
              <p>Don&apos;t make it beautiful yet. Speak, type, or share whatever helps you remember.</p>
            </div>

            <div className="capture-workspace">
              <div className="capture-methods" aria-label="Choose a memory format">
                {captureModes.map(({ label, icon: Icon, note }) => (
                  <button
                    key={label}
                    type="button"
                    className={mode === label ? "capture-method capture-method--active" : "capture-method"}
                    aria-pressed={mode === label}
                    onClick={() => selectMode(label)}
                  >
                    <Icon size={23} weight={mode === label ? "fill" : "regular"} aria-hidden="true" />
                    <strong>{label}</strong>
                    <span>{note}</span>
                  </button>
                ))}
              </div>

              <div className="capture-sheet">
                <CaptureSurface
                  mode={mode}
                  memory={memory}
                  setMemory={setMemory}
                  attachment={attachment}
                  chooseFile={chooseFile}
                  isRecording={isRecording}
                  recorded={recorded}
                  recordingSeconds={recordingSeconds}
                  startRecording={() => {
                    setRecordingSeconds(0);
                    setRecorded(false);
                    setIsRecording(true);
                  }}
                  stopRecording={stopRecording}
                />

                <input ref={fileRef} className="sr-only" type="file" accept={acceptForMode} onChange={handleFile} />
                <div className="capture-sheet-footer">
                  <p>Your original stays attached to this memory.</p>
                  <button type="button" className="interview-primary" onClick={startInterview}>
                    Continue to interview
                    <ArrowRight size={18} weight="bold" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        ) : null}

        {phase === "interview" ? (
          <motion.section
            key={`interview-${questionIndex}`}
            className="memory-phase interview-phase"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18, rotate: reduceMotion ? 0 : -0.25 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
            aria-labelledby="interview-question"
          >
            <div className="interview-margin-note">
              <p>What you shared</p>
              <blockquote>{memory || attachment?.name}</blockquote>
              {attachment?.preview ? (
                <div className="interview-thumb">
                  <Image src={attachment.preview} alt="Attached memory preview" fill unoptimized sizes="160px" />
                </div>
              ) : null}
              <span>{mode} · Original kept</span>
            </div>

            <article className="interview-page">
              <div className="question-count">
                <span>Documentary interview</span>
                <span>Question {questionIndex + 1} of up to 3</span>
              </div>
              <div className="interviewer-mark"><Sparkle size={18} weight="fill" aria-hidden="true" /></div>
              <h1 id="interview-question">{questions[questionIndex]}</h1>
              <label htmlFor="interview-answer">Answer as if you were telling someone who knows you well.</label>
              <textarea
                id="interview-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="I remember…"
                rows={6}
                autoFocus
              />
              <div className="interview-page-footer">
                <button type="button" className="quiet-action" onClick={finishEarly}>I&apos;ve said enough</button>
                <button type="button" className="interview-primary" onClick={keepAnswer}>
                  {questionIndex === questions.length - 1 ? "Show what you heard" : "Keep this answer"}
                  <ArrowRight size={18} weight="bold" aria-hidden="true" />
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
              <p className="memory-eyebrow">The interview, gathered</p>
              <h1 id="summary-title">Here&apos;s what I heard.</h1>
              <p>This is not the finished page. It&apos;s the truth of the memory, kept in your language.</p>
            </div>

            <article className="summary-manuscript">
              <header>
                <span>Memory · 13 July 2026</span>
                <span>{answers.length} follow-up{answers.length === 1 ? "" : "s"}</span>
              </header>
              <p className="summary-opening">{memory || attachment?.name}</p>
              {answers.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}
              <div className="summary-rule"><span>End of interview</span></div>
            </article>

            <aside className={saved ? "placement-note placement-note--saved" : "placement-note"}>
              {saved ? <Check size={21} weight="bold" aria-hidden="true" /> : <FileText size={21} aria-hidden="true" />}
              <div>
                <strong>{saved ? "Memory kept" : "Nothing has been placed yet"}</strong>
                <p>{saved ? "It is ready for chapter placement—the next milestone." : "You'll choose its book and chapter in the next step we build."}</p>
              </div>
            </aside>

            <div className="summary-actions">
              <button type="button" className="quiet-action" onClick={editInterview}>Return to interview</button>
              <button type="button" className="interview-primary" onClick={() => setSaved(true)} disabled={saved}>
                {saved ? "Memory kept" : "Keep this memory"}
                {saved ? <Check size={18} weight="bold" aria-hidden="true" /> : <ArrowRight size={18} weight="bold" aria-hidden="true" />}
              </button>
            </div>
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

function InterviewProgress({ phase }: { phase: Phase }) {
  const phases: Array<{ id: Phase; number: string; label: string }> = [
    { id: "capture", number: "I", label: "Capture" },
    { id: "interview", number: "II", label: "Interview" },
    { id: "summary", number: "III", label: "What I heard" },
  ];
  const current = phases.findIndex((item) => item.id === phase);

  return (
    <ol className="interview-progress" aria-label="Memory interview progress">
      {phases.map((item, index) => (
        <li key={item.id} className={index === current ? "interview-progress--active" : index < current ? "interview-progress--complete" : ""}>
          <span>{index < current ? <Check size={13} weight="bold" aria-hidden="true" /> : item.number}</span>
          <strong>{item.label}</strong>
        </li>
      ))}
    </ol>
  );
}

function CaptureSurface({
  mode,
  memory,
  setMemory,
  attachment,
  chooseFile,
  isRecording,
  recorded,
  recordingSeconds,
  startRecording,
  stopRecording,
}: {
  mode: CaptureMode;
  memory: string;
  setMemory: (value: string) => void;
  attachment: { name: string; preview?: string; kind: string } | null;
  chooseFile: () => void;
  isRecording: boolean;
  recorded: boolean;
  recordingSeconds: number;
  startRecording: () => void;
  stopRecording: () => void;
}) {
  if (mode === "Write") {
    return (
      <div className="write-surface">
        <label htmlFor="new-memory-text">Tell me what happened</label>
        <textarea
          id="new-memory-text"
          value={memory}
          onChange={(event) => setMemory(event.target.value)}
          placeholder="Today, someone appreciated me for something small…"
          rows={8}
          autoFocus
        />
      </div>
    );
  }

  if (mode === "Voice") {
    return (
      <div className={isRecording ? "voice-surface voice-surface--recording" : "voice-surface"}>
        <div className="voice-symbol">
          {isRecording ? <Pause size={30} weight="fill" aria-hidden="true" /> : <Microphone size={30} weight="fill" aria-hidden="true" />}
        </div>
        <p>{isRecording ? "Listening to your memory" : recorded ? "Your voice memory is ready" : "Speak as naturally as you would to a friend."}</p>
        <strong>{formatTime(recordingSeconds)}</strong>
        <button type="button" onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? <Stop size={16} weight="fill" aria-hidden="true" /> : <Microphone size={16} weight="fill" aria-hidden="true" />}
          {isRecording ? "Stop recording" : recorded ? "Record again" : "Start recording"}
        </button>
      </div>
    );
  }

  return (
    <div className="upload-surface">
      {attachment?.preview ? (
        <div className="upload-preview"><Image src={attachment.preview} alt="Selected memory" fill unoptimized sizes="460px" /></div>
      ) : (
        <div className="upload-symbol">
          {mode === "File" ? <FileText size={36} aria-hidden="true" /> : mode === "Screenshot" ? <ImageSquare size={36} aria-hidden="true" /> : <Camera size={36} aria-hidden="true" />}
        </div>
      )}
      <div>
        <p>{attachment ? attachment.name : mode === "Photo" ? "Choose a photograph that brings the moment back." : mode === "Screenshot" ? "Add the screenshot exactly as you received it." : "Bring in a note, document, image, or audio file."}</p>
        {attachment ? <span>{attachment.kind}</span> : null}
      </div>
      <button type="button" onClick={chooseFile}>{attachment ? "Choose another" : `Choose ${mode.toLowerCase()}`}</button>
    </div>
  );
}
