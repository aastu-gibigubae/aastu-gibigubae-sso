import type { NextFunction, Request, Response } from "express";
import { registerSchema } from "./auth.schema.js";
import { ZodError } from "zod";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import type { AppError } from "../../types/error.js";
import { prisma } from "../../config/db.js";
import { Department, Role } from "@prisma/client";
import { envConfig } from "../../config/config.js";
import { emailVerificationTemplate } from "../../templates/emailVerification.js";
import { sendEmail } from "../../utils/mailer.js";
import { createAuditLog } from "../../services/audit.service.js";
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
      email,
      phoneNumber,
      password,
      gender,
      studentId,
      department,
    } = data;

    // const expiredTime = rememberMe
    //   ? envConfig.REFRESH_TOKEN_EXPIRATION_REMEMBER_ME
    //   : envConfig.REFRESH_TOKEN_EXPIRATION;

    const admissionYear = parseInt("20" + studentId.split("/")[1]);

    const passwordHash = await bcrypt.hash(password, 12);

    const role = Role.user;
    const options: SignOptions = {
      expiresIn:
        envConfig.EMAIL_VERIFICATION_EXPIRY as SignOptions["expiresIn"],
    };

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // =========================
    // 1. EXISTING VERIFIED USER
    // =========================
    if (existingUser?.isEmailVerified) {
      const error: AppError = new Error("User with this email already exists");
      error.status = 409;
      throw error;
    }

    let userId;
    let token;
    let verificationLink;
    let html;
    // =========================
    // 3. UNVERIFIED USER → UPDATE
    // =========================
    if (existingUser && !existingUser.isEmailVerified) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          firstName,
          fatherName,
          phoneNumber,
          gender,
          studentId,
          admissionYear,
          department: department as Department,
          role,
          passwordHash,
        },
      });
      await createAuditLog({
        actorId: existingUser.id,
        targetId: existingUser.id,

        actorRole: Role.user,
        targetRole: Role.user,

        action: "USER_UPDATED_UNVERIFIED",

        actorEmail: email,
        actorFirstName: firstName,
        actorFatherName: fatherName,
        actorStudentId: studentId,

        targetEmail: email,
        targetFirstName: firstName,
        targetFatherName: fatherName,
        targetStudentId: studentId,

        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",

        changes: {
          type: "update",
          updatedFields: [
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
      userId = existingUser.id;
      token = jwt.sign(
        { userId, type: "EMAIL_VERIFICATION" },
        envConfig.EMAIL_TOKEN_SECRET,
        options
      );
      verificationLink = `https://your-frontend.com/verify-email?token=${token}`;

      html = emailVerificationTemplate(
        firstName,
        verificationLink,
        // "https://res.cloudinary.com/dgwhbsdqc/image/upload/v1777199587/aastugibgubaeLogo_lzneun.jpg",
      );
      await sendEmail({
        to: email,
        subject: "Verify your AASTU GibiGubae account",
        html,
      });

      return res.status(200).json({
        success: true,
        message: "Verification email resent successfully.",
      });
    }

    // =========================
    // 4. NEW USER → CREATE
    // =========================
    if (!existingUser) {
      const newUser = await prisma.user.create({
        data: {
          firstName,
          fatherName,
          email,
          phoneNumber,
          gender,
          studentId,
          admissionYear,
          role,
          passwordHash,
          department: department as Department,
        },
      });
      userId = newUser.id;
      token = jwt.sign(
        { userId, type: "EMAIL_VERIFICATION" },
        envConfig.EMAIL_TOKEN_SECRET,
        options,
      );
      await createAuditLog({
        actorId: newUser.id,
        targetId: newUser.id,

        actorRole: Role.user,
        targetRole: Role.user,

        action: "USER_REGISTERED",

        actorEmail: newUser.email,
        actorFirstName: newUser.firstName,
        actorFatherName: newUser.fatherName,
        actorStudentId: newUser.studentId,

        targetEmail: newUser.email,
        targetFirstName: newUser.firstName,
        targetFatherName: newUser.fatherName,
        targetStudentId: newUser.studentId,

        ipAddress: req.ip ?? "unknown",
        deviceInfo: req.headers["user-agent"]?.toString() ?? "unknown",

        changes: {
          type: "create",
          createdFields: [
            "firstName",
            "fatherName",
            "email",
            "phoneNumber",
            "gender",
            "studentId",
            "department",
            "password",
          ],
        },
      });
      verificationLink = `https://your-frontend.com/verify-email?token=${token}`;

      html = emailVerificationTemplate(
        firstName,
        verificationLink,
        // "https://res.cloudinary.com/dgwhbsdqc/image/upload/v1777199587/aastugibgubaeLogo_lzneun.jpg",
      );
      await sendEmail({
        to: email,
        subject: "Verify your AASTU GibiGubae account",
        html,
      });

      return res.status(201).json({
        success: true,
        message: "Account created. Verification email sent.",
      });
    }
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
