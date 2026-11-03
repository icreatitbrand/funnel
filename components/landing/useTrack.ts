"use client";

import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "../../convex/_generated/api";

/*
  Fire-and-forget anonymous funnel analytics for the landing page (PRD 5.2).
  Never throws into the UI - analytics failures must not block conversions.
*/
export function useTrack() {
  const track = useMutation(api.landing.track);
  return useCallback(
    (type: string, meta?: Record<string, unknown>) => {
      try {
        void track({ type, meta }).catch(() => undefined);
      } catch {
        /* analytics must never break the page */
      }
    },
    [track],
  );
}
