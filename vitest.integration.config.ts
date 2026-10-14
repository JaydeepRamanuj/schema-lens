import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 60000,
    globalSetup: ["test/helpers/db-global-setup.ts"],
    // PGlite serves one database, so test files share it and must not overlap.
    fileParallelism: false,
  },
});
