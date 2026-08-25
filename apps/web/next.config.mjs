import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Confine output file tracing to the monorepo.
  //
  // Without this, Next infers the tracing root by walking up looking for a
  // lockfile. A stray package-lock.json in the user's home directory makes it
  // choose $HOME and scan the entire profile — which on Windows walks into the
  // protected "Application Data" junction and kills the build with
  // `EPERM: operation not permitted, scandir`. That is precisely what broke
  // windows-latest in CI while ubuntu-latest passed: Linux has no such
  // junction, so the same over-broad scan succeeded there.
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),

  // Keep the pipeline packages un-bundled: the markitdown engine resolves its
  // Python worker via import.meta.url, which bundling would break.
  serverExternalPackages: ["@prompt2md/core"],

  /**
   * Defence in depth, not the primary control.
   *
   * The studio renders converted Markdown through `marked` and then DOMPurify
   * (app/studio/page.tsx), which is the actual defence and is correctly ordered.
   * This is the layer that still holds if that call is ever removed in a
   * refactor, or if a DOMPurify bypass lands before an upgrade does — the
   * failure mode of a sanitizer is total, so it should not be the only thing
   * standing between hostile input and script execution.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' is load-bearing: app/layout.tsx runs a tiny inline
      // bootstrap before first paint so scroll-reveal only hides content when
      // JS is alive to reveal it. Replacing it with a nonce is the follow-up
      // that lets this drop.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // blob: covers the object URLs the studio makes for file drops; data:
      // covers the inline SVG brand marks.
      "img-src 'self' data: blob:",
      "media-src 'self'",
      "font-src 'self'",
      // Same-origin only. The API routes are the sole thing the page calls,
      // and there is no analytics or third-party script to allow for.
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // microphone=(self) is required, not boilerplate: the studio offers
          // Web Speech dictation. Everything else is denied.
          { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=(self), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
