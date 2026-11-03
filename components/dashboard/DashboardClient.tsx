"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { bareLinkText, fillShareMessage, SHARE_MESSAGES } from "@/lib/share";
import { useYouTubeProgress, youtubeIdFromUrl } from "./useYouTubeProgress";

/*
  One-page dashboard (PRD 6.2, v1.3).

  Blocks: welcome header (avatar + level), unlock checklist (WhatsApp to the
  CEO, refer 1, course), referral link card, video course modules with
  IFrame-API engagement tracking, free guide reward card (under the videos),
  liquid progress tracker, payment section (only after module 2 is engaged)
  with the gated PDF book / WhatsApp group / Telegram group items, CEO call
  reward, masked referrals list, footer.

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
  surname: string;
  email: string;
  avatarId: string;
  referralCode: string;
  level: "Explorer" | "Connector" | "Builder" | "Scaler";
  validReferralCount: number;
  whatsappClicked: boolean;
  videosUnlocked: boolean;
  video1Started: boolean;
  video2Engaged: boolean;
  pdfUnlocked: boolean;
  paidPdfUnlocked: boolean;
  whatsappGroupUnlocked: boolean;
  telegramGroupUnlocked: boolean;
  ceoCallUnlocked: boolean;
  ceoWhatsappNumber: string;
  whatsappMessageTemplate: string;
  video1YoutubeUrl: string;
  video2YoutubeUrl: string;
  paidWhatsappGroupLink: string;
  paidTelegramGroupLink: string;
  pdfPriceNaira: number;
  bundlePriceNaira: number;
  referrals: DashboardReferral[];
  nextGoal: { text: string; referralsRemaining: number };
}

type Level = DashboardData["level"];

const AVATAR_COLORS: Record<string, string> = {
  auto: "#1e6f4f",
  sage: "#2f8f68",
  slate: "#475569",
  amber: "#d9a441",
  rose: "#c4506b",
  sky: "#2f7ea8",
  violet: "#6d59b5",
};

const PAID_ITEM_EXPLANATIONS = {
  pdf: "The complete PDF book with every lesson and grant checklist from the course.",
  whatsapp: "The private WhatsApp group where the CEO shares live tips and offers first.",
  telegram: "The private Telegram community with recordings, briefs and peer support.",
} as const;

export function DashboardClient() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const data = useQuery(api.dashboard.getDashboardData) as DashboardData | null | undefined;
  const recordWhatsappClick = useMutation(api.dashboard.recordWhatsappClick);
  const recordVideo1Started = useMutation(api.dashboard.recordVideo1Started);
  const recordVideo2Engaged = useMutation(api.dashboard.recordVideo2Engaged);
  const setAvatar = useMutation(api.dashboard.setAvatar);
  const initializePayment = useAction(api.payments.initializePayment);

  const [toast, setToast] = useState<string | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [celebration, setCelebration] = useState<Level | null>(null);
  const prevLevel = useRef<Level | null>(null);
  const prevValidCount = useRef<number | null>(null);

  const showToast = useCallback((message: string) => setToast(message), []);

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

  // Milestone celebration (PRD 7.3): level reveal + optional haptics.
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
    .replace("{surname}", data.surname)
    .replace("{email}", data.email);
  const waMe = `https://wa.me/${data.ceoWhatsappNumber}?text=${encodeURIComponent(whatsappText)}`;

  const clickWhatsapp = () => {
    void recordWhatsappClick();
    window.open(waMe, "_blank", "noopener");
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

  const startPayment = async (plan: "pdf" | "bundle") => {
    try {
      const result = await initializePayment({ plan });
      window.open(result.authorizationUrl, "_blank", "noopener");
      setPayModalOpen(false);
      setToast("Complete the secure payment in the opened tab.");
    } catch (e) {
      setToast(
        e instanceof Error && e.message
          ? e.message.replace("Uncaught Error momentarily... ", "")
          : "Could not start payment.",
      );
    }
  };

  const joinPaidGroup = (link: string, unlocked: boolean, kind: string) => {
    if (!unlocked) {
      setToast("Unlocks after your payment is confirmed.");
      return;
    }
    if (!link) {
      setToast(`The ${kind} group link is being prepared - check back shortly.`);
      return;
    }
    window.open(link, "_blank", "noopener");
  };

  const primaryAction = !data.whatsappClicked
    ? { label: "Send WhatsApp message", onClick: clickWhatsapp }
    : !data.videosUnlocked
      ? { label: "Share your link", onClick: () => void share() }
      : !data.video2Engaged
        ? { label: "Watch module 2 to unlock more", onClick: () => scrollToSection("module-2") }
        : { label: "Unlock the paid packages", onClick: () => setPayModalOpen(true) };

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-28 pt-8">
      <WelcomeHeader data={data} onSetAvatar={(id) => void setAvatar({ avatarId: id })} />

      <UnlockChecklist data={data} clickWhatsapp={clickWhatsapp} />

      <ReferralCard
        data={data}
        referralLink={referralLink}
        onToast={setToast}
        name={data.firstName}
      />

      <VideoCourseSection data={data} onStarted={() => void recordVideo1Started()} onEngaged={() => void recordVideo2Engaged()} />

      <FreeGuideCard data={data} onToast={setToast} />

      <ProgressTracker data={data} />

      {data.video2Engaged && (
        <PaymentSection
          data={data}
          onPauseModal={() => setPayModalOpen(true)}
          payModalOpen={payModalOpen}
          setPayModalOpen={setPayModalOpen}
          startPayment={startPayment}
          joinPaidGroup={joinPaidGroup}
        />
      )}

      <Rewards data={data} onToast={setToast} />

      <ReferralsList referrals={data.referrals} />

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
            <span className="text-3xl font-extrabold text-brand">{celebration}</span>
            <p className="mt-2 font-semibold">Level up: {celebration}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- blocks --------------------------------- */

