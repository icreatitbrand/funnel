"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { bareLinkText, fillShareMessage, SHARE_MESSAGES } from "@/lib/share";

/*
  One-page dashboard (PRD 6.2).

  Blocks: welcome header + level badge, unlock checklist (WhatsApp, refer 1,
  Telegram), referral link card with share buttons + ready-made messages,
  liquid progress tracker, rewards (PDF, CEO call), my referrals list,
  offers strip, footer. Real-time via reactive queries; live toast when a
  referral joins; milestone celebration on level-ups.

  The shapes below mirror convex/dashboard.ts getDashboardData (kept local so
  the client bundle never imports backend code).
*/

interface DashboardReferral {
  maskedName: string;
  joinedAt: number;
  status: "pending" | "valid" | "invalid";
}

interface DashboardData {
  firstName: string;
  referralCode: string;
  level: "Explorer" | "Connector" | "Builder" | "Scaler";
  validReferralCount: number;
  whatsappClicked: boolean;
  telegramUnlocked: boolean;
  pdfUnlocked: boolean;
  ceoCallUnlocked: boolean;
  email: string;
  whatsappNumber: string;
  whatsappMessageTemplate: string;
  telegramGroupLink: string;
  referrals: DashboardReferral[];
  nextGoal: { text: string; referralsRemaining: number };
}

type Level = DashboardData["level"];

