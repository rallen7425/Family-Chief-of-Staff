import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { ASSISTANT_NAME } from "@/lib/config";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: ASSISTANT_NAME,
  description: "Family Chief of Staff",
};

/**
 * Minimal shell only — html/body/fonts/global visual frame. The app's
 * chrome (header, tab row, chat bar) and LockScreen gating live in
 * app/(app)/layout.tsx as of the Identity/Sign-In/Onboarding pass
 * (2026-09-12) — moved out of here so /signin, /signup, and future
 * onboarding routes render standalone instead of inheriting navigation to
 * app screens and a chat bar before anyone's authenticated. The visual
 * frame (mist background, centered narrow column, top accent border)
 * stays here since sign-in should look like part of the same product, not
 * a plain unstyled page.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolageGrotesque.variable} ${instrumentSans.variable} antialiased`}
    >
      <body className="font-body bg-mist text-ink border-t-[3px] border-t-primary max-w-[430px] mx-auto min-h-screen shadow-[0_0_20px_rgba(0,0,0,0.05)]">
        {children}
      </body>
    </html>
  );
}
