import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";
import "./product.css";

const SITE = "https://prompt2md.vercel.app";
const DESCRIPTION =
  "Turn anything into token-optimized, layout-aware Markdown — and know exactly what it saved you. Compression is lossless: every summarized section resolves back to the byte-exact original.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "prompt2md — A Markdown Magic",
  description: DESCRIPTION,
  applicationName: "prompt2md",
  keywords: [
    "markdown",
    "token optimization",
    "LLM context",
    "prompt engineering",
    "MCP server",
    "document conversion",
    "prompt compression",
  ],
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "prompt2md",
    title: "prompt2md — A Markdown Magic",
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "prompt2md — A Markdown Magic" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "prompt2md — A Markdown Magic",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Runs before first paint: scroll-reveal only hides content once we
            know JS is alive to reveal it again. Without this, a blocked or
            failed script would leave the page blank. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js')`,
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="masthead">
          <div className="masthead-inner">
            <Link className="brand-lockup" href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand-icon.svg" alt="" width={36} height={36} className="mark" />
              <span className="brand-block">
                <span className="brand">
                  prompt<span className="brand-accent">2md</span>
                </span>
                <span className="tagline">A Markdown Magic</span>
              </span>
            </Link>
            <nav className="header-nav" aria-label="Primary">
              <a href="/#how">How it works</a>
              <a href="/#install">Install</a>
              <a
                href={process.env["NEXT_PUBLIC_DOCS_URL"] ?? "https://prompt2md-docs.vercel.app"}
                target="_blank"
                rel="noreferrer"
              >
                Docs
              </a>
              <a href="https://github.com/Hotragn/Prompt2MD" target="_blank" rel="noreferrer">
                GitHub
              </a>
              <Link className="nav-cta" href="/studio">
                Open studio
              </Link>
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="container">
            Apache-2.0 · dual-engine pipeline (MarkItDown fast path / Docling high fidelity) ·
            savings math per ADR-003 · token counts are approximate (chars/4) unless an exact
            tokenizer is configured
          </div>
        </footer>
      </body>
    </html>
  );
}
