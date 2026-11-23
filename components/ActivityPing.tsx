"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../convex/_generated/api";

/*
  Renders nothing. Records that the signed-in user is active so the 7-day
  email-only sign-in window counts from their last visit (convex/emailLogin.ts).
*/
export function ActivityPing() {
  const { isAuthenticated } = useConvexAuth();
  const touch = useMutation(api.emailLogin.touch);
  const done = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || done.current) return;
    done.current = true;
    void touch({}).catch(() => {
      /* non-fatal */
    });
  }, [isAuthenticated, touch]);

  return null;
}
