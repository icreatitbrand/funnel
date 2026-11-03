"use client";

import { useEffect, useRef, useState } from "react";

/*
  Count-up number for the evidence section (PRD 5.1.6): animates once when
  scrolled into view via IntersectionObserver + requestAnimationFrame. Respects
  prefers-reduced-motion by snapping straight to the final value.
*/
export function CountUp(props: { end: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setValue(props.end);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(props.end);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || started.current) return;
          started.current = true;
          io.disconnect();
          const duration = 1200;
          const t0 = performance.now();
          const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(Math.round(props.end * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [props.end]);

  return (
    <span ref={ref} className="countup">
      {value.toLocaleString()}
      {props.suffix ?? ""}
    </span>
  );
}
