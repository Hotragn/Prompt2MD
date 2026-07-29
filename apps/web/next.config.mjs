/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the pipeline packages un-bundled: the markitdown engine resolves its
  // Python worker via import.meta.url, which bundling would break.
  serverExternalPackages: ["@prompt2md/core", "@prompt2md/hermes-mcp"],
};

export default nextConfig;
