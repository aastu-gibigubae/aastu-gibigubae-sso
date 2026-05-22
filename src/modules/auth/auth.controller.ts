import type { NextFunction, Request, Response } from "express";
import {
  emailTokenSchema,
  loginSchema,
  passwordRequestSchema,
  passwordTokenSchema,
  passwordVerifySchema,
  registerSchema,
  updatePasswordSchema,
} from "./auth.schema.js";
import { ZodError } from "zod";
import { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import type { AppError } from "../../types/error.js";
import { prisma } from "../../config/db.js";

import { envConfig } from "../../config/config.js";
import { createAuditLog } from "../../services/audit.service.js";
import tokenService from "../../services/token.service.js";
import { errorService } from "../../services/error.service.js";
import { userSafeSelect } from "../../services/db.select/user.select.js";
import { cookieOptions } from "../../config/cookie.option.js";
import { Department, Role } from "../../generated/prisma/client.js";
import { error } from "node:console";
import { tokenType } from "../../types/token.js";
import { passwordResetTemplate } from "../../templates/passwordReset.js";
import { sendEmail } from "../../utils/mailer.js";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = registerSchema.parse(req.body);

    const {
      firstName,
      fatherName,
      rememberMe,
      phoneNumber,
      password,
      gender,
      studentId,
      department,
    } = data;

    const admissionYear = parseInt("20" + studentId.split("/")[1]);

    const passwordHash = await bcrypt.hash(password, 12);

    const role = Role.user;

    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber },
    });
    if (existingUser) {
      await createAuditLog({
        action: "REGISTER_FAILED_USER_EXISTS",
        targetRole: Role.user,
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "security_event",
          reason: "phone_number_already_exists",
        },
      });
      throw errorService("User with this phone number already exists", 409);
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        fatherName,
        phoneNumber,
        gender,
        studentId,
        admissionYear,
        role,
        passwordHash,
        department: department as Department,
      },
      select: {
        ...userSafeSelect,
      },
    });
    const userId = user.id;
    const accessTokenOptions: SignOptions = {
      expiresIn: envConfig.ACCESS_TOKEN_EXPIRATION as SignOptions["expiresIn"],
      algorithm: "RS256",
    };
    const refreshTokenOptions: SignOptions = {
      expiresIn: rememberMe
        ? (envConfig.REFRESH_TOKEN_EXPIRATION_REMEMBER_ME as SignOptions["expiresIn"])
        : (envConfig.REFRESH_TOKEN_EXPIRATION as SignOptions["expiresIn"]),
      algorithm: "RS256",
    };
    const accessTokenPayLoad = {
      userId,
      type: "ACCESS_TOKEN",
    };
    const refreshTokenPayLoad = {
      userId,
      type: "REFRESH_TOKEN",
    };
    const accessToken = tokenService.generateSecurityToken(
      accessTokenPayLoad,
      accessTokenOptions,
    );
    const refreshToken = tokenService.generateSecurityToken(
      refreshTokenPayLoad,
      refreshTokenOptions,
    );
    const refreshTokenExpiry = rememberMe
      ? 1000 * 60 * 60 * 24 * 90
      : 1000 * 60 * 60 * 24 * 2;
    res.cookie("refresh-token", refreshToken, {
      ...cookieOptions,
      maxAge: refreshTokenExpiry,
    });
    await createAuditLog({
      actorId: user.id,
      targetId: user.id,
      actorRole: Role.user,
      targetRole: Role.user,
      action: "USER_REGISTERED",

      actorFirstName: user.firstName,
      actorFatherName: user.fatherName,
      actorStudentId: user.studentId,
      actorPhoneNumber: user.phoneNumber,

      targetFirstName: user.firstName,
      targetFatherName: user.fatherName,
      targetStudentId: user.studentId,
      targetPhoneNumber: user.phoneNumber,

      ipAddress: req.ip ?? "unknown",
      deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
      changes: {
        type: "create",
        createdFields: [
          "firstName",
          "fatherName",
          "phoneNumber",
          "gender",
          "studentId",
          "department",
          "password",
        ],
      },
    });
    const tokenHash = tokenService.generateHashToken(refreshToken);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        tokenHash,
        ipAddress: req.ip ?? "unknown",
        expiresAt: new Date(Date.now() + refreshTokenExpiry),
        lastUsedAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Register successful",
      data: user,
      accessToken,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const error: AppError = new Error(
        err.issues.map((e) => e.message).join(", "),
      );
      error.status = 400;
      return next(error);
    }

    next(err);
  }
};
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.body;
    if (!token) {
      throw errorService("Verification token is required", 400);
    }
    const decoded = tokenService.verifyEmailToken(token);
    const { userId, type } = emailTokenSchema.parse(decoded);
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw errorService("User not found", 404);
    }
    if (user.isEmailVerified) {
      throw errorService("User is already verified", 409);
    }
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isEmailVerified: true,
      },
      select: userSafeSelect,
    });
    await createAuditLog({
      actorId: updatedUser.id,
      targetId: updatedUser.id,

      actorRole: Role.user,
      targetRole: Role.user,

      action: "EMAIL_VERIFIED",

      actorEmail: updatedUser.email || "undefined",
      actorFirstName: updatedUser.firstName,
      actorFatherName: updatedUser.fatherName,
      actorStudentId: updatedUser.studentId,

      targetEmail: updatedUser.email || "undefnied",
      targetFirstName: updatedUser.firstName,
      targetFatherName: updatedUser.fatherName,
      targetStudentId: updatedUser.studentId,

      ipAddress: req.ip ?? "unknown",
      deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",

      changes: {
        type: "update",
        updatedFields: ["isEmailVerified"],
        before: {
          isEmailVerified: false,
        },
        after: {
          isEmailVerified: true,
        },
      },
    });

    const accessTokenOptions: SignOptions = {
      expiresIn: envConfig.ACCESS_TOKEN_EXPIRATION as SignOptions["expiresIn"],
      algorithm: "RS256",
    };
    const refreshTokenOptions: SignOptions = {
      expiresIn:
        envConfig.REFRESH_TOKEN_EXPIRATION_REMEMBER_ME as SignOptions["expiresIn"],
      algorithm: "RS256",
    };
    const accessTokenPayLoad = {
      userId,
      type: "ACCESS_TOKEN",
    };
    const refreshTokenPayLoad = {
      userId,
      type: "REFRESH_TOKEN",
    };
    const accessToken = tokenService.generateSecurityToken(
      accessTokenPayLoad,
      accessTokenOptions,
    );
    const refreshToken = tokenService.generateSecurityToken(
      refreshTokenPayLoad,
      refreshTokenOptions,
    );

    res.cookie("refresh-token", refreshToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 90,
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: updatedUser,
      accessToken,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const error: AppError = new Error(
        err.issues.map((e) => e.message).join(", "),
      );
      await createAuditLog({
        targetRole: Role.user,
        action: "EMAIL_VERIFICATION_FAILED",
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",

        changes: {
          type: "security_event",
          reason: "invalid_or_expired_token",
        },
      });
      error.status = 400;
      return next(error);
    }

    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let user;
    const data = loginSchema.parse(req.body);
    const { phoneNumber, password, rememberMe } = data;
    user = await prisma.user.findUnique({
      where: {
        phoneNumber,
      },
    });
    if (user == null) {
      await createAuditLog({
        action: "LOGIN_FAILED_USER_NOT_FOUND",
        targetRole: Role.user,
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: { type: "security_event", reason: "user_not_found" },
      });
      throw errorService("User not found", 404);
    }

    if (user.loginAttempts >= 3 && user.lastLoginAt != null) {
      const now = new Date();
      const lastAttempt = new Date(user.lastLoginAt);
      const diffInMins = now.getTime() - lastAttempt.getTime();
      const fiveMins = 60000 * 5;
      if (diffInMins < fiveMins) {
        throw errorService(
          "Too many login attempts. Try again in 5 minutes.",
          429,
        );
      }
    }
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await prisma.user.update({
        where: {
          phoneNumber,
        },
        data: {
          loginAttempts: { increment: 1 },
          lastLoginAt: new Date(),
        },
      });

      await createAuditLog({
        actorId: user.id,
        targetId: user.id,
        actorRole: Role.user,
        targetRole: Role.user,
        action: "LOGIN_FAILED_WRONG_PASSWORD",
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: { type: "security_event", reason: "invalid_password" },
      });
      throw errorService("Invalid phoneNumber or password", 401);
    }
    let userId = user.id;
    const accessTokenOptions: SignOptions = {
      expiresIn: envConfig.ACCESS_TOKEN_EXPIRATION as SignOptions["expiresIn"],
      algorithm: "RS256",
    };
    const refreshTokenOptions: SignOptions = {
      expiresIn: rememberMe
        ? (envConfig.REFRESH_TOKEN_EXPIRATION_REMEMBER_ME as SignOptions["expiresIn"])
        : (envConfig.REFRESH_TOKEN_EXPIRATION as SignOptions["expiresIn"]),
      algorithm: "RS256",
    };
    const accessTokenPayLoad = {
      userId,
      type: "ACCESS_TOKEN",
    };
    const refreshTokenPayLoad = {
      userId,
      type: "REFRESH_TOKEN",
    };
    const accessToken = tokenService.generateSecurityToken(
      accessTokenPayLoad,
      accessTokenOptions,
    );
    const refreshToken = tokenService.generateSecurityToken(
      refreshTokenPayLoad,
      refreshTokenOptions,
    );
    await createAuditLog({
      actorId: user.id,
      targetId: user.id,
      actorRole: Role.user,
      targetRole: Role.user,
      action: "LOGIN_SUCCESS",

      actorFirstName: user.firstName,
      actorFatherName: user.fatherName,
      actorStudentId: user.studentId,
      actorPhoneNumber: user.phoneNumber,

      targetFirstName: user.firstName,
      targetFatherName: user.fatherName,
      targetStudentId: user.studentId,
      targetPhoneNumber: user.phoneNumber,

      ipAddress: req.ip ?? "unknown",
      deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
      changes: { type: "auth_event", reason: "successful_login" },
    });
    const refreshTokenExpiry = rememberMe
      ? 1000 * 60 * 60 * 24 * 90
      : 1000 * 60 * 60 * 24 * 2;

    res.cookie("refresh-token", refreshToken, {
      ...cookieOptions,
      maxAge: refreshTokenExpiry,
    });
    const tokenHash = tokenService.generateHashToken(refreshToken);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        ipAddress: req.ip ?? "unknown",
        expiresAt: new Date(Date.now() + refreshTokenExpiry),
        lastUsedAt: new Date(),
      },
    });
    user = await prisma.user.update({
      where: {
        phoneNumber,
      },
      data: {
        lastLoginAt: new Date(),
        loginAttempts: 0,
      },
      select: {
        ...userSafeSelect,
      },
    });
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: user,
      accessToken,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const error: AppError = new Error(
        err.issues.map((e) => e.message).join(", "),
      );
      await createAuditLog({
        targetRole: Role.user,
        action: "Login_FAILED",
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",

        changes: {
          type: "security_event",
          reason: "invalid_or_expired_token",
        },
      });
      error.status = 400;
      return next(error);
    }
    next(err);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = req.cookies["refresh-token"];

    // ❌ Missing token
    if (!refreshToken) {
      await createAuditLog({
        action: "REFRESH_TOKEN_FAILED_MISSING",
        targetRole: Role.user,
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "security_event",
          reason: "missing_refresh_token",
        },
      });

      throw errorService("Refresh token missing", 401);
    }

    const decoded = tokenService.verifySecurityToken(refreshToken) as tokenType;

    if (decoded.type !== "REFRESH_TOKEN") {
      await createAuditLog({
        action: "REFRESH_TOKEN_FAILED_INVALID_TYPE",
        targetRole: Role.user,
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "security_event",
          reason: "invalid_token_type",
        },
      });

      throw errorService("Invalid refresh token", 401);
    }

    const tokenHash = tokenService.generateHashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (!storedToken) {
      await createAuditLog({
        action: "REFRESH_TOKEN_FAILED_NOT_FOUND",
        targetRole: Role.user,
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "security_event",
          reason: "token_not_in_db",
        },
      });

      throw errorService("Invalid refresh token", 401);
    }

    if (storedToken.expiresAt < new Date()) {
      await createAuditLog({
        action: "REFRESH_TOKEN_FAILED_EXPIRED",
        actorId: storedToken.userId,
        targetId: storedToken.userId,
        actorRole: Role.user,
        targetRole: Role.user,
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "security_event",
          reason: "refresh_token_expired",
        },
      });

      throw errorService("Refresh token expired", 401);
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        lastUsedAt: new Date(),
      },
    });

    const accessToken = tokenService.generateSecurityToken(
      {
        userId: decoded.userId,
        type: "ACCESS_TOKEN",
      },
      {
        expiresIn:
          envConfig.ACCESS_TOKEN_EXPIRATION as SignOptions["expiresIn"],
        algorithm: "RS256",
      },
    );

    await createAuditLog({
      actorId: storedToken.userId,
      targetId: storedToken.userId,
      actorRole: Role.user,
      targetRole: Role.user,
      action: "REFRESH_TOKEN_SUCCESS",

      ipAddress: req.ip ?? "unknown",
      deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",

      changes: {
        type: "auth_event",
        reason: "access_token_issued",
      },
    });

    return res.json({
      success: true,
      message: "Access token generated successfully",
      accessToken,
    });
  } catch (err) {
    await createAuditLog({
      action: "REFRESH_TOKEN_SYSTEM_ERROR",
      targetRole: Role.user,
      ipAddress: req.ip ?? "unknown",
      deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
      changes: {
        type: "system_error",
        reason: "unexpected_refresh_failure",
      },
    });

    return next(err);
  }
};

