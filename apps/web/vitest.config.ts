import { defineConfig } from "vitest/config";

// Scope test discovery to co-located unit tests under lib/ (server logic)
// and components/ (client components) so Vitest never tries to execute
// Next.js route/build artifacts (e.g. .next output) — route handlers import
// `server-only` transitively via `require-admin.ts`, which is why their
// tests read the route source as text instead of importing it (see
// `comp-route-wiring.test.ts`). `components/**` holds plain "use client"
// components with no `server-only` import, so importing/rendering them
// directly is safe.
//
// The default `environment: "node"` covers every `lib/**` test (no DOM
// needed). `components/**/*.test.tsx` files opt into jsdom individually via
// a `// @vitest-environment jsdom` docblock at the top of the file, rather
// than switching the whole suite to jsdom — that keeps the `lib/**` node
// tests on their faster, simpler default.
export default defineConfig({
  // tsconfig.json sets "jsx": "preserve" (Next's own bundler does the real
  // transform); esbuild needs its own setting for the .tsx test files, and
  // "automatic" is the modern React 18 runtime (no `import React` needed in
  // every test file), matching what Next.js itself uses to compile JSX.
  esbuild: {
    jsx: "automatic",
  },
  test: {
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx"],
    environment: "node",
  },
});
