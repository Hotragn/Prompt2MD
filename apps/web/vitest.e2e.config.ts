import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["e2e/**/*.e2e.ts"],
    globalSetup: "./e2e/global-setup.ts",
    testTimeout: 120_000,
    hookTimeout: 240_000,
    fileParallelism: false,
  },
});
