import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./databases/prisma/schema.prisma",
  migrations: {
    path: "./databases/prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

// DB push: npx prisma db push --config src/prisma.config.ts