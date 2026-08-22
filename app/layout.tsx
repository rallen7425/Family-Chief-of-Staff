import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { AppHeader } from "@/components/layout/AppHeader";
import { TabPillRow } from "@/components/layout/TabPillRow";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { ChatShell } from "@/components/chat/ChatShell";
import { getFamilyMembers } from "@/lib/data/familyMembers";
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
  title: "Rufus",
  description: "Family Chief of Staff",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const familyMembers = await getFamilyMembers();

  return (
    <html
      lang="en"
      className={`${bricolageGrotesque.variable} ${instrumentSans.variable} antialiased`}
    >
      <body className="font-body bg-mist text-ink border-t-[3px] border-t-primary max-w-[430px] mx-auto min-h-screen relative pb-[140px] shadow-[0_0_20px_rgba(0,0,0,0.05)]">
        <ChatProvider>
          <header className="pt-8 pb-4 px-6 flex flex-col gap-5">
            <AppHeader />
            <TabPillRow />
          </header>
          <main className="px-6 py-2 flex flex-col gap-6">{children}</main>
          <ChatShell familyMembers={familyMembers} />
        </ChatProvider>
      </body>
    </html>
  );
}
