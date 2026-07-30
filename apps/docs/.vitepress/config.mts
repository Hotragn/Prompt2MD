import { defineConfig } from "vitepress";

export default defineConfig({
  title: "prompt2md",
  description:
    "A Markdown Magic — token-optimized, layout-aware Markdown conversion with honest savings reports. Nothing is ever lost.",
  srcDir: "../../docs",
  ignoreDeadLinks: true, // repo-relative links (packages/, fixtures/) resolve on GitHub, not here
  head: [["link", { rel: "icon", href: "/brand-icon.svg" }]],
  themeConfig: {
    logo: "/brand-icon.svg",
    siteTitle: "prompt2md",
    nav: [
      { text: "Guide", link: "/getting-started" },
      { text: "Architecture", link: "/architecture" },
      { text: "Brand", link: "/BRAND" },
      { text: "Roadmap", link: "/ROADMAP" },
      { text: "Studio", link: "https://prompt2md.vercel.app" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting started", link: "/getting-started" },
          { text: "Integrations", link: "/INTEGRATIONS" },
        ],
      },
      {
        text: "Architecture",
        items: [
          { text: "System architecture", link: "/architecture" },
          { text: "ADR-001 · Dual-engine pipeline", link: "/adr/ADR-001-dual-engine" },
          { text: "ADR-002 · Engine selection", link: "/adr/ADR-002-engine-selection" },
          { text: "ADR-003 · Token savings math", link: "/adr/ADR-003-token-savings" },
        ],
      },
      {
        text: "Design",
        items: [
          { text: "Brand & UI profile", link: "/BRAND" },
          { text: "UI landscape research", link: "/research/UI-LANDSCAPE" },
        ],
      },
      {
        text: "Research",
        items: [
          { text: "Engines (Docling / MarkItDown)", link: "/research/ENGINES" },
          { text: "Competitive landscape", link: "/research/COMPETITIVE-LANDSCAPE" },
        ],
      },
      {
        text: "Project",
        items: [
          { text: "Roadmap", link: "/ROADMAP" },
          { text: "Daily Digest archive", link: "/digests/" },
          { text: "Digest sources & vetting", link: "/DIGEST-SOURCES" },
        ],
      },
    ],
    search: { provider: "local" },
    footer: {
      message: "A Markdown Magic · Apache-2.0",
    },
  },
});
