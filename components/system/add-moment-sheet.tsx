"use client";

import { BookOpenText, PenNib, X } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

const paperEase = [0.22, 0.72, 0.26, 1] as const;

export function AddMomentSheet({
  onClose,
  onTodayLines,
  onCraftMemory,
}: {
  onClose: () => void;
  onTodayLines: () => void;
  onCraftMemory: () => void;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="add-sheet"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Add a moment"
        className="add-sheet__card"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="add-sheet__heading">
          <p>Add a moment</p>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={16} weight="bold" aria-hidden="true" />
          </button>
        </header>

        <div className="add-sheet__options">
          <button type="button" className="add-sheet__option" onClick={onTodayLines}>
            <span className="add-sheet__option-icon" aria-hidden="true">
              <PenNib size={20} weight="regular" />
            </span>
            <span className="add-sheet__option-copy">
              <strong>Today&rsquo;s lines</strong>
              <small>A few lines about today &mdash; fast.</small>
            </span>
          </button>

          <button type="button" className="add-sheet__option" onClick={onCraftMemory}>
            <span className="add-sheet__option-icon" aria-hidden="true">
              <BookOpenText size={20} weight="regular" />
            </span>
            <span className="add-sheet__option-copy">
              <strong>Craft a memory</strong>
              <small>Guide a memory into a page of your book &mdash; photos, voice, and gentle questions.</small>
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
