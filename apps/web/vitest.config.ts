import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    /**
     * Above vitest's 5s default, because the first case in a file absorbs that
     * file's module-init cost and these files import `next/server` — which is
     * not a small graph. `guard.test.ts`'s first case measured 4.9s on an ARM64
     * Windows laptop against a body that is a string allocation and a regex:
     * essentially all of it was import, and it cleared the default by 79ms.
     *
     * A timeout is meant to catch a hang, not to encode an assumption about how
     * fast the developer's machine is. 20s still catches a hang and stops the
     * suite failing for the wrong reason on slower hardware.
     */
    testTimeout: 20_000,
  },
});
