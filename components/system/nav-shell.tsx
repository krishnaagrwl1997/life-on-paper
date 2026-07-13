"use client";

import {
  Books,
  HouseLine,
  Leaf,
  Plus,
  type Icon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Destination = "Home" | "Library" | "Add Memory" | "Garden";

const destinations: Array<{
  label: Destination;
  icon: Icon;
  emphasized?: boolean;
}> = [
  { label: "Home", icon: HouseLine },
  { label: "Library", icon: Books },
  { label: "Add Memory", icon: Plus, emphasized: true },
  { label: "Garden", icon: Leaf },
];

export function NavShell({
  active,
  onSelect,
}: {
  active: Destination;
  onSelect: (destination: Destination) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <nav className="nav-shell" aria-label="Primary navigation">
      {destinations.map(({ label, icon: IconComponent, emphasized }) => {
        const isActive = active === label;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(label)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "nav-destination",
              emphasized && "nav-destination--action",
              isActive && !emphasized && "nav-destination--active",
            )}
          >
            {isActive && !emphasized ? (
              <motion.span
                layoutId="nav-active-marker"
                className="nav-active-marker"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.5, ease: [0.22, 0.72, 0.26, 1] }
                }
              />
            ) : null}
            <IconComponent
              size={emphasized ? 30 : 25}
              weight={emphasized ? "light" : isActive ? "bold" : "regular"}
              aria-hidden="true"
            />
            <span className="nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
