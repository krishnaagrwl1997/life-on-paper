"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { track } from "@/lib/analytics";

/** A Next link that records a named analytics event when clicked. */
export function TrackedLink({
  event,
  where,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { event: string; where: string }) {
  return (
    <Link
      {...props}
      onClick={(clickEvent) => {
        track(event, { where });
        onClick?.(clickEvent);
      }}
    />
  );
}
