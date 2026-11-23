/*
  Browser-side storage for the trusted-device token (see convex/devices.ts).
  Wrapped in try/catch because storage can be blocked (private mode, etc.).
*/
const KEY = "ifd_device_token";

export function getDeviceToken(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setDeviceToken(token: string): void {
  try {
    window.localStorage.setItem(KEY, token);
  } catch {
    /* storage unavailable: the user simply gets a code next time */
  }
}
