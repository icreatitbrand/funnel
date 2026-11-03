"use client";

import { useRef, type ReactNode } from "react";

/*
  Scroll reveal (PRD 7.2): adds a CSS animation class when the block enters the
  viewport. Implemented with IntersectionObserver + CSS transitions instead of a
  full animation library - transform/opacity only, pause-free teardown, and it
  honors prefers-reduced-motion in CSS. No content depends on the animation to
  be readable because content is fully visible without JS.
*/
export function Reveal(props: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={(el) => {
        // Attach one observer per element; disconnect on unmount via cleanup.
        if (!el || ref.current === el) return;
        ref.current = el;
        if (typeof IntersectionObserver === "undefined") {
          el.classList.add("reveal-in");
          return;
        }
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                el.classList.add("reveal-in");
                io.disconnect();
              }
            });
          },
          { threshold: 0.15 },
        );
        io.observe(el);
        if (props.delay) el.style.transitionDelay = `${props.delay}ms`;
      }}
      className={`reveal ${props.className ?? ""}`}
    >
      {props.children}
    </div>
  );
}