export function DashboardClient() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const data = useQuery(api.dashboard.getDashboardData) as DashboardData | null | undefined;
  const recordWhatsappClick = useMutation(api.dashboard.recordWhatsappClick);
  const recordTelegramJoinClick = useMutation(api.dashboard.recordTelegramJoinClick);

  const [toast, setToast] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Level | null>(null);
  const prevLevel = useRef<Level | null>(null);
  const prevValidCount = useRef<number | null>(null);

  // Live toast when a friend joins through the user's link (PRD 6.2).
  useEffect(() => {
    if (!data) return;
    const validCount = data.referrals.filter((r) => r.status === "valid").length;
    const prev = prevValidCount.current;
    if (prev !== null && validCount > prev) {
      const newest = data.referrals.find((r) => r.status === "valid");
      if (newest) setToast(`${newest.maskedName} just joined your network.`);
    }
    prevValidCount.current = validCount;
  }, [data]);

  // Milestone celebration (PRD 7.3): level badge reveal + optional haptics.
  useEffect(() => {
    if (!data) return;
    if (prevLevel.current && data.level !== prevLevel.current) {
      setCelebration(data.level);
      if (
        typeof navigator !== "undefined" &&
        "vibrate" in navigator &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        navigator.vibrate?.([40, 70, 40]);
      }
      const t = setTimeout(() => setCelebration(null), 2800);
      prevLevel.current = data.level;
      return () => clearTimeout(t);
    }
    prevLevel.current = data.level;
  }, [data?.level]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  if (data === undefined) {
    return (
      <main className="grid min-h-dvh place-items-center text-sm text-ink-soft">
        Loading...
      </main>
    );
  }
  if (data === null) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="flex flex-col gap-3">
          <p className="text-ink-soft">Please sign in to view your dashboard.</p>
          <Link href="/login" className="btn-primary mx-auto">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const appUrl =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const referralLink = `${appUrl}/?ref=${data.referralCode}`;

  const whatsappText = data.whatsappMessageTemplate
    .replace("{firstName}", data.firstName)
    .replace("{surname}", "") // surname not exposed; template copy is approved accordingly
    .replace("{email}", data.email);
  const waMe = `https://wa.me/${data.whatsappNumber}?text=${encodeURIComponent(whatsappText)}`;

  function clickWhatsapp() {
    void recordWhatsappClick();
    window.open(waMe, "_blank", "noopener");
  }

  const joinTelegram = () => {
    void recordTelegramJoinClick()
      .then(() => {
        if (data.telegramGroupLink) {
          window.open(data.telegramGroupLink, "_blank", "noopener");
        } else {
          setToast("The group link arrives shortly - you are all set.");
        }
      })
      .catch(() => setToast("Telegram access is not unlocked yet."));
  };

  const share = async () => {
    const text = fillShareMessage(
      (SHARE_MESSAGES[1]?.text ?? "").replace("{name}", data.firstName),
      data.firstName,
      referralLink,
    );
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "AI Foundry Course", text });
        return;
      } catch {
        /* user dismissed the sheet */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast("Invitation copied. Paste it anywhere.");
    } catch {
      setToast("Copy failed - your link is shown in the referral card.");
    }
  };

  const primaryAction = !data.whatsappClicked
    ? { label: "Send WhatsApp message", onClick: clickWhatsapp }
    : !data.telegramUnlocked
      ? { label: "Share your link", onClick: () => void share() }
      : data.telegramGroupLink
        ? { label: "Join the Telegram Group", onClick: joinTelegram }
        : { label: "Telegram access ready", onClick: () => {} };

  const nextReward = data.validReferralCount < 3 ? { goal: 3, label: "PDF guide" } : { goal: 10, label: "CEO call" };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-28 pt-8">
      <WelcomeHeader data={data} />

      <UnlockChecklist
        data={data}
        waMe={waMe}
        whatsappText={whatsappText}
        clickWhatsapp={clickWhatsapp}
        joinTelegram={joinTelegram}
      />

      <ReferralCard data={data} referralLink={referralLink} onToast={setToast} name={data.firstName} />

      <ProgressTracker data={data} />

      <Rewards
        data={data}
        nextReward={nextReward}
        onToast={setToast}
      />

      <ReferralsList referrals={data.referrals} />

      <OffersStrip onToast={setToast} telegramUnlocked={data.telegramUnlocked} />

      <footer className="mt-10 flex flex-col items-center gap-3 border-t border-slate-200 pt-6 text-sm">
        <p className="text-ink-soft">
          Support:{" "}
          <a href="mailto:support@icreatitbrandagency.com" className="underline">
            support@icreatitbrandagency.com
          </a>
        </p>
        <button
          type="button"
          className="underline"
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
        >
          Log out
        </button>
      </footer>

      {/* Sticky bottom action area (thumb zone, PRD 7.1) */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
        <button
          type="button"
          onClick={primaryAction.onClick}
          className="btn-primary block w-full"
        >
          {primaryAction.label}
        </button>
      </div>

      {toast && (
        <div
          className="toast"
          role="status"
          aria-live="polite"
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      )}

      {celebration && (
        <div className="celebrate" role="presentation">
          <div className="celebrate-card">
            <span className="text-4xl">{celebration}</span>
            <p className="mt-2 font-semibold">Level up: {celebration}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- blocks --------------------------------- */

function WelcomeHeader({ data }: { data: DashboardData }) {
  return (
    <header className="mb-6 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
        {data.level}
      </p>
      <h1 className="text-2xl font-bold">Welcome, {data.firstName}</h1>
      <p className="text-sm text-ink-soft">{data.nextGoal.text}</p>
    </header>
  );
}

function UnlockChecklist(props: {
  data: DashboardData;
  waMe: string;
  whatsappText: string;
  clickWhatsapp: () => void;
  joinTelegram: () => void;
}) {
  const { data } = props;
  return (
    <section className="card" aria-label="Unlock checklist">
      <h2 className="card-title">Unlock the Telegram group</h2>
      <CheckItem
        done={data.whatsappClicked}
        title="Send us a WhatsApp message"
        description="Open the pre-filled message and hit send."
        action={
          <button type="button" onClick={props.clickWhatsapp} className="chip-btn">
            {data.whatsappClicked ? "Sent" : "Send WhatsApp message"}
          </button>
        }
      />
      <CheckItem
        done={data.validReferralCount >= 1}
        title="Refer 1 friend"
        description={`Progress: ${Math.min(data.validReferralCount, 1)}/1 valid referral. Your link is in the card below.`}
      />
      <CheckItem
        done={data.telegramUnlocked}
        title="Join the Telegram group"
        description={
          data.telegramUnlocked
            ? data.telegramGroupLink
              ? "Unlocked. Tap join to enter."
              : "Unlocked. The invite link arrives shortly."
            : "Locked until the two steps above are complete."
        }
        action={
          data.telegramUnlocked ? (
            <button type="button" onClick={props.joinTelegram} className="chip-btn chip-btn-primary">
              Join the Telegram Group
            </button>
          ) : (
            <span className="locked-chip">Locked</span>
          )
        }
      />
    </section>
  );
}

function CheckItem(props: {
  done: boolean;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="check-row">
      <span className={`check-dot ${props.done ? "check-dot-done" : ""}`} aria-hidden="true" />
      <div className="flex-1">
        <p className="font-semibold">{props.title}</p>
        <p className="text-sm text-ink-soft">{props.description}</p>
      </div>
      {props.action}
    </div>
  );
}

function ReferralCard(props: {
  data: DashboardData;
  referralLink: string;
  name: string;
  onToast: (t: string) => void;
}) {
  const { referralLink, name } = props;
  const [copied, setCopied] = useState(false);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      props.onToast(`Copy failed - select the ${label} manually.`);
    }
  }

  const filled = SHARE_MESSAGES.map((m) => ({
    ...m,
    text: fillShareMessage(m.text.replace("{name}", name), name, referralLink),
  }));

  return (
    <section className="card" aria-label="Your referral link">
      <h2 className="card-title">Your referral link</h2>
      <div className="flex items-center gap-2 rounded-lg bg-surface-alt p-3">
        <code className="flex-1 overflow-x-auto whitespace-nowrap text-sm">
          {referralLink}
        </code>
        <button
          type="button"
          className="chip-btn"
          onClick={() => void copy(referralLink, "link")}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <ShareBtn label="WhatsApp" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(bareLinkText(referralLink))}`, "_blank", "noopener")} />
        <ShareBtn label="Telegram" onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}`, "_blank", "noopener")} />
        <ShareBtn label="X" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fillShareMessage(SHARE_MESSAGES[1]?.text.replace("{name}", name), name, referralLink))}`, "_blank", "noopener")} />
        <ShareBtn label="Facebook" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, "_blank", "noopener")} />
        <ShareBtn
          label="SMS"
          onClick={() => {
            location.href = `sms:?body=${encodeURIComponent(bareLinkText(referralLink))}`;
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Ready-made messages</p>
        {filled.map((m) => (
          <div key={m.id} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {m.label}
              </span>
              <button
                type="button"
                className="chip-btn"
                onClick={() => void copy(m.text, m.label.toLowerCase())}
              >
                Copy
              </button>
            </div>
            <p className="text-sm text-ink-soft">{m.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShareBtn(props: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={props.onClick} className="share-btn">
      {props.label}
    </button>
  );
}

function ProgressTracker({ data }: { data: DashboardData }) {
  const pct = Math.min(100, (data.validReferralCount / 10) * 100);
  const stage = data.validReferralCount >= 10 ? "Scaler unlocked" : `${10 - data.validReferralCount} to go`;
  return (
    <section className="card" aria-label="Progress">
      <h2 className="card-title">Your journey</h2>
      <div className="vessel" role="img" aria-label={`Liquid progress: ${data.validReferralCount} of 10 valid referrals. ${stage}.`}>
        <div className="vessel-fill" style={{ height: `${pct}%` }}>
          <span className="vessel-wave" aria-hidden="true" />
        </div>
      </div>
      <ol className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        {[
          { n: 1, label: "Telegram" },
          { n: 3, label: "PDF guide" },
          { n: 10, label: "CEO call" },
        ].map((m) => (
          <li key={m.n} className={`rounded-lg border p-2 ${data.validReferralCount >= m.n ? "border-brand text-brand font-semibold" : "border-slate-200 text-ink-soft"}`}>
            {m.n} referrals - {m.label}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Rewards(props: { data: DashboardData; nextReward: { goal: number; label: string }; onToast: (t: string) => void }) {
  const { data } = props;
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Rewards">
      <RewardCard
        title="Pre-training PDF guide"
        unlocked={data.pdfUnlocked}
        lockedText={
          data.pdfUnlocked
            ? ""
            : data.validReferralCount < 3
              ? `${3 - data.validReferralCount} more referral${3 - data.validReferralCount === 1 ? "" : "s"} to unlock.`
              : "Unlocks at 3 valid referrals."
        }
        unlockedAction={
          <button
            type="button"
            className="chip-btn chip-btn-primary"
            onClick={() => props.onToast("Your PDF guide will be emailed to you - delivery is landing in the next build phase.")}
          >
            Download
          </button>
        }
      />
      <RewardCard
        title="One-on-one CEO strategy call"
        unlocked={data.ceoCallUnlocked}
        lockedText={`Unlocks at 10 valid referrals (${10 - data.validReferralCount} to go).`}
        unlockedAction={
          <button
            type="button"
            className="chip-btn chip-btn-primary"
            onClick={() => props.onToast("Booking opens when the scheduler is connected (next build phase).")}
          >
            Book
          </button>
        }
      />
    </section>
  );
}

function RewardCard(props: {
  title: string;
  unlocked: boolean;
  lockedText: string;
  unlockedAction: ReactNode;
}) {
  return (
    <div className={`card ${props.unlocked ? "" : "frosted"}`}>
      <h3 className="font-semibold">{props.title}</h3>
      {props.unlocked ? (
        <div className="mt-3">{props.unlockedAction}</div>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">{props.lockedText}</p>
      )}
    </div>
  );
}
function ReferralsList({ referrals }: { referrals: DashboardReferral[] }) {
  return (
    <section className="card" aria-label="My referrals">
      <h2 className="card-title">My referrals</h2>
      {referrals.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No referrals yet. Share your link below to get started.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100">
          {referrals.map((r, i) => (
            <li key={`${r.joinedAt}-${i}`} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium">{r.maskedName}</span>
              <span className="text-ink-soft">
                {new Date(r.joinedAt).toLocaleDateString()}
              </span>
              <span className={statusClass(r.status)}>{r.status === "valid" ? "Verified" : r.status === "pending" ? "Pending" : "Invalid"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function statusClass(status: DashboardReferral["status"]): string {
  return status === "valid"
    ? "rounded-full bg-brand px-2 py-0.5 text-xs text-white"
    : status === "pending"
      ? "rounded-full bg-slate-200 px-2 py-0.5 text-xs text-ink-soft"
      : "rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700";
}

function OffersStrip(props: { telegramUnlocked: boolean; onToast: (t: string) => void }) {
  return (
    <section className="card" aria-label="Offers">
      <h2 className="card-title">Inside the group</h2>
      <p className="text-sm text-ink-soft">
        The Masterclass Training for Business Owners, Business Starter Kit,
        Social Media Management Pack and CAC Business Registration Offer are
        introduced in the Telegram group.{" "}
        {props.telegramUnlocked ? "Join above." : "Unlock to see them."}
      </p>
    </section>
  );
}
