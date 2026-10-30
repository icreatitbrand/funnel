"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { consumeReferralCode, readReferralCode } from "@/lib/referral";
import {
  DEFAULT_COUNTRY_CODE,
  DESCRIPTION_MAX,
  GENDER_VALUES,
  type Gender,
  isValidDescription,
  isValidEmail,
  isValidName,
  normalizePhone,
} from "@/lib/validation";
import { api } from "../convex/_generated/api";

/*
  Two-step signup (PRD 6.1).

  Step 1: identity (First Name, Surname, Phone with +234 default, Email).
  Step 2: Gender, Short Business Description (live counter), NDPA consent.
  Everything is submitted together at the end of Step 2, which:
    1. validates + stores the pending profile server-side
       (api.convex.users.createPendingProfile),
    2. then asks the visitor for a 6-digit code emailed by the
       `brevo-otp` provider (no passwords, no Google OAuth).
  Only after the code is verified does a session exist.
*/

const COUNTRY_CODES = ["+234", "+233", "+254", "+27", "+44", "+1", "+61"];

const FIELD_MESSAGES: Record<string, string> = {
  firstName: "Enter a valid first name (2-50 letters).",
  surname: "Enter a valid surname (2-50 letters).",
  phone: "Enter a valid phone number for the selected country code.",
  email: "Enter a valid email address.",
};

function friendlyError(e: unknown): string {
  const raw =
    e && typeof e === "object" && "data" in e
      ? String((e as { data: unknown }).data)
      : e instanceof Error
        ? e.message
        : String(e);
  // Convex bubbles internal errors as "[CONVEX M(...)] …"; use the tail text.
  const tail = raw.split("]:").pop() ?? raw;
  return tail.length > 1 && tail.length < 220
    ? tail.trim()
    : "Something went wrong. Please try again.";
}

const GENDER_LABELS: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  preferNotToSay: "Prefer not to say",
};

type Identity = {
  firstName: string;
  surname: string;
  countryCode: string;
  phone: string;
  email: string;
};

const EMPTY_IDENTITY: Identity = {
  firstName: "",
  surname: "",
  countryCode: DEFAULT_COUNTRY_CODE,
  phone: "",
  email: "",
};

