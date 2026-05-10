import { NextFunction, Request, Response } from "express";
import { errorService } from "../services/error.service.js";
import tokenService from "../services/token.service.js";
import { tokenType } from "../types/token.js";
import { prisma } from "../config/db.js";

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw errorService("Authentication required", 401);
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      throw errorService("Authentication required", 401);
    }
    const decoded = tokenService.verifySecurityToken(token) as tokenType;
    if (decoded.type != "ACCESS_TOKEN") {
      throw errorService("Authentication required", 401);
    }
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
    });
    if (!user) {
      throw errorService("User not found", 404);
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
    };
  } catch (err) {
    next(err);
  }
};
