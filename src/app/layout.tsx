import type { Metadata } from "next";
import { Bricolage_Grotesque, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Nanda Town 2",
  description:
    "A registry and live inspector for the internet of agents. Every listing is probed; every claim is a timestamped observation.",
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
      className={`${bricolage.variable} ${publicSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-card/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-baseline gap-2 shrink-0">
              <span className="display text-lg font-bold tracking-tight">NANDA TOWN</span>
              <span className="mono text-accent text-sm font-medium border border-accent rounded px-1 leading-tight">
                2
              </span>
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="mono text-[0.72rem] uppercase tracking-widest text-muted hover:text-ink px-2.5 py-1.5 rounded hover:bg-card-2 whitespace-nowrap"
                >
                  {n.label}
                </Link>
              ))}
              <a
                href={process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/projnanda"}
                className="mono text-[0.72rem] uppercase tracking-widest text-muted hover:text-ink px-2.5 py-1.5 rounded hover:bg-card-2"
              >
                GitHub ↗
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line mt-16">
          <div className="mx-auto max-w-6xl px-5 py-8 flex flex-wrap gap-x-8 gap-y-2 items-baseline">
            <span className="survey-label">Nanda Town 2 — survey in progress</span>
            <span className="mono text-[0.7rem] text-faint">
              an open-source project by Project NANDA · Foundation for Agentic Networks
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
