import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "prompt2md studio",
  description:
    "Turn anything into token-optimized, layout-aware Markdown — and know exactly what it saved you.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="header">
            <span className="brand">prompt2md</span>
            <span className="tagline">
              token-optimized Markdown, with receipts — nothing is ever lost
            </span>
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
