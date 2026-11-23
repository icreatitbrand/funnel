"use client";

import { useEffect, useState } from "react";
import { CTA_LABEL, CTA_TRACK_ID } from "@/lib/landing";
import { Cta } from "./Cta";

/*
  Sticky mobile bottom CTA (PRD 5.1): the bar appears ONLY after the hero has
  scrolled out of view, keeping the hero CTA-free. It slides in once per page
  load; on desktop it stays hidden because the primary CTAs are already in
  the flow. The button itself is the shared <Cta>, so it behaves exactly like
  every other CTA: tracked, and it simply goes to the signup page.
*/
export function StickyCta() {
  const [visible, setVisible] = useState(false);

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
      <Cta variant="primary" trackId={CTA_TRACK_ID.sticky} full>
        {CTA_LABEL}
      </Cta>
    </div>
  );
}
