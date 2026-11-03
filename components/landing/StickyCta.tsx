"use client";

import { useEffect, useState } from "react";
import { CTA_LABEL, CTA_TRACK_ID, SIGNUP_HREF } from "@/lib/landing";
import { useTrack } from "./useTrack";

/*
  Sticky mobile bottom CTA (PRD 5.1): the bar appears ONLY after the hero has
  scrolled out of view, keeping the hero CTA-free. It slides in once per page
  load; on desktop it stays hidden because the primary CTAs are already in
  the flow.
*/
export function StickyCta() {
  const [visible, setVisible] = useState(false);
  const track = useTrack();

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px" },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  const visibleState = visible ? "sticky-cta-visible" : "";
  return (
    <div
      className={`sticky-cta ${visibleState}`}
      role="complementary"
      aria-label="Quick sign up"
    >
      <a
        href={SIGNUP_HREF}
        className="cta-btn cta-btn-primary sticky-cta-btn"
        onClick={() => track(CTA_TRACK_ID.sticky, { source: "sticky-bar" })}
      >
        {CTA_LABEL}
      </a>
    </div>
  );
}
