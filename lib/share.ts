/*
  Ready-made share messages (PRD 6.2 block 3). Plain text, no emojis (PRD 7.4).
  Placeholders: {name} is the sender's first name, {link} the referral link.
*/

export interface ShareMessage {
  id: string;
  label: string;
  text: string;
}

export const SHARE_MESSAGES: ShareMessage[] = [
  {
    id: "status",
    label: "Status caption",
    text:
      "I joined the free AI Foundry and Grant Winning Course by Icreatit Brand. Learn how to win business grants, use AI for your business and market on social media. {link}",
  },
  {
    id: "short",
    label: "Short invite",
    text:
      "Free course for business owners: how to win grants and use AI to grow. I am inviting a few people - are you in? {link}",
  },
  {
    id: "pitch",
    label: "Longer pitch",
    text:
      "I found a free course that teaches business owners how to win grants, use AI to run and scale their business, and market on social media. It unlocks in stages and my link gets you in: {link}",
  },
];

export function fillShareMessage(
  template: string,
  name: string,
  link: string,
): string {
  return template
    .replace("{name}", name)
    .replace("{link}", link);
}

/** The plain-URL fallback variant (works best in in-app browsers). */
export function bareLinkText(link: string): string {
  return `Register here: ${link}`;
}
