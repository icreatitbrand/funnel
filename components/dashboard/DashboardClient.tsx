"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Reveal } from "@/components/landing/Reveal";
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
type BookingId = Id<"callBookings">;

const AVATAR_COLORS: Record<string, string> = {
  auto: "#2563eb",
  sage: "#3b82f6",
  slate: "#475569",
  amber: "#dc2626",
  rose: "#c4506b",
  sky: "#2f7ea8",
  violet: "#6d59b5",
};

const PAID_ITEM_EXPLANATIONS = {
  pdf: "Full PDF book with every lesson and grant checklist.",
  whatsapp: "Private group with live tips and early offers.",
  telegram: "Private community with recordings, briefs and peer support.",
} as const;

export function DashboardClient() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const data = useQuery(api.dashboard.getDashboardData) as DashboardData | null | undefined;
  const recordWhatsappClick = useMutation(api.dashboard.recordWhatsappClick);
  const recordVideo1Started = useMutation(api.dashboard.recordVideo1Started);
  const recordVideo2Engaged = useMutation(api.dashboard.recordVideo2Engaged);
  const initializePayment = useAction(api.payments.initializePayment);
  const startGuideDownload = useMutation(api.files.startGuideDownload);
  const startPaidBookDownload = useMutation(api.files.startPaidBookDownload);
  const joinTelegramGroup = useAction(api.telegram.getGroupLink);
  const bookCall = useMutation(api.calls.bookCall);
  const cancelCall = useMutation(api.calls.cancelCall);
  const recordBookingOpen = useMutation(api.calls.recordBookingOpen);
  const myBooking = useQuery(api.calls.myCallBooking);

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

  const joinPaidGroup = (kind: "whatsapp" | "telegram") => {
    const unlocked =
      kind === "whatsapp" ? data.whatsappGroupUnlocked : data.telegramGroupUnlocked;
    if (!unlocked) {
      setToast("Unlocks after your payment is confirmed.");
      return;
    }
    if (kind === "telegram") {
      // Bot mode mints one single-use invite per click (server-side).
      joinTelegramGroup({})
        .then((res) => {
          if (res.mode === "bot") {
            setToast("Your personal one-time invite link was created.");
          }
          window.open(res.link, "_blank", "noopener");
        })
        .catch((err: unknown) => {
          setToast(
            err instanceof Error && err.message
              ? err.message.replace("Uncaught Error: ", "")
              : "Could not open the Telegram group.",
          );
        });
      return;
    }
    const link = data.paidWhatsappGroupLink;
    if (!link) {
      setToast("The WhatsApp group link is being prepared - check back shortly.");
      return;
    }
    window.open(link, "_blank", "noopener");
  };

  const downloadFile = (
    kind: "guide" | "book",
    unlocked: boolean,
    lockMessage: string,
  ) => {
    if (!unlocked) {
      setToast(lockMessage);
      return;
    }
    const mutation =
      kind === "guide" ? startGuideDownload : startPaidBookDownload;
    mutation({})
      .then((res) => window.open(res.downloadUrl, "_blank", "noopener"))
      .catch((err: unknown) => {
        setToast(
          err instanceof Error && err.message
            ? err.message.replace("Uncaught Error: ", "")
            : "The download will be ready shortly.",
        );
      });
  };

  const joinTelegram = () => {
    if (data.telegramGroupUnlocked) {
      joinPaidGroup("telegram");
    } else if (data.video2Engaged) {
      setPayModalOpen(true);
    } else {
      setToast("Watch module 2 to unlock the Telegram group.");
    }
  };

  return (
    <div className="dash-page">
      <div className="dash mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-28 pt-6">
        <div className="dash-sheet">
          <WelcomeHeader data={data} />

          <Reveal>
            <ReferralCard referralLink={referralLink} onToast={setToast} />
          </Reveal>

          <Reveal>
            <WhatsappStep data={data} clickWhatsapp={clickWhatsapp} />
          </Reveal>

          <Reveal>
            <VideoCourseSection
              data={data}
              onStarted={() => void recordVideo1Started()}
              onEngaged={() => void recordVideo2Engaged()}
            />
          </Reveal>

          <Reveal>
            <ProgressTracker data={data} />
          </Reveal>

          <Reveal>
            <section className="dash-block" aria-label="Rewards">
              <FreeGuideRow
                data={data}
                onDownload={() =>
                  downloadFile("guide", data.pdfUnlocked, "Reach 3 valid referrals to unlock the guide.")
                }
              />
              <Rewards
                data={data}
                onToast={setToast}
                booking={myBooking}
                onBook={(slot) => bookCall({ requestedFor: slot })}
                onCancel={(bookingId) => cancelCall({ bookingId: bookingId as BookingId })}
                onOpen={() => void recordBookingOpen()}
              />
            </section>
          </Reveal>

          {data.video2Engaged && (
            <Reveal>
              <PaymentSection
                data={data}
                onPauseModal={() => setPayModalOpen(true)}
                payModalOpen={payModalOpen}
                setPayModalOpen={setPayModalOpen}
                startPayment={startPayment}
                joinPaidGroup={joinPaidGroup}
                onDownloadBook={() =>
                  downloadFile("book", data.paidPdfUnlocked, "The book unlocks after a verified payment.")
                }
              />
            </Reveal>
          )}

          <Reveal>
            <ReferralsList referrals={data.referrals} />
          </Reveal>
        </div>

      <footer className="dash-footer">
        <p>
          <a href="mailto:support@icreatitbrandagency.com" className="underline">
            support@icreatitbrandagency.com
          </a>
        </p>
        <button
          type="button"
          className="logout-btn"
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
        >
          Log out
        </button>
      </footer>

      {/* Floating action (thumb zone) */}
      <div className="dash-float">
        <button type="button" onClick={joinTelegram} className="dash-float-btn">
          Join the Telegram Group
        </button>
      </div>

      {toast && (
        <div className="toast" role="status" aria-live="polite" onClick={() => setToast(null)}>
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
    </div>
  );
}

/* ---------------------------------- blocks --------------------------------- */

function initialsOf(first: string, surname: string): string {
  const a = first.trim()[0]?.toUpperCase() ?? "A";
  const b = surname.trim()[0]?.toUpperCase() ?? "";
  return `${a}${b}`;
}

function WelcomeHeader({ data }: { data: DashboardData }) {
  const color = AVATAR_COLORS[data.avatarId] ?? AVATAR_COLORS.auto;
  return (
    <header className="dash-hero">
      <span
        aria-label="Your avatar"
        className="dash-avatar grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {initialsOf(data.firstName, data.surname)}
      </span>
      <div>
        <p className="dash-level">{data.level}</p>
        <h1 className="text-2xl font-bold">Welcome, {data.firstName}</h1>
      </div>
    </header>
  );
}

function ReferralCard(props: { referralLink: string; onToast: (t: string) => void }) {
  const { referralLink } = props;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      props.onToast("Copy failed - select the link manually.");
    }
  }

  return (
    <section className="dash-block" aria-label="Your referral link">
      <h2 className="dash-label">Your referral link</h2>
      <div className="ref-box">
        <code>{referralLink}</code>
        <button type="button" className="chip-btn" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}

