import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { RefCapture } from "@/components/RefCapture";
import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://techhub.icreatitbrandagency.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AI Foundry and Grant Winning Course | Icreatit Brand Limited",
    template: "%s | Icreatit Brand Limited",
  },
  description:
    "Free AI Foundry and Grant Winning Course. Learn how to win business grants, use AI to run your business and market on social media. Sign up, share your link and unlock.",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Icreatit Brand Limited",
    title: "AI Foundry and Grant Winning Course",
    description:
      "Learn how to win business grants, use AI to run your business and market on social media. Sign up, share your link and unlock.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Foundry and Grant Winning Course",
    description:
      "Learn how to win business grants, use AI to run your business and market on social media. Sign up, share your link and unlock.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          <RefCapture />
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
