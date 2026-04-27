import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true, 
    environment: "node",
    alias: {
      // This tells Vitest: "When you see @prisma/client, look here instead"
      "@prisma/client": path.resolve(__dirname, "./src/generated/prisma"),
    },
  },
});
