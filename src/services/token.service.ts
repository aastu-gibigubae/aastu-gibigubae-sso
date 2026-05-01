import jwt, { SignOptions } from "jsonwebtoken";
import { envConfig } from "../config/config.js";
import { tokenType } from "../types/token.js";
import { AppError } from "../types/error.js";
import { App } from "supertest/types.js";
import { errorService } from "./error.service.js";
class TokenService {
  generateEmailVerifyToken(payload: tokenType, options: SignOptions) {
    return jwt.sign(payload, envConfig.EMAIL_TOKEN_SECRET, options);
  }
  generateSecurityToken(payload: tokenType, options: SignOptions) {
    return jwt.sign(payload, envConfig.JWT_PRIVATE_KEY, options);
  }

  verifyEmailToken(token: string) {
    try {
      return jwt.verify(token, envConfig.EMAIL_TOKEN_SECRET);
    } catch (err) {
      throw errorService("Verification link is invalid or has expired", 400);
    }
  }
}

const tokenService = new TokenService();
export default tokenService;
