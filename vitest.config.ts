import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    fileParallelism: false, // testes de integração compartilham DB/Redis
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
