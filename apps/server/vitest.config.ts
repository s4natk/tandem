import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@collab/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    // Pure-logic tests are the default; DB-bound tests are isolated under
    // test/integration and excluded unless RUN_INTEGRATION=1.
    exclude: process.env.RUN_INTEGRATION
      ? []
      : ["test/integration/**/*"],
  },
});
