"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTrack } from "./useTrack";

/*
  The landing CTA button (liquid fill styling in CSS, PRD 7.2). Every CTA
  instance is individually tracked with one of the ids in CTA_TRACK_ID so the
  per-CTA funnel counts (PRD 5.2) can be compared downstream.
*/
export function Cta(props: {
  trackId: string;
  children: ReactNode;
  variant?: "primary" | "accent";
  full?: boolean;
}) {
  const track = useTrack();
  // One event per click, tagged with the CTA position (PRD 5.2 per-CTA counts).
  const onClick = () => track(props.trackId, { cta: props.trackId });
  return (
    <Link
      href="/auth"
      onClick={onClick}
      className={`cta-btn cta-btn-${props.variant === "accent" ? "accent" : "primary"} ${
        props.full ? "cta-btn-full" : ""
      }`}
    >
      {props.children}
    </Link>
  );
}
