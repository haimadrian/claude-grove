import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules/**", "out/**"],
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: {
      junit: "reports/unit-junit.xml",
    },
    coverage: {
      enabled: !!process.env.CI,
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "reports/coverage",
      include: ["src/main/**/*.ts", "src/shared/**/*.ts"],
      exclude: ["**/*.d.ts", "**/*.test.ts", "src/main/index.ts", "src/main/logger.ts"]
    }
  },
  resolve: {
    alias: {
      electron: path.resolve("src/stubs/electron.ts"),
      "electron-log/main.js": path.resolve("src/stubs/electron-log-main.ts"),
      "electron-log/renderer.js": path.resolve("src/stubs/electron-log-main.ts"),
      "electron-log/main": path.resolve("src/stubs/electron-log-main.ts"),
      "electron-log/renderer": path.resolve("src/stubs/electron-log-main.ts")
    }
  }
});