function initialsOf(first: string, surname: string): string {
  const a = first.trim()[0]?.toUpperCase() ?? "A";
  const b = surname.trim()[0]?.toUpperCase() ?? "";
  return `${a}${b}`;
}

function WelcomeHeader(props: {
  data: DashboardData;
  onSetAvatar: (id: string) => void;
}) {
  const { data } = props;
  const color = AVATAR_COLORS[data.avatarId] ?? AVATAR_COLORS.auto;
  return (
    <header className="mb-6">
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-label="Your avatar"
          className="grid h-12 w-12 place-items-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {initialsOf(data.firstName, data.surname)}
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            {data.level}
          </p>
          <h1 className="text-2xl font-bold">Welcome, {data.firstName}</h1>
        </div>
      </div>
      <p className="mb-2 text-sm text-ink-soft">{data.nextGoal.text}</p>
      <div className="flex items-center gap-2" aria-label="Choose your avatar colour">
        <span className="text-xs text-ink-soft">Avatar colour:</span>
        {(["auto", "sage", "slate", "amber", "rose", "sky", "violet"] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-label={`Set avatar colour ${id}`}
            className={`h-6 w-6 rounded-full border-2 ${
              data.avatarId === id ? "border-ink" : "border-transparent"
            }`}
            style={{ backgroundColor: AVATAR_COLORS[id] }}
            onClick={props.onSetAvatar.bind(null, id)}
          />
        ))}
      </div>
    </header>
  );
}

