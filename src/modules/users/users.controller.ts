import { NextFunction, Request, Response } from "express";
import { errorService } from "../../services/error.service.js";
import { prisma } from "../../config/db.js";
import { userSafeSelect } from "../../services/db.select/user.select.js";
import { createAuditLog } from "../../services/audit.service.js";
import { Role } from "../../generated/prisma/client.js";
import { ZodError } from "zod";

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      await createAuditLog({
        action: "GET_ME_FAILED_UNAUTHENTICATED",
        targetRole: Role.user,
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "security_event",
          reason: "missing_auth_user",
        },
      });

      throw errorService("Authentication required", 401);
    }

    const { id } = req.user;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { ...userSafeSelect },
    });

    if (!user) {
      await createAuditLog({
        actorId: id,
        targetId: id,
        actorRole: Role.user,
        targetRole: Role.user,
        action: "GET_ME_FAILED_USER_NOT_FOUND",
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "read",
          reason: "user_not_found",
        },
      });

      throw errorService("User not found", 404);
    }

    await createAuditLog({
      actorId: id,
      targetId: id,
      actorPhoneNumber: user.phoneNumber,
      targetPhoneNumber: user.phoneNumber,
      actorRole: Role.user,
      targetRole: Role.user,
      action: "GET_ME_SUCCESS",
      ipAddress: req.ip ?? "unknown",
      deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
      changes: {
        type: "read",
        fields: "profile_accessed",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: user,
    });
  } catch (err) {
    if (req.user) {
      await createAuditLog({
        actorId: req.user.id,
        actorRole: Role.user,
        action: "GET_USER_SUCCESS",
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "error_event",
          error: (err as Error).message,
        },
      });
    }
    next(err);
  }
};

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      await createAuditLog({
        action: "GET_ALL_FAILED_UNAUTHENTICATED",
        targetRole: Role.user,
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "security_event",
          reason: "missing_auth_user",
        },
      });
      throw errorService("Authentication required", 401);
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(
      Math.max(parseInt(req.query.limit as string) || 10, 1),
      50,
    );
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          ...userSafeSelect,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.user.count(),
    ]);
    const totalPages =  Math.ceil(total / limit);
    await createAuditLog({
      actorId: req.user.id,
      actorRole: Role.user,
      action: "GET_ALL_USERS_SUCCESS",
      ipAddress: req.ip ?? "unknown",
      deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
      changes: {
        type: "read",
        page,
        limit,
        totalFetched: users.length,
        totalUsers: total,
      },
    });
    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages
      },
    });
  } catch (err) {
    if (req.user) {
      await createAuditLog({
        actorId: req.user.id,
        actorRole: Role.user,
        action: "GET_ALL_USERS_FAILED",
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "error_event",
          error: (err as Error).message,
        },
      });
    }
    next(err);
  }
};
