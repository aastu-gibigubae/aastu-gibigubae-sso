import { envConfig } from "./config.js";

const isProd = envConfig.NODE_ENV === "production";

export const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ("none" as const) : ("lax" as const),
  path: "/",
  ...(isProd && { domain: ".aastugibigubae.com" }),
};