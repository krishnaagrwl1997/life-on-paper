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
}: {
  active: Destination;
  onSelect: (destination: Destination) => void;
  onAdd: () => void;
  onSearch: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <nav className="nav-shell" aria-label="Primary navigation">
      {doors.slice(0, 2).map(({ label, icon: IconComponent }) => (
        <ShellButton
          key={label}
          label={label}
          icon={<IconComponent size={25} weight={active === label ? "bold" : "regular"} />}
          isActive={active === label}
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
        <Plus size={30} weight="light" aria-hidden="true" />
        <span className="nav-label" aria-hidden="true">Add</span>
      </button>

      {doors.slice(2).map(({ label, icon: IconComponent }) => (
        <ShellButton
          key={label}
          label={label}
          icon={<IconComponent size={25} weight={active === label ? "bold" : "regular"} />}
          isActive={active === label}
          onClick={() => onSelect(label)}
          reduceMotion={reduceMotion}
        />
      ))}

      <button
        key="search"
        type="button"
        aria-label="Search your life"
        onClick={onSearch}
        className="nav-destination"
      >
        <MagnifyingGlass size={25} weight="regular" aria-hidden="true" />
        <span className="nav-label" aria-hidden="true">Search</span>
      </button>
    </nav>
  );
}

function ShellButton({
  label,
  icon,
  isActive,
  onClick,
  reduceMotion,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  reduceMotion: boolean | null;
}) {
  return (
    <button
      type="button"
      aria-label={label}
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
