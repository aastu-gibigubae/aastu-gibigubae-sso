import { NextFunction, Request, Response } from "express";
import { errorService } from "../services/error.service.js";
import tokenService from "../services/token.service.js";
import { tokenType } from "../types/token.js";
import { prisma } from "../config/db.js";
import { Role } from "../generated/prisma/enums.js";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
      permissions: user.permissions,
    };
    next();
  } catch (err) {
    next(err);
  }
};

export const authorizeRoles = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw errorService("Forbidden", 403);
      }
      if (!roles.includes(req.user.role)) {
        throw errorService("Forbidden", 403);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

export const authorizePermissions = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw errorService("Forbidden", 403);
      }
      if (req.user.role == Role.admin) {
        return next();
      }
      const hasPermisson = permissions.every((permissions) =>
        req.user?.permissions.includes(permissions),
      );
      if (!hasPermisson) {
        throw errorService("Forbidden", 403);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};