export const passwordResetRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = passwordRequestSchema.parse(req.body);
    const { email } = data;
    const user = await prisma.user.findFirst({
      where: {
        email,
      },
    });
    if (user == null) {
      await createAuditLog({
        action: "PASSWORD_RESET_REQUEST_FAILED",
        actorEmail: email,
        targetEmail: email,
        targetRole: Role.user,
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: { type: "security_event", reason: "user_not_found" },
      });
      throw errorService("User not found", 404);
    }
    if (!user.isEmailVerified) {
      await createAuditLog({
        actorId: user.id,
        targetId: user.id,
        actorRole: Role.user,
        targetRole: Role.user,
        action: "PASSWORD_RESET_REQUEST_FAILED",
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: { type: "security_event", reason: "email_not_verified" },
      });
      throw errorService(
        "Email not verified. Please verify your email or register again to receive a new verification email.",
        403,
      );
    }
    const userId = user.id;
    const payload = {
      userId,
      type: "PASSWORD_VERIFICATION",
    };
    const options: SignOptions = {
      expiresIn:
        envConfig.PASSWORD_RESET_TOKEN_EXPIRY as SignOptions["expiresIn"],
    };
    const token = tokenService.generatePasswordResetToken(payload, options);
    const verificationLink = `https://your-frontend.com/password-reset?token=${token}`;

    const html = passwordResetTemplate(
      user.firstName,
      verificationLink,
      // "https://res.cloudinary.com/dgwhbsdqc/image/upload/v1777199587/aastugibgubaeLogo_lzneun.jpg",
    );
    await sendEmail({
      to: email,
      subject: "Reset Your AASTU GibiGubae Password",
      html,
    });
    await createAuditLog({
      actorId: user.id,
      targetId: user.id,
      actorRole: Role.user,
      targetRole: Role.user,
      actorFirstName: user.firstName,
      targetFirstName: user.firstName,
      actorFatherName: user.fatherName,
      targetFatherName: user.fatherName,
      actorStudentId: user.studentId,
      targetStudentId: user.studentId,
      action: "PASSWORD_RESET_REQUESTED",
      ipAddress: req.ip ?? "unknown",
      deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
      changes: { type: "security_event", reason: "password_reset_email_sent" },
    });
    return res.status(201).json({
      success: true,
      message: "Password reset instructions sent to your email",
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const error: AppError = new Error(
        err.issues.map((e) => e.message).join(", "),
      );
      await createAuditLog({
        action: "PASSWORD_RESET_EMAIL_FAILED",
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "security_event",
          reason: "email_delivery_failed",
          endpoint: "/auth/password-reset/request",
        },
      });
      error.status = 400;
      return next(error);
    }
    next(err);
  }
};

