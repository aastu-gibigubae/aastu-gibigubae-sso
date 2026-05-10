import { NextFunction, Request, Response } from "express";
import { errorService } from "../../services/error.service.js";
import { prisma } from "../../config/db.js";
import { userSafeSelect } from "../../services/db.select/user.select.js";
import { createAuditLog } from "../../services/audit.service.js";
import { Role } from "../../generated/enums.js";

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
      where: {
        id,
      },
      select: {
        ...userSafeSelect,
      },
    });
    if (!user) {
      throw errorService("User not found", 404);
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};
