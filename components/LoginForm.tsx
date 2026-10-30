"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidEmail } from "@/lib/validation";
import type { FormEvent } from "react";

/*
  Sign-in for already registered (verified) users: email address plus a
  short code emailed to that address only. Unregistered emails are rejected
  by the auth gate (convex/authGate.ts), never sent a code.
*/
export function LoginForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function friendlyError(e: unknown): string {
    const raw =
      e && typeof e === "object" && "data" in e
        ? String((e as { data: unknown }).data)
        : e instanceof Error
          ? e.message
          : String(e);
    const tail = raw.split("]:").pop() ?? raw;
    return tail.length > 1 && tail.length < 220
      ? tail.trim()
      : "Something went wrong. Please try again.";
  }

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn("brevo-otp", { email });
      setStage("code");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn("brevo-otp", { email, code });
      if (result.signingIn) {
        router.push("/dashboard");
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      {stage === "email" ? (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={requestCode}
        >
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-ink-soft">
            Enter the email you signed up with and we&apos;ll send you a
            one-time sign-in code.
          </p>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Email address
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
            />
          </label>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Sending code..." : "Send sign-in code"}
          </button>
          <p className="text-center text-sm text-ink-soft">
            New here?{" "}
            <Link href="/auth" className="font-semibold text-brand underline">
              Sign up
            </Link>
          </p>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submitCode}>
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-sm text-ink-soft">
            We sent a 6-digit code to <strong>{email}</strong>. It expires in 15
            minutes.
          </p>
          <input
            name="code"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={6}
            required
            placeholder="6-digit code"
            className="input-field text-center text-lg tracking-[0.4em]"
          />
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Checking..." : "Verify and continue"}
          </button>
          <button
            type="button"
            disabled={submitting}
            className="text-sm text-ink-soft underline disabled:opacity-50"
            onClick={async () => {
              setSubmitting(true);
              setError(null);
              try {
                await signIn("brevo-otp", { email });
              } catch (e) {
                setError(friendlyError(e));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Resend code
          </button>
          <button
            type="button"
            className="text-sm text-ink-soft underline"
            onClick={() => setStage("email")}
          >
            Change email
          </button>
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
