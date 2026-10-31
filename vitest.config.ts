import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxDev: false,
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "dist", "out", "tests/integration/**"],
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./coverage/junit.xml",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["lib/**", "app/actions/**", "app/api/**", "components/**"],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 20,
        statements: 30,
      },
    },
  },
});
