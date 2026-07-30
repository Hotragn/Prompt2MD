import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
      <body>
        <div className="shell">
          <header className="header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-icon.svg" alt="" width={40} height={40} className="mark" />
            <div className="brand-block">
              <span className="brand">
                prompt<span className="brand-accent">2md</span>
              </span>
              <span className="tagline">A Markdown Magic</span>
            </div>
            <nav className="header-nav">
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
            </nav>
          </header>
          {children}
          <footer className="footer">
            Apache-2.0 · dual-engine pipeline (MarkItDown fast path / Docling high fidelity) ·
            savings math per ADR-003 · token counts are approximate (chars/4) unless an exact
            tokenizer is configured
          </footer>
        </div>
      </body>
    </html>
  );
}
