import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "prompt2md — A Markdown Magic",
  description:
    "Turn anything into token-optimized, layout-aware Markdown — and know exactly what it saved you.",
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
