
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const envSchema = z.object({
  REFRESH_TOKEN_EXPIRATION_REMEMBER_ME: z.string(),
  REFRESH_TOKEN_EXPIRATION: z.string(),
  ACCESS_TOKEN_EXPIRATION: z.string(),
  PASSWORD_RESET_TOKEN_EXPIRY: z.string(),
  EMAIL_TOKEN_SECRET: z.string(),
  EMAIL_VERIFICATION_EXPIRY: z.string(),
  NODE_ENV:z.string(),
  DATABASE_URL: z.string(),

  JWT_PRIVATE_KEY: z.string(),
  JWT_PUBLIC_KEY: z.string(),

  EMAIL_SMTP_HOST: z.string(),
  EMAIL_SMTP_PORT: z.string(),
  EMAIL_SMTP_USER: z.string(),
  EMAIL_SMTP_PASS: z.string(),
  EMAIL_FROM_NAME: z.string(),
  PORT: z.string(),
});

const env = envSchema.parse(process.env);

export const envConfig = {
  ...env,

  JWT_PRIVATE_KEY: env.JWT_PRIVATE_KEY.replace(/\\n/g, "\n"),
  JWT_PUBLIC_KEY: env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n"),

  EMAIL_SMTP_PORT: Number(env.EMAIL_SMTP_PORT),
};
