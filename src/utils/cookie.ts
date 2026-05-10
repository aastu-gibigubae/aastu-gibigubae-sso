import { envConfig } from "../config/config.js";
const ONE_MIN = 1000 * 60;
const ONE_DAY = ONE_MIN * 60 * 24;

const EXPIRATION_MAP = {
  long: ONE_DAY * 90,
  medium: ONE_DAY * 2,
  short: ONE_MIN * 15,
} as const;

type ExpirationType = keyof typeof EXPIRATION_MAP;
export const getCookieOptions = (expiration: ExpirationType = "short") => ({
  httpOnly: true,
  secure: envConfig.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: EXPIRATION_MAP[expiration],
});
