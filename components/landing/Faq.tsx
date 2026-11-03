"use client";

import { useState } from "react";
import { FAQS } from "@/lib/landing";
import { useTrack } from "./useTrack";

/*
  Animated FAQ accordion (PRD 5.1.8). Opens one item at a time; the open/close
  transition is a CSS grid-template-rows animation (transform-free but
  layout-local, cheap on mobile). First open of an item is tracked so we know
  which questions attract attention.
*/
export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const track = useTrack();

  return (
    <div className="faq-list">
      {FAQS.map((item, i) => {
        const open = openIndex === i;
        const panelId = `faq-panel-${i}`;
        const btnId = `faq-btn-${i}`;
        return (
          <div className={`faq-item ${open ? "faq-open" : ""}`} key={item.q}>
            <h3>
              <button
                id={btnId}
                type="button"
                className="faq-q"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => {
                  setOpenIndex(open ? null : i);
                  if (!open) track("landing_faq_open", { question: item.q });
                }}
              >
                <span>{item.q}</span>
                <span className="faq-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="18" height="18">
                    <path d="M4 12l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              className="faq-a-wrap"
            >
              <div className="faq-a">
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
