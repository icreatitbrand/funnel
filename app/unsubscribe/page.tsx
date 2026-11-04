"use client";

import { useMutation } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "../../convex/_generated/api";

/*
  Email unsubscribe (PRD 6.9). The link /unsubscribe?t={token} comes from the
  footer of every bulk course email; the random token is stored per user so
  the endpoint cannot be abused against arbitrary accounts.
*/
function UnsubscribeForm() {
  const params = useSearchParams();
  const token = params.get("t") ?? "";
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const unsubscribe = useMutation(api.emails.unsubscribeByToken);

  const submit = async () => {
    if (!token) {
      setStatus("error");
      setMessage("This link is missing its unsubscribe token.");
      return;
    }
    setStatus("busy");
    try {
      const email = await unsubscribe({ token });
      setStatus("done");
      setMessage(`${email} will no longer receive bulk course emails.`);
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof Error ? e.message : "Unsubscribe failed. Please try again.",
      );
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <section className="card max-w-md text-center">
        <h1 className="card-title">Stop the course emails</h1>
        <p className="mb-4 text-sm text-ink-soft">
          You will keep your account and unlocks. We will only stop the
          promotional and reminder emails.
        </p>
        {status === "done" ? (
          <p className="mb-4 text-sm font-semibold text-brand">{message}</p>
        ) : (
          <button
            type="button"
            className="btn-primary mx-auto block"
            disabled={status === "busy"}
            onClick={() => void submit()}
          >
            {status === "busy" ? "Processing..." : "Unsubscribe"}
          </button>
        )}
        {status === "error" && (
          <p className="mt-3 text-sm text-red-700">{message}</p>
        )}
        <p className="mt-6 text-xs text-ink-soft">
          <Link href="/" className="underline">
            Back to the course page
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center text-sm text-ink-soft">Loading...</main>}>
      <UnsubscribeForm />
    </Suspense>
  );
}
