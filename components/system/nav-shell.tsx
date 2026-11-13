"use client";

import {
  Books,
  MagnifyingGlass,
  Notebook,
  Plus,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type Destination = "Today" | "Story" | "People";

type Door = { label: Destination; icon: Icon };

const doors: Door[] = [
  { label: "Today", icon: Notebook },
  { label: "Story", icon: Books },
  { label: "People", icon: UsersThree },
];

export function NavShell({
  active,
  onSelect,
  onAdd,
  onSearch,
  searchActive = false,
}: {
  active: Destination;
  onSelect: (destination: Destination) => void;
  onAdd: () => void;
  onSearch: () => void;
  /** Search lives inside Story, but when it is open the Search door is the one that is lit. */
  searchActive?: boolean;
}) {
  const current = searchActive ? null : active;
  const reduceMotion = useReducedMotion();

  return (
    <nav className="nav-shell" aria-label="Primary navigation">
      {doors.slice(0, 2).map(({ label, icon: IconComponent }) => (
        <ShellButton
          key={label}
          label={label}
          icon={<IconComponent size={25} weight={current === label ? "bold" : "regular"} />}
          isActive={current === label}
          onClick={() => onSelect(label)}
          reduceMotion={reduceMotion}
        />
      ))}

      <button
        key="add"
        type="button"
        aria-label="Add a moment"
        onClick={onAdd}
        className="nav-destination nav-destination--action"
      >
        <span className="nav-icon-wrap"><Plus size={26} weight="bold" aria-hidden="true" /></span>
        <span className="nav-label" aria-hidden="true">Add</span>
      </button>

      {doors.slice(2).map(({ label, icon: IconComponent }) => (
        <ShellButton
          key={label}
          label={label}
          icon={<IconComponent size={25} weight={current === label ? "bold" : "regular"} />}
          isActive={current === label}
          onClick={() => onSelect(label)}
          reduceMotion={reduceMotion}
        />
      ))}

      <ShellButton
        label="Search"
        ariaLabel="Search your life"
        icon={<MagnifyingGlass size={25} weight={searchActive ? "bold" : "regular"} />}
        isActive={searchActive}
        onClick={onSearch}
        reduceMotion={reduceMotion}
      />
    </nav>
  );
}

function ShellButton({
  label,
  ariaLabel,
  icon,
  isActive,
  onClick,
  reduceMotion,
}: {
  label: string;
  ariaLabel?: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  reduceMotion: boolean | null;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "nav-destination",
        isActive && "nav-destination--current",
        isActive && "nav-destination--active",
      )}
    >
      <span className="nav-icon-wrap" aria-hidden="true">
        {isActive ? (
          <motion.span
            layoutId="nav-active-marker"
            className="nav-active-marker"
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.22, 0.72, 0.26, 1] }
            }
          />
        ) : null}
        {icon}
      </span>
      <span className="nav-label" aria-hidden="true">{label}</span>
    </button>
  );
}
