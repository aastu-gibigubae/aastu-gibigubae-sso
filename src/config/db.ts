import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
const DATABASE_URL =
  process.env.NODE_ENV === "test"
    ? process.env.DATABASE_URL_TESTING
    : process.env.NODE_ENV === "production"
      ? process.env.DATABASE_URL_PRODUCTION
      : process.env.DATABASE_URL;
const connectionString = `${DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
export { prisma };
