"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookmarkSimple,
  Books,
  Camera,
  Check,
  FileText,
  ImageSquare,
  Microphone,
  Paperclip,
  Pause,
  PencilSimple,
  Plus,
  Sparkle,
  Stop,
} from "@phosphor-icons/react";

export type CaptureMode = "Write" | "Voice" | "Photo" | "Screenshot" | "File";

type Phase = "capture" | "interview" | "summary" | "placement";
type PlacementMode = "proposal" | "change" | "create" | "placed";

type ChapterPlacement = {
  id: string;
  book: string;
  volume: string;
  chapter: string;
  title: string;
  reason: string;
};

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

const chapterOptions: ChapterPlacement[] = [
  {
    id: "trust",
    book: "Book One",
    volume: "Volume II · Becoming",
    chapter: "Chapter Four",
    title: "Becoming Someone I Trust",
    reason: "This moment reveals a quality you were still learning to recognize in yourself.",
  },
  {
    id: "seen",
    book: "Book One",
    volume: "Volume I · Origins",
    chapter: "Chapter Three",
    title: "The People Who Saw Me",
    reason: "This memory is shaped by the way another person noticed and named something true in you.",
  },
  {
    id: "little-things",
    book: "Book One",
    volume: "Volume II · Becoming",
    chapter: "Chapter Six",
    title: "Small Things I Carry Forward",
    reason: "A small exchange became a lesson worth carrying into the person you are becoming.",
  },
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
  const [placementMode, setPlacementMode] = useState<PlacementMode>("proposal");
  const [placement, setPlacement] = useState<ChapterPlacement>(chapterOptions[0]);
  const [newChapterTitle, setNewChapterTitle] = useState("");
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

  const openPlacement = () => {
    setPlacementMode("proposal");
    setPhase("placement");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const choosePlacement = (choice: ChapterPlacement) => {
    setPlacement(choice);
    setPlacementMode("proposal");
    setNotice(null);
  };

  const createChapter = () => {
    const title = newChapterTitle.trim();
    if (!title) {
      setNotice("Give the new chapter a title first.");
      return;
    }
    setPlacement({
      id: `new-${title}`,
      book: "Book One",
      volume: "Volume II · Becoming",
      chapter: "New chapter",
      title,
      reason: "You created this chapter because this memory begins a thread that deserves its own place.",
    });
    setPlacementMode("proposal");
    setNotice(null);
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
              <button type="button" className="interview-primary" onClick={saved ? openPlacement : () => setSaved(true)}>
                {saved ? "Find its chapter" : "Keep this memory"}
                {saved ? <Books size={18} weight="bold" aria-hidden="true" /> : <ArrowRight size={18} weight="bold" aria-hidden="true" />}
              </button>
            </div>
          </motion.section>
        ) : null}

        {phase === "placement" ? (
          <motion.section
            key={`placement-${placementMode}`}
            className="memory-phase placement-phase"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
            aria-labelledby="placement-title"
          >
            {placementMode === "placed" ? (
              <div className="placement-confirmation">
                <div className="placement-seal"><BookmarkSimple size={25} weight="fill" aria-hidden="true" /></div>
                <p className="memory-eyebrow">Placed with care</p>
                <h1 id="placement-title">Your memory has found its chapter.</h1>
                <div className="placed-path">
                  <span>{placement.book}</span>
                  <span>{placement.volume}</span>
                  <span>{placement.chapter}</span>
                  <strong>{placement.title}</strong>
                </div>
                <p className="placement-stop-note">The memory is placed, but no page has been designed yet. That comes in the next milestone.</p>
                <button type="button" className="quiet-action" onClick={() => setPlacementMode("proposal")}>Reconsider placement</button>
              </div>
            ) : (
              <>
                <div className="placement-heading">
                  <p className="memory-eyebrow">A place in your story</p>
                  <h1 id="placement-title">This memory belongs here.</h1>
                  <p>I found the strongest thread in what you shared. You can keep this home or choose another.</p>
                </div>

                <div className="placement-workspace">
                  <article className="chapter-proposal">
                    <header>
                      <span>Suggested home</span>
                      <span>Arranged from your interview</span>
                    </header>
                    <div className="chapter-hierarchy">
                      <div><span>Book</span><strong>{placement.book}</strong></div>
                      <div><span>Volume</span><strong>{placement.volume}</strong></div>
                      <div className="chapter-hierarchy-main"><span>{placement.chapter}</span><h2>{placement.title}</h2></div>
                    </div>
                    <footer><BookmarkSimple size={17} weight="fill" aria-hidden="true" /><span>One memory ready to place</span></footer>
                  </article>

                  <aside className="placement-reason">
                    <div className="reason-mark"><Sparkle size={17} weight="fill" aria-hidden="true" /></div>
                    <p>Why this chapter</p>
                    <blockquote>{placement.reason}</blockquote>
                    <div className="placement-memory-line">
                      <span>From your memory</span>
                      <q>{memory || attachment?.name}</q>
                    </div>
                  </aside>
                </div>

                {placementMode === "change" ? (
                  <section className="chapter-picker" aria-labelledby="change-chapter-title">
                    <div className="chapter-picker-heading">
                      <div><p className="memory-eyebrow">Other possible homes</p><h2 id="change-chapter-title">Choose the thread that feels truest.</h2></div>
                      <button type="button" className="quiet-action" onClick={() => setPlacementMode("proposal")}>Cancel</button>
                    </div>
                    <div className="chapter-options">
                      {chapterOptions.map((option) => (
                        <button key={option.id} type="button" className={placement.id === option.id ? "chapter-option chapter-option--selected" : "chapter-option"} onClick={() => choosePlacement(option)}>
                          <span>{option.volume}</span>
                          <strong>{option.title}</strong>
                          <small>{option.reason}</small>
                          {placement.id === option.id ? <Check size={18} weight="bold" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
                        </button>
                      ))}
                      <button type="button" className="chapter-option chapter-option--new" onClick={() => setPlacementMode("create")}>
                        <Plus size={20} aria-hidden="true" />
                        <strong>Create a new chapter</strong>
                        <small>Start a new thread in Volume II · Becoming.</small>
                        <ArrowRight size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </section>
                ) : null}

                {placementMode === "create" ? (
                  <section className="new-chapter-sheet" aria-labelledby="new-chapter-title">
                    <div>
                      <p className="memory-eyebrow">A new thread</p>
                      <h2 id="new-chapter-title">Name the chapter this memory begins.</h2>
                      <p>It will live in Book One · Volume II, Becoming. You can reorganize the larger book later.</p>
                    </div>
                    <div className="new-chapter-entry">
                      <label htmlFor="chapter-name">Chapter title</label>
                      <input id="chapter-name" value={newChapterTitle} onChange={(event) => setNewChapterTitle(event.target.value)} placeholder="The Things Others Helped Me See" autoFocus />
                      <div>
                        <button type="button" className="quiet-action" onClick={() => setPlacementMode("change")}>Back</button>
                        <button type="button" className="interview-primary" onClick={createChapter}>Create this chapter <ArrowRight size={18} weight="bold" aria-hidden="true" /></button>
                      </div>
                    </div>
                  </section>
                ) : null}

                {placementMode === "proposal" ? (
                  <div className="placement-actions">
                    <button type="button" className="quiet-action" onClick={() => setPlacementMode("change")}>Change chapter</button>
                    <button type="button" className="interview-primary" onClick={() => setPlacementMode("placed")}>Place in this chapter <Check size={18} weight="bold" aria-hidden="true" /></button>
                  </div>
                ) : null}
              </>
            )}
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
    { id: "placement", number: "IV", label: "Place" },
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
