"use client";

import { useEffect, useRef, useState } from "react";
import { useTrack } from "./useTrack";

/*
  Lightweight tap-to-load facade (PRD 5.1.2): the teaser video shows only a
  thumbnail-style card with a play button; the youtube-nocookie iframe is
  injected only after a tap. No autoplay.
  Supports raw youtube URL or ID; empty URL renders a "coming soon" card so
  the page works before the client uploads the teaser.
*/

function extractVideoId(urlOrId: string): string | null {
  const v = urlOrId.trim();
  if (!v) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
  try {
    const u = new URL(v);
    if (u.hostname.includes("youtube.com")) {
      const q = u.searchParams.get("v");
      if (q) return q.slice(0, 11);
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "shorts" || p === "embed");
      if (idx !== -1) return parts[idx + 1]?.slice(0, 11) ?? null;
    }
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1).slice(0, 11) || null;
    }
  } catch {
    return null;
  }
  return null;
}

export function VideoFacade(props: {
  youtubeUrl: string;
  trackId: string;
}) {
  const videoId = extractVideoId(props.youtubeUrl);
  const [playing, setPlaying] = useState(false);
  const track = useTrack();
  const frameRef = useRef<HTMLDivElement>(null);

  return (
    <div className="video-facade" ref={frameRef}>
      {playing && videoId ? (
        <div className="video-frame-wrap">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
            title="AI Foundry and Grant Winning Course teaser"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <button
          type="button"
          className="facade-face"
          aria-label={
            videoId ? "Play the course teaser video" : "Teaser video coming soon"
          }
          onClick={() => {
            if (!videoId) return; // placeholder state: not tappable into player
            track(props.trackId, { videoId });
            setPlaying(true);
          }}
        >
          <span className="facade-thumb" aria-hidden="true">
            {videoId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt=""
                loading="lazy"
              />
            )}
          </span>
          <span className="facade-play" aria-hidden="true">
            <svg viewBox="0 0 64 64" width="64" height="64" focusable="false">
              <circle cx="32" cy="32" r="30" fill="rgba(16,24,40,0.55)" />
              <path d="M26 22l18 10-18 10z" fill="#fff" />
            </svg>
          </span>
          {!videoId && (
            <span className="facade-soon">Teaser video coming soon</span>
          )}
        </button>
      )}
    </div>
  );
}