export const passwordVerify = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = passwordVerifySchema.parse(req.body);
    const { newPassword, resetToken } = data;

    const decoded = tokenService.verifyPasswordToken(resetToken);
    const { userId, type } = passwordTokenSchema.parse(decoded);
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        ...userSafeSelect,
      },
    });
    if (!user) {
      await createAuditLog({
        targetRole: Role.user,
        action: "PASSWORD_RESET_FAILED",
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: { type: "security_event", reason: "user_not_found" },
      });
      throw errorService("User not found", 404);
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: {
        phoneNumber: user.phoneNumber,
      },
      data: {
        passwordHash,
      },
    });
    const accessTokenOptions: SignOptions = {
      expiresIn: envConfig.ACCESS_TOKEN_EXPIRATION as SignOptions["expiresIn"],
      algorithm: "RS256",
    };
    const refreshTokenOptions: SignOptions = {
      expiresIn:
        envConfig.REFRESH_TOKEN_EXPIRATION_REMEMBER_ME as SignOptions["expiresIn"],
      algorithm: "RS256",
    };
    const accessTokenPayLoad = {
      userId,
      type: "ACCESS_TOKEN",
    };
    const refreshTokenPayLoad = {
      userId,
      type: "REFRESH_TOKEN",
    };
    const accessToken = tokenService.generateSecurityToken(
      accessTokenPayLoad,
      accessTokenOptions,
    );
    const refreshToken = tokenService.generateSecurityToken(
      refreshTokenPayLoad,
      refreshTokenOptions,
    );

    res.cookie("refresh-token", refreshToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 90,
    });
    await createAuditLog({
      actorId: user.id,
      targetId: user.id,
      actorRole: Role.user,
      targetRole: Role.user,
      actorFirstName: user.firstName,
      targetFirstName: user.firstName,
      actorFatherName: user.fatherName,
      targetFatherName: user.fatherName,
      actorStudentId: user.studentId,
      targetStudentId: user.studentId,
      action: "PASSWORD_RESET_SUCCESS",
      ipAddress: req.ip ?? "unknown",
      deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
      changes: { type: "update", updatedFields: ["passwordHash"] },
    });
    res.status(201).json({
      success: true,
      message: "Password has been reset successfully.",
      data: user,
      accessToken,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const error: AppError = new Error(
        err.issues.map((e) => e.message).join(", "),
      );
      await createAuditLog({
        action: "PASSWORD_RESET_TOKEN_VERIFY_FAILED",
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "security_event",
          reason: "invalid_or_expired_reset_token",
          endpoint: "/auth/password-reset/verify",
        },
      });
      error.status = 400;
      return next(error);
    }
    next(err);
  }
};

