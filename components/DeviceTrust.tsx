"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../convex/_generated/api";
import { getDeviceToken, setDeviceToken } from "@/lib/deviceToken";

/*
  Renders nothing. On a signed-in page it either refreshes this device's
  "last seen" time (keeps the 7-day email-only window alive) or, if the device
  has no valid token yet, asks the server for one. Being signed in here means
  the user just proved their email with a code, or is already trusted.
*/
export function DeviceTrust() {
  const { isAuthenticated } = useConvexAuth();
  const issueToken = useMutation(api.devices.issueToken);
  const touch = useMutation(api.devices.touch);
  const done = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || done.current) return;
    done.current = true;
    (async () => {
      try {
        const existing = getDeviceToken();
        if (existing && (await touch({ token: existing }))) return;
        setDeviceToken(await issueToken({}));
      } catch {
        /* non-fatal: next login just asks for a code */
      }
    })();
  }, [isAuthenticated, issueToken, touch]);

  return null;
}
