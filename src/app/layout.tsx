import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";
import { MedalModal } from "@/components/ui/MedalModal";
import { PointsBadge } from "@/components/ui/PointsBadge";
import { RewardsHydrator } from "@/components/ui/RewardsHydrator";
import { SoundToggle } from "@/components/ui/SoundToggle";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SumCraft - Maths Games",
  description: "Fun, interactive maths missions for curious minds aged 8 to 14.",
  // Label under the icon when saved to an iPhone/iPad home screen.
  appleWebApp: { title: "SumCraft", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#7B5CFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="px-3 sm:px-8 py-3 flex items-center justify-between gap-2 sm:gap-3">
          <Link
            href="/"
            className="inline-flex min-w-0 items-center gap-2 rounded-2xl px-1 sm:px-2 py-1 focus-visible:outline-4 focus-visible:outline-grape"
          >
            <Mascot className="w-10 h-10 sm:w-12 sm:h-12 shrink-0" />
            <span className="font-display text-xl sm:text-2xl font-semibold text-grape-dark">
              SumCraft{" "}
              <span className="hidden md:inline text-ink-soft font-medium">- Maths Games</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <PointsBadge />
            <SoundToggle />
          </div>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <RewardsHydrator />
        <MedalModal />
        <footer className="py-6 text-center text-sm text-ink-soft">
          Made with 🧡 for curious mathematicians
        </footer>
      </body>
    </html>
  );
}
