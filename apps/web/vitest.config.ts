import { defineConfig } from "vitest/config";

// Scope test discovery to co-located unit tests under lib/ so Vitest never
// tries to execute Next.js route/build artifacts (e.g. .next output).
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
