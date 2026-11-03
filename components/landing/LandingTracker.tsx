"use client";

import { useEffect } from "react";
import { useTrack } from "./useTrack";

/*
  Page-view + scroll-depth beacon (PRD 5.2). Mounted once on the landing page.
  Scroll depth fires once at 75% of the document so we can compare attention
  between traffic sources.
*/
export function LandingTracker() {
  const track = useTrack();

  useEffect(() => {
    track("landing_view", { hash: window.location.hash || undefined });

    let fired = false;
    const onScroll = () => {
      if (fired) {
        window.removeEventListener("scroll", onScroll);
        return;
      }
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      if (window.scrollY / scrollable >= 0.75) {
        fired = true;
        track("landing_scroll_75", {});
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
