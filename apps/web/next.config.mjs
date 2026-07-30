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
  serverExternalPackages: ["@prompt2md/core", "@prompt2md/hermes-mcp"],
};

export default nextConfig;