export function SignupForm() {
  const { signIn } = useAuthActions();
  const createProfile = useMutation(api.users.createPendingProfile);
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identity, setIdentity] = useState<Identity>(EMPTY_IDENTITY);
  const [gender, setGender] = useState<Gender | null>(null);
  const [description, setDescription] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function submitIdentity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstName = identity.firstName.trim();
    const surname = identity.surname.trim();
    const email = identity.email.trim();
    const phoneValid = normalizePhone(identity.countryCode, identity.phone);

    const firstInvalid =
      (!isValidName(firstName) && "firstName") ||
      (!isValidName(surname) && "surname") ||
      (!phoneValid && "phone") ||
      (!isValidEmail(email) && "email");

    if (firstInvalid) {
      setError(FIELD_MESSAGES[firstInvalid]);
      return;
    }
    setIdentity({ ...identity, firstName, surname, email });
    setError(null);
    setStep(2);
  }

  async function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gender) {
      setError("Select a gender option.");
      return;
    }
    if (!isValidDescription(description)) {
      setError(`Business description must be 20-${DESCRIPTION_MAX} characters.`);
      return;
    }
    if (!consent) {
      setError("You must accept the consent to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // 1) Validate + persist the profile; referral code attached when present.
      await createProfile({
        firstName: identity.firstName,
        surname: identity.surname,
        countryCode: identity.countryCode,
        phoneNational: identity.phone,
        email: identity.email,
        gender,
        businessDescription: description,
        consent,
        refCode: readReferralCode() ?? undefined,
      });

      // 2) Kick off the email code generation + sending.
      await signIn("brevo-otp", { email: identity.email });
      setStep(3);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn("brevo-otp", {
        email: identity.email,
        code,
      });
      if (result.signingIn) {
        consumeReferralCode();
        router.push("/dashboard");
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    setSubmitting(true);
    setError(null);
    try {
      await signIn("brevo-otp", { email: identity.email });
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      {/* progress indicator */}
      <ol className="mb-8 flex items-center gap-2" aria-label="Signup progress">
        {[1, 2, 3].map((n) => (
          <li key={n} className="h-1 flex-1 rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full bg-brand transition-all duration-500 ${
                step >= n ? "w-full" : "w-0"
              }`}
            />
          </li>
        ))}
      </ol>

      {step === 1 && (
        <form noValidate className="flex flex-col gap-4" onSubmit={submitIdentity}>
          <h1 className="text-2xl font-bold">Sign up</h1>
          <p className="text-sm text-ink-soft">
            Free access to the AI Foundry and Grant Winning Course.
          </p>

          <IdentityField
            label="First name"
            autoComplete="given-name"
            value={identity.firstName}
            onChange={(v) => setIdentity({ ...identity, firstName: v })}
          />
          <IdentityField
            label="Surname"
            autoComplete="family-name"
            value={identity.surname}
            onChange={(v) => setIdentity({ ...identity, surname: v })}
          />
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Phone number
            <div className="flex gap-2">
              <select
                value={identity.countryCode}
                onChange={(e) =>
                  setIdentity({ ...identity, countryCode: e.target.value })
                }
                aria-label="Country code"
                className="input-field w-24 shrink-0"
              >
                {COUNTRY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                required
                placeholder="801 234 5678"
                value={identity.phone}
                onChange={(e) =>
                  setIdentity({ ...identity, phone: e.target.value })
                }
                className="input-field"
              />
            </div>
          </label>
          <IdentityField
            label="Email address"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={identity.email}
            onChange={(v) => setIdentity({ ...identity, email: v })}
          />

          <button type="submit" className="btn-primary">
            Continue
          </button>
          <p className="text-center text-sm text-ink-soft">
            Already signed up?{" "}
            <Link href="/login" className="font-semibold text-brand underline">
              Sign in with your email code
            </Link>
          </p>
        </form>
      )}

      {step === 2 && (
        <form className="flex flex-col gap-4" onSubmit={submitProfile}>
          <h1 className="text-2xl font-bold">A few details</h1>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold">Gender</legend>
            <div className="flex gap-2">
              {(GENDER_VALUES as readonly Gender[]).map((value) => (
                <label
                  key={value}
                  className={`flex-1 cursor-pointer rounded-lg border px-2 py-2 text-center text-sm ${
                    gender === value
                      ? "border-brand bg-brand/5 font-semibold text-brand"
                      : "border-slate-300 text-ink-soft"
                  }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={value}
                    className="sr-only"
                    checked={gender === value}
                    onChange={() => setGender(value)}
                  />
                  <span className="pointer-events-none">
                    {GENDER_LABELS[value]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Short business description
            <span className="font-normal text-ink-soft">
              Describe your business, or the business you plan to start.
            </span>
            <textarea
              rows={4}
              required
              maxLength={DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
            />
            <span
              aria-live="polite"
              className={`text-xs ${
                isValidDescription(description)
                  ? "text-ink-soft"
                  : "text-red-600"
              }`}
            >
              {description.trim().length}/300 characters (minimum 20)
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-ink-soft">
              I agree to the{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="underline">
                Terms
              </Link>
              , and consent to my data being used in line with the Nigeria
              Data Protection Act (NDPA).
            </span>
          </label>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? "Sending code..." : "Send email code"}
          </button>
          <button
            type="button"
            className="text-sm text-ink-soft underline"
            onClick={() => setStep(1)}
          >
            Back
          </button>
        </form>
      )}

      {step === 3 && (
        <form className="flex flex-col gap-4" onSubmit={submitCode}>
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-sm text-ink-soft">
            We sent a 6-digit code to <strong>{identity.email}</strong>. It
            expires in 15 minutes.
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
            onClick={() => void resendCode()}
          >
            Resend code
          </button>
          <button
            type="button"
            className="text-sm text-ink-soft underline"
            onClick={() => setStep(2)}
          >
            Change details
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

function IdentityField(props: {
  label: string;
  autoComplete?: string;
  inputMode?: "email" | "tel" | "numeric" | "text";
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {props.label}
      <input
        type={props.type ?? "text"}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        required
        placeholder={props.label}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="input-field"
      />
    </label>
  );
}