function UnlockChecklist(props: {
  data: DashboardData;
  clickWhatsapp: () => void;
}) {
  const { data } = props;
  return (
    <section className="card" aria-label="Unlock checklist">
      <h2 className="card-title">Unlock the video course</h2>
      <CheckItem
        done={data.whatsappClicked}
        title="Send the CEO a WhatsApp message"
        description="Open the pre-filled message and hit send. It saves his number."
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
        done={data.videosUnlocked}
        title="Watch the video modules"
        description={
          data.videosUnlocked
            ? "Unlocked. The two modules are below (about 20 minutes)."
            : "Locked until the two steps above are complete."
        }
        action={
          data.videosUnlocked ? (
            <span className="locked-chip" style={{ background: "var(--color-brand)", color: "#fff" }}>
              Unlocked
            </span>
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

function VideoModule(props: {
  id: string;
  index: number;
  title: string;
  youtubeUrl: string;
  unlocked: boolean;
  onStarted: () => void;
  onEngaged: () => void;
  isSecond: boolean;
  engaged: boolean;
}) {
  const videoId = youtubeIdFromUrl(props.youtubeUrl);
  useYouTubeProgress(
    `yt-${props.id}`,
    props.unlocked && videoId ? videoId : null,
    props.onStarted,
    props.isSecond ? props.onEngaged : () => {},
  );

  return (
    <div
      id={props.id}
      className={`video-module ${props.unlocked ? "" : "frosted"}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-semibold">Module {props.index}: {props.title}</h3>
        {props.isSecond && props.engaged ? (
          <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-white">Watched</span>
        ) : null}
      </div>
      {props.unlocked ? (
        videoId ? (
          <div id={`yt-${props.id}`} />
        ) : (
          <p className="text-sm text-ink-soft">
            The video link will be published shortly. You are all set.
          </p>
        )
      ) : (
        <div className="locked-video-placeholder">
          <p className="font-semibold">Locked</p>
          <p className="text-sm text-ink-soft">
            Complete the two unlock steps above to watch.
          </p>
        </div>
      )}
    </div>
  );
}

function VideoCourseSection(props: {
  data: DashboardData;
  onStarted: () => void;
  onEngaged: () => void;
}) {
  const { data, onStarted, onEngaged } = props;
  return (
    <section className="card" aria-label="Video course">
      <h2 className="card-title">The free course (about 20 minutes)</h2>
      {data.videosUnlocked ? (
        <>
          <VideoModule
            id="module-1"
            index={1}
            title="How to win business grants"
            youtubeUrl={data.video1YoutubeUrl}
            unlocked
            onStarted={onStarted}
            onEngaged={onEngaged}
            isSecond={false}
            engaged={false}
          />
          <VideoModule
            id="module-2"
            index={2}
            title="Using AI for your business and marketing it"
            youtubeUrl={data.video2YoutubeUrl}
            unlocked
            onStarted={() => {}}
            onEngaged={onEngaged}
            isSecond
            engaged={data.video2Engaged}
          />
          {!data.video2Engaged && (
            <p className="text-sm text-ink-soft">
              Watch module 2 to the halfway point to open the next section.
            </p>
          )}
        </>
      ) : (
        <div className="locked-video-placeholder">
          <p className="font-semibold">Video course locked</p>
          <p className="text-sm text-ink-soft">
            Send the CEO's WhatsApp message and refer 1 friend to unlock both
            modules.
          </p>
        </div>
      )}
    </section>
  );
}

function FreeGuideCard(props: {
  data: DashboardData;
  onToast: (t: string) => void;
}) {
  const { data } = props;
  const remaining = Math.max(0, 3 - data.validReferralCount);
  return (
    <section className="card" aria-label="Free course guide">
      <h2 className="card-title">Free course guide</h2>
      {data.pdfUnlocked ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            Your companion guide for the video modules is ready.
          </p>
          <button
            type="button"
            className="chip-btn chip-btn-primary"
            onClick={() => props.onToast("Guide downloads arrive with the next build phase.")}
          >
            Download
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">
          {remaining} more referral{remaining === 1 ? "" : "s"} to unlock the free
          course guide PDF. Locked.
        </p>
      )}
    </section>
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
          { n: 1, label: "Video modules" },
          { n: 3, label: "Free guide" },
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

function PaymentSection(props: {
  data: DashboardData;
  payModalOpen: boolean;
  setPayModalOpen: (open: boolean) => void;
  onPauseModal: () => void;
  startPayment: (plan: "pdf" | "bundle") => Promise<void>;
  joinPaidGroup: (link: string, unlocked: boolean, kind: string) => void;
}) {
  const { data } = props;
  return (
    <section className="card pay-card" aria-label="Paid packages">
      <h2 className="card-title">Go further</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Keep the PDF book and join the private communities led by the CEO.
      </p>
      <button type="button" className="pay-cta" onClick={props.onPauseModal}>
        Unlock the paid packages
      </button>

      <div className="mt-4 flex flex-col gap-3" aria-label="Paid items">
        <PaidItem
          title="PDF book"
          explanation={PAID_ITEM_EXPLANATIONS.pdf}
          unlocked={data.paidPdfUnlocked}
          action={
            <button
              type="button"
              className="chip-btn chip-btn-primary"
              onClick={() => (data.paidPdfUnlocked ? undefined : props.setPayModalOpen(true))}
            >
              {data.paidPdfUnlocked ? "Download (soon)" : `Buy ${data.pdfPriceNaira.toLocaleString()} Naira`}
            </button>
          }
        />
        <PaidItem
          title="WhatsApp group"
          explanation={PAID_ITEM_EXPLANATIONS.whatsapp}
          unlocked={data.whatsappGroupUnlocked}
          action={
            <button
              type="button"
              className="chip-btn chip-btn-primary"
              onClick={() => props.joinPaidGroup(data.paidWhatsappGroupLink, data.whatsappGroupUnlocked, "WhatsApp")}
            >
              {data.whatsappGroupUnlocked ? "Join the WhatsApp group" : `Buy bundle ${data.bundlePriceNaira.toLocaleString()} Naira`}
            </button>
          }
        />
        <PaidItem
          title="Telegram group"
          explanation={PAID_ITEM_EXPLANATIONS.telegram}
          unlocked={data.telegramGroupUnlocked}
          action={
            <button
              type="button"
              className="chip-btn chip-btn-primary"
              onClick={() => props.joinPaidGroup(data.paidTelegramGroupLink, data.telegramGroupUnlocked, "Telegram")}
            >
              {data.telegramGroupUnlocked ? "Join the Telegram group" : `Buy bundle ${data.bundlePriceNaira.toLocaleString()} Naira`}
            </button>
          }
        />
      </div>

      {props.payModalOpen && (
        <PayModal
          data={data}
          onClose={() => props.setPayModalOpen(false)}
          startPayment={props.startPayment}
        />
      )}
    </section>
  );
}

function PaidItem(props: {
  title: string;
  explanation: string;
  unlocked: boolean;
  action: ReactNode;
}) {
  return (
    <div className={`paid-item ${props.unlocked ? "" : "paid-item-locked"}`}>
      <div className="flex-1">
        <p className="font-semibold">
          {props.title}
          {props.unlocked ? null : <span className="ml-2 text-xs text-ink-soft">(locked)</span>}
        </p>
        <p className="text-sm text-ink-soft">{props.explanation}</p>
      </div>
      {props.action}
    </div>
  );
}

function PayModal(props: {
  data: DashboardData;
  onClose: () => void;
  startPayment: (plan: "pdf" | "bundle") => Promise<void>;
}) {
  const [busy, setBusy] = useState<"pdf" | "bundle" | null>(null);
  return (
    <div className="pay-modal-backdrop" role="presentation" onClick={props.onClose}>
      <div
        className="pay-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Choose your package"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">Choose your package</h3>
          <button type="button" aria-label="Close" className="text-ink-soft" onClick={props.onClose}>
            Close
          </button>
        </div>
        <button
          type="button"
          className="pay-option"
          disabled={busy !== null}
          onClick={async () => {
            setBusy("pdf");
            await props.startPayment("pdf");
            setBusy(null);
          }}
        >
          <span className="font-semibold">PDF book only</span>
          <span className="text-ink-soft">{props.data.pdfPriceNaira.toLocaleString()} Naira</span>
          <span className="pay-option-sub">
            {busy === "pdf" ? "Opening secure checkout..." : "Tap to pay with Paystack"}
          </span>
        </button>
        <button
          type="button"
          className="pay-option"
          disabled={busy !== null}
          onClick={async () => {
            setBusy("bundle");
            await props.startPayment("bundle");
            setBusy(null);
          }}
        >
          <span className="font-semibold">PDF + WhatsApp group + Telegram group</span>
          <span className="text-ink-soft">{props.data.bundlePriceNaira.toLocaleString()} Naira</span>
          <span className="pay-option-sub">
            {busy === "bundle" ? "Opening secure checkout..." : "Best value - everything unlocked"}
          </span>
        </button>
        <p className="mt-2 text-xs text-ink-soft">
          Payments are handled securely by Paystack. Nothing unlocks until your
          payment is confirmed.
        </p>
      </div>
    </div>
  );
}

function Rewards(props: { data: DashboardData; onToast: (t: string) => void }) {
  const { data } = props;
  const ceoRemaining = Math.max(0, 10 - data.validReferralCount);
  return (
    <section aria-label="Rewards">
      <div className={`card ${data.ceoCallUnlocked ? "" : "frosted"}`}>
        <h3 className="font-semibold">One-on-one CEO strategy call</h3>
        {data.ceoCallUnlocked ? (
          <div className="mt-3">
            <button
              type="button"
              className="chip-btn chip-btn-primary"
              onClick={() => props.onToast("Booking opens when the scheduler is connected (next build phase).")}
            >
              Book
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">
            Unlocks at 10 valid referrals ({ceoRemaining} to go).
          </p>
        )}
      </div>
    </section>
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
              <span className={statusClass(r.status)}>
                {r.status === "valid" ? "Verified" : r.status === "pending" ? "Pending" : "Invalid"}
              </span>
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
