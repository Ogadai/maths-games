import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SumCraft - Maths Games",
  description: "Fun, interactive maths missions for curious minds aged 8 to 14.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="px-4 sm:px-8 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl px-2 py-1 focus-visible:outline-4 focus-visible:outline-grape"
          >
            <Mascot className="w-12 h-12" />
            <span className="font-display text-2xl font-semibold text-grape-dark">
              SumCraft <span className="text-ink-soft font-medium">- Maths Games</span>
            </span>
          </Link>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="py-6 text-center text-sm text-ink-soft">
          Made with 🧡 for curious mathematicians
        </footer>
      </body>
    </html>
  );
}
