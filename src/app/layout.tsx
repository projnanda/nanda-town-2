import type { Metadata } from "next";
import { Instrument_Serif, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nanda Town 2",
  description:
    "A registry and live inspector for the internet of agents. Every listing is probed; every claim is a timestamped observation.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

const nav = [
  { href: "/records", label: "Registry" },
  { href: "/#inspect", label: "Inspect" },
  { href: "/list", label: "Open a plot" },
  { href: "/docs", label: "Docs" },
  { href: "/status", label: "Status" },
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrument.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-card/85 backdrop-blur-sm sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Image src="/brand/nest-logo.png" alt="" width={30} height={30} className="opacity-90" />
              <span className="display text-[1.35rem] leading-none">Nanda Town</span>
              <span className="mono text-accent text-[0.8rem] font-medium border border-accent rounded-full px-1.5 leading-tight">
                2
              </span>
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="mono text-[0.7rem] uppercase tracking-[0.18em] text-muted hover:text-ink px-2.5 py-1.5 rounded-full hover:bg-card-2 whitespace-nowrap"
                >
                  {n.label}
                </Link>
              ))}
              <a
                href={process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/projnanda"}
                className="mono text-[0.7rem] uppercase tracking-[0.18em] text-muted hover:text-ink px-2.5 py-1.5 rounded-full hover:bg-card-2"
              >
                GitHub ↗
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line mt-16 bg-card">
          <div className="mx-auto max-w-6xl px-5 py-8 flex flex-wrap gap-x-8 gap-y-2 items-baseline">
            <span className="survey-label">Nanda Town 2 — a town under survey</span>
            <span className="mono text-[0.7rem] text-faint">
              an open project by Project NANDA · Foundation for Agentic Networks
            </span>
            <span className="mono text-[0.7rem] text-faint">
              every number on this site is a timestamped observation
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
