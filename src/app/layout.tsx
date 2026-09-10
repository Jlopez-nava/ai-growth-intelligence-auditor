import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Growth Intelligence Demo — Evidence-led growth audits",
  description: "AI-powered website, competitive, lifecycle, and onboarding audits for B2B SaaS and technology companies.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={jakarta.variable} lang="en">
      <body>{children}</body>
    </html>
  );
}