export const updatePassword = async (
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
    });

    if (!user) {
      await createAuditLog({
        actorId: id,
        targetId: id,
        actorRole: Role.user,
        targetRole: Role.user,
        action: "UPDATE_PASSWORD_FAILED_USER_NOT_FOUND",
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "read",
          reason: "user_not_found",
        },
      });

      throw errorService("User not found", 404);
    }
    const data = updatePasswordSchema.parse(req.body);
    const { oldPassword, newPassword } = data;
    const isValidPassword = await bcrypt.compare(
      oldPassword,
      user.passwordHash,
    );
    if (!isValidPassword) {
      await createAuditLog({
        actorId: user.id,
        targetId: user.id,
        actorRole: Role.user,
        targetRole: Role.user,
        action: "UPDATE_PASSWORD_FAILED_WRONG_PASSWORD",
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: { type: "security_event", reason: "invalid_password" },
      });
      throw errorService("Invalid phoneNumber or password", 401);
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
      },
    });
    await createAuditLog({
      actorId: user.id,
      targetId: user.id,
      actorRole: Role.user,
      targetRole: Role.user,
      actorFirstName: user.firstName,
      targetFirstName: user.firstName,
      actorFatherName: user.fatherName,
      targetFatherName: user.fatherName,
      actorStudentId: user.studentId,
      targetStudentId: user.studentId,
      action: "PASSWORD_UPDATED_SUCCESSFULLY",
      ipAddress: req.ip ?? "unknown",
      deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
      changes: { type: "security_event", reason: "password_reset_email_sent" },
    });
    return res.status(200).json({
      success: true,
      message: "Password updated successful",
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const error: AppError = new Error(
        err.issues.map((e) => e.message).join(", "),
      );
      await createAuditLog({
        action: "PASSWORD_UPDATE_FAILED",
        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",
        changes: {
          type: "security_event",
          reason: "email_delivery_failed",
          endpoint: "/auth/password-reset/request",
        },
      });
      error.status = 400;
      return next(error);
    }
    return next(err);
  }
};