function WhatsappStep(props: { data: DashboardData; clickWhatsapp: () => void }) {
  const { data } = props;
  return (
    <section className="dash-block" aria-label="Message the CEO">
      <div className="dash-row dash-row-first">
        <div>
          <h2 className="dash-label">Message the CEO</h2>
          <p className="dash-note">Send it once to unlock the videos.</p>
        </div>
        <button
          type="button"
          onClick={props.clickWhatsapp}
          className={`chip-btn ${data.whatsappClicked ? "chip-btn-ghost" : ""}`}
        >
          {data.whatsappClicked ? "Sent" : "Send WhatsApp message"}
        </button>
      </div>
    </section>
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
    <div id={props.id} className="video-module">
      <div className="video-frame">
        <div
          className="video-thumb"
          style={
            videoId
              ? { backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)` }
              : undefined
          }
        />
        {props.unlocked && videoId && <div id={`yt-${props.id}`} className="video-embed" />}
        {props.unlocked && !videoId && (
          <div className="video-soon">
            <p>Coming shortly</p>
          </div>
        )}
        <div className={`video-veil ${props.unlocked ? "video-veil-open" : ""}`} aria-hidden={props.unlocked}>
          <span className="veil-lock">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <p>Message the CEO and refer 1 friend</p>
        </div>
      </div>
      <div className="video-module-head">
        <h3 className="font-semibold">Module {props.index}: {props.title}</h3>
        {props.isSecond && props.engaged ? <span className="watched-badge">Watched</span> : null}
      </div>
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
    <section className="dash-block" aria-label="Video course">
      <h2 className="dash-label">The free course</h2>
      <div className="video-stack">
        <VideoModule
          id="module-1"
          index={1}
          title="Using AI for your business and marketing on social media"
          youtubeUrl={data.video1YoutubeUrl}
          unlocked={data.videosUnlocked}
          onStarted={onStarted}
          onEngaged={onEngaged}
          isSecond={false}
          engaged={false}
        />
        <VideoModule
          id="module-2"
          index={2}
          title="How to raise funds & win business grants"
          youtubeUrl={data.video2YoutubeUrl}
          unlocked={data.videosUnlocked}
          onStarted={() => {}}
          onEngaged={onEngaged}
          isSecond
          engaged={data.video2Engaged}
        />
      </div>
    </section>
  );
}

function FreeGuideRow(props: { data: DashboardData; onDownload: () => void }) {
  const { data } = props;
  const remaining = Math.max(0, 3 - data.validReferralCount);
  return (
    <div className="dash-row dash-row-first">
      <div>
        <h3 className="font-semibold">Free course guide</h3>
        {!data.pdfUnlocked && (
          <p className="dash-note">
            {remaining} more referral{remaining === 1 ? "" : "s"} to unlock
          </p>
        )}
      </div>
      {data.pdfUnlocked ? (
        <button type="button" className="chip-btn chip-btn-primary" onClick={props.onDownload}>
          Download
        </button>
      ) : (
        <span className="lock-tag">Locked</span>
      )}
    </div>
  );
}

function ProgressTracker({ data }: { data: DashboardData }) {
  const count = data.validReferralCount;
  const pct = Math.min(100, (count / 10) * 100);
  // The bar grows from empty on load and eases to each new value.
  const [shownPct, setShownPct] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShownPct(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return (
    <section className="dash-block" aria-label="Progress">
      <div className="journey-head">
        <h2 className="dash-label">Your journey</h2>
        <p className="journey-count">
          <strong>{count}</strong>/10 referrals
        </p>
      </div>
      <div
        className="bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={Math.min(count, 10)}
        aria-label="Valid referrals"
      >
        <div className="bar-fill" style={{ width: `${shownPct}%` }} />
        <span className="bar-tick" style={{ left: "10%" }} aria-hidden="true" />
        <span className="bar-tick" style={{ left: "30%" }} aria-hidden="true" />
      </div>
    </section>
  );
}

function PaymentSection(props: {
  data: DashboardData;
  payModalOpen: boolean;
  setPayModalOpen: (open: boolean) => void;
  onPauseModal: () => void;
  startPayment: (plan: "pdf" | "bundle") => Promise<void>;
  joinPaidGroup: (kind: "whatsapp" | "telegram") => void;
  onDownloadBook: () => void;
}) {
  const { data } = props;
  return (
    <section className="dash-block" aria-label="Paid packages">
      <h2 className="dash-label">Go further</h2>
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
              onClick={() =>
                data.paidPdfUnlocked ? props.onDownloadBook() : props.setPayModalOpen(true)
              }
            >
              {data.paidPdfUnlocked ? "Download the book" : `Buy ${data.pdfPriceNaira.toLocaleString()} Naira`}
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
              onClick={() => props.joinPaidGroup("whatsapp")}
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
              onClick={() => props.joinPaidGroup("telegram")}
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

function Rewards(props: {
  data: DashboardData;
  onToast: (t: string) => void;
  booking:
    | { _id: BookingId; scheduledFor: number }
    | null
    | undefined;
  onBook: (slot: number) => Promise<{ booked: boolean; reason?: string } | void>;
  onCancel: (bookingId: BookingId) => Promise<unknown>;
  onOpen: () => void;
}) {
  const { data, booking } = props;
  const ceoRemaining = Math.max(0, 10 - data.validReferralCount);
  const [panelOpen, setPanelOpen] = useState(false);
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!slot) {
      props.onToast("Pick a date and time first.");
      return;
    }
    const ms = new Date(slot).getTime();
    if (Number.isNaN(ms)) {
      props.onToast("Pick a valid date and time.");
      return;
    }
    setBusy(true);
    try {
      const result = await props.onBook(ms);
      if (result && result.booked === false && result.reason) {
        props.onToast(result.reason);
      } else {
        setPanelOpen(false);
        setSlot("");
        props.onToast("Call booked. The CEO has been notified.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (data.ceoCallUnlocked) {
    return (
      <div className="dash-row dash-row-col">
        <div className="dash-row-top">
          <h3 className="font-semibold">One-on-one CEO strategy call</h3>
        </div>
        <div className="dash-row-body">
          {booking ? (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-sm text-ink-soft">
                Upcoming call:{" "}
                <strong className="text-ink">
                  {new Date(booking.scheduledFor).toLocaleString("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </strong>
              </p>
              <button
                type="button"
                className="chip-btn chip-btn-primary self-start"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await props.onCancel(booking._id);
                    props.onToast("Call cancelled.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Cancel booking
              </button>
            </div>
          ) : panelOpen ? (
            <div className="mt-3 flex flex-col gap-2">
              <label htmlFor="call-slot" className="text-sm text-ink-soft">
                Pick a slot (7am - 8pm Lagos time)
              </label>
              <input
                id="call-slot"
                type="datetime-local"
                className="input-field"
                min={new Date(Date.now() + 3600_000).toISOString().slice(0, 16)}
                max={new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 16)}
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="chip-btn chip-btn-primary"
                  disabled={busy}
                  onClick={() => void submit()}
                >
                  {busy ? "Booking..." : "Confirm booking"}
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  disabled={busy}
                  onClick={() => setPanelOpen(false)}
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-ink-soft">
                The CEO is notified with your name and requested time.
              </p>
            </div>
          ) : (
            <button
              type="button"
              className="chip-btn chip-btn-primary mt-3"
              onClick={() => {
                props.onOpen();
                setPanelOpen(true);
              }}
            >
              Book my call
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dash-row">
      <div>
        <h3 className="font-semibold">One-on-one CEO strategy call</h3>
        <p className="dash-note">
          {ceoRemaining} more referral{ceoRemaining === 1 ? "" : "s"} to unlock
        </p>
      </div>
      <span className="lock-tag">Locked</span>
    </div>
  );
}

function ReferralsList({ referrals }: { referrals: DashboardReferral[] }) {
  return (
    <section className="dash-block" aria-label="My referrals">
      <h2 className="dash-label">My referrals</h2>
      {referrals.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No referrals yet.
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
