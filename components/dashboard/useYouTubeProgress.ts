"use client";

/*
  Minimum YouTube IFrame Player API integration (PRD 6.5).

  - Loads https://www.youtube.com/iframe_api once.
  - Wraps a videoId in a YT.Player into a container ref.
  - Polls currentTime/duration (playback events are spread across many
    state changes; polling at 2s keeps the logic simple and CPU-cheap).
  - Reports "started" (first second of playback) and "engaged" (progress
    >= ENGAGE_RATIO of duration) once each, via the given callbacks.
*/

import { useEffect, useRef } from "react";

const YT_API_SRC = "https://www.youtube.com/iframe_api";
const ENGAGE_RATIO = 0.5;

interface YTPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        options: {
          videoId: string;
          events?: {
            onReady?: () => void;
          };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve) => {
    const prior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prior?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = YT_API_SRC;
    script.async = true;
    document.head.appendChild(script);
  });
  return apiLoadPromise;
}

/** Extracts a video id from common YouTube URL shapes, or returns null. */
export function youtubeIdFromUrl(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([\w-]{6,})/,
    /youtu\.be\/([\w-]{6,})/,
    /youtube\.com\/embed\/([\w-]{6,})/,
    /youtube\.com\/shorts\/([\w-]{6,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function useYouTubeProgress(
  containerId: string,
  videoId: string | null,
  onStarted: () => void,
  onEngaged: () => void,
): void {
  const playerRef = useRef<YTPlayer | null>(null);
  const startedRef = useRef(false);
  const engagedRef = useRef(false);

  useEffect(() => {
    if (!videoId) return;
    let disposed = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    void loadYouTubeApi().then(() => {
      if (disposed || !window.YT) return;
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = "";
      const mount = document.createElement("div");
      mount.style.width = "100%";
      mount.style.aspectRatio = "16 / 9";
      container.appendChild(mount);

      playerRef.current = new window.YT.Player(mount, {
        videoId,
        events: {
          onReady: () => {
            poll = setInterval(() => {
              const player = playerRef.current;
              if (!player) return;
              let t = 0;
              let d = 0;
              try {
                t = player.getCurrentTime();
                d = player.getDuration();
              } catch {
                return;
              }
              if (!startedRef.current && t > 0.5) {
                startedRef.current = true;
                onStarted();
              }
              if (d > 0 && !engagedRef.current && t / d >= ENGAGE_RATIO) {
                engagedRef.current = true;
                onEngaged();
              }
            }, 2000);
          },
        },
      });
    });

    return () => {
      disposed = true;
      if (poll) clearInterval(poll);
      try {
        playerRef.current?.destroy();
      } catch {
        /* player already gone */
      }
      playerRef.current = null;
    };
    // Callbacks are stable via useRef in the caller; videoId/containerId drive setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, containerId]);
}
