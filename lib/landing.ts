/*
  Landing page content, in section order (PRD 5.1). Single source of truth so
  copy edits never touch markup. Items marked PLACEHOLDER need verified numbers
  or real assets from the client before launch (PRD 5.1.6: only substantiated
  claims; "learn how to apply" language, never guaranteed outcomes).

  Visual language rules (PRD 7.4): no emojis anywhere.
*/

export const HERO = {
  headline: "It's time to build and scale your business with grants and AI",
  subheadline:
    "Join the free AI Foundry and Grant Winning Course from Icreatit Brand Limited.",
  trustLine: "TRAINING AND SUPPORTING SMALL BUSINESSES ACROSS NIGERIA", // PLACEHOLDER: replace with verified proof point
};

export const CTA_LABEL = "Claim Your Free Access"; // final label pending approval (PRD 5.1)
export const SIGNUP_HREF = "/auth";

/* Track ids are used for per-CTA analytics (landing_cta_video / _ceo / _evidence / _final). */
export const CTA_TRACK_ID = {
  video: "landing_cta_video",
  ceo: "landing_cta_ceo",
  evidence: "landing_cta_evidence",
  final: "landing_cta_final",
  sticky: "landing_sticky_cta",
} as const;

export const VIDEO_SECTION = {
  teaserYoutubeUrl: "https://youtu.be/j9CMOT4LYx4", // homepage video facade
  intro:
    "Watch a short taste of what you will learn before you sign up.",
};

export const MODULES = [
  {
    id: "mod-1",
    kicker: "Module 1",
    title: "Using AI for your business and marketing on social media",
    outcomes: [
      "Put AI to work in daily business tasks",
      "Create social media content with AI tools",
      "Use AI to find and win funding opportunities",
    ],
  },
  {
    id: "mod-2",
    kicker: "Module 2",
    title: "How to raise funds & win business grants",
    outcomes: [
      "Discover different forms of funding",
      "The Tony Elumelu Foundation grant",
      "Winning through my guide and support community",
    ],
  },
];

export const ACCESS_EXPLAINER =
  "Access is simple: sign up, send a WhatsApp message to the CEO, and refer one friend. Both video modules unlock immediately, free.";

export const CEO = {
  name: "Pastor Wisdom Ifeanyi",
  title: "Founder & CEO, ICREATIT BRAND LIMITED | Founder, EXCEL IN SCHOOL",
  bio: [
    "My journey as an entrepreneur began with a dream, determination, and a strong desire to create impact, even when I had very little.",
    "In my first year at the university, I raised a ₦1 million soft loan to kickstart my entrepreneurial journey. In my second year, I took things further by winning two grants: a ₦300,000 grant and the prestigious $5,000 Tony Elumelu Foundation Entrepreneurship Programme grant. By my third year, I had launched EXCEL IN SCHOOL, my EdTech company dedicated to helping students achieve academic and personal excellence.",
    "Beyond entrepreneurship and grant funding, I am passionate about digital marketing and business growth. I am a Social Media Marketing expert and was among the Social Media Experts trained by the Federal Government of Nigeria through the TVET Programme. Through ICREATIT BRAND LIMITED, I have worked with businesses to build their brands, improve their online presence, and leverage digital opportunities for growth.",
    "Today, I am on a mission to help 1,000 Nigerian entrepreneurs, especially student entrepreneurs, apply for and win the 2027 Tony Elumelu Foundation Entrepreneurship Programme grant.",
    "I understand how competitive the $5,000 grant is. That is why I documented the application processes, strategies, and write-ups I used to secure my own grant. I am bringing these experiences into this FREE crash course to help you approach your application with greater clarity, confidence, and preparation.",
    "My goal is simple: to help you turn your business idea into a fundable venture.",
  ],
  quote:
    "You are not just learning from a teacher; you are learning from someone who has walked the journey and is committed to helping you succeed.",
  callLine:
    "Every learner who reaches 10 referrals earns a one-on-one strategy call with me.",
  closing: "Let's make your entrepreneurial dream a reality!",
};

export const ABOUT = {
  lead: "Icreatit Brand Limited helps small businesses start, register, grow and win.",
  body: "PLACEHOLDER: who the company is, what it does and who it serves, in two or three sentences.",
  offers: [
    {
      id: "o1",
      title: "Masterclass",
      blurb: "Live, practical training on business growth.",
    },
    {
      id: "o2",
      title: "Business Starter Kit",
      blurb: "Everything a new business needs to get going.",
    },
    {
      id: "o3",
      title: "Social Media Management Pack",
      blurb: "Done-for-you content and page growth.",
    },
    {
      id: "o4",
      title: "CAC Business Registration Offer",
      blurb: "Register your business properly and affordably.",
    },
  ],
};

export const EVIDENCE = [
  // PLACEHOLDER: every number and label must be verifiable before launch.
  { end: 500, suffix: "+", label: "People trained" },
  { end: 30, suffix: "+", label: "Businesses served" },
  { end: 10, suffix: "+", label: "Grant wins supported" },
] as const;

export const EVIDENCE_NOTE =
  "You will learn how to apply for grants - grant outcomes always depend on each funder's process.";

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Connect",
    text: "Sign up free, then send the ready-made WhatsApp message to the CEO. That is step one done.",
  },
  {
    step: 2,
    title: "Unlock",
    text: "Refer one friend with your personal link. Both video modules (about 20 minutes) unlock instantly.",
  },
  {
    step: 3,
    title: "Level up",
    text: "Watch module 2 to open the paid packages. Reach 3 referrals for the free guide, 10 for a one-on-one CEO call.",
  },
] as const;

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Is it really free?",
    a: "Yes. The two video modules are completely free after you sign up, send the WhatsApp message and refer one friend. There is also a free course guide at 3 referrals.",
  },
  {
    q: "Who is it for?",
    a: "Small business owners and aspiring founders in Nigeria who want to win business grants and put AI and social media to work for their business.",
  },
  {
    q: "Do I need a registered business?",
    a: "No. The course shows you how grants work and how to register your business when you are ready. Some grants require registration, and the course explains that.",
  },
  {
    q: "How do I unlock the videos?",
    a: "Sign up, send the ready-made WhatsApp message to the CEO, and refer 1 friend with your personal link. The videos unlock immediately on the dashboard.",
  },
  {
    q: "What counts as a referral?",
    a: "A person who signs up through your personal referral link and verifies their email. Fake or invalid referrals are removed, so use the share buttons on your dashboard.",
  },
  {
    q: "What do I pay for?",
    a: "Nothing until you choose to. Paid packages appear on your dashboard only after you watch module 2: the PDF book, or the bundle with the private WhatsApp and Telegram groups.",
  },
  {
    q: "Will I be charged automatically?",
    a: "Never. Payments are one-time, only when you tap a payment button yourself. Nothing renews and nothing unlocks until your payment is confirmed.",
  },
  {
    q: "How do I contact you?",
    a: "Through the pre-made WhatsApp message to the CEO during the course, or by email after you sign up. Links are on your dashboard.",
  },
  {
    q: "What about my data? Is it private?",
    a: "We collect only what the course and rewards need: your name, email and referral activity. See the Privacy Policy and Terms in the footer.",
  },
];

export const FOOTER = {
  contactEmail: "support@icreatitbrandagency.com", // PLACEHOLDER: confirm support address
  socials: [
    // PLACEHOLDER: real profile URLs
    { id: "instagram", label: "Instagram", href: "https://instagram.com/" },
    { id: "facebook", label: "Facebook", href: "https://facebook.com/" },
    { id: "x", label: "X", href: "https://x.com/" },
  ],
};
