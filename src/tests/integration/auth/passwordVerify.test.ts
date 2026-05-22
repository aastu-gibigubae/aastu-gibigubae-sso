import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";

import app from "../../../app.js";
import { prisma } from "../../../config/db.js";

import tokenService from "../../../services/token.service.js";
import { envConfig } from "../../../config/config.js";
import { Role } from "../../../generated/prisma/enums.js";
import { User } from "../../../generated/prisma/client.js";

let user: User;
let resetToken: string;
let phoneNumber = "+251926727954";

beforeEach(async () => {
  await prisma.user.deleteMany();

  let userEmail = `verify_${Date.now()}_${Math.random()}@test.com`;

  const passwordHash = await bcrypt.hash("12345678", 12);

  user = await prisma.user.create({
    data: {
      firstName: "Test",
      fatherName: "User",
      email: userEmail,
      passwordHash,
      phoneNumber,
      gender: "male",

      studentId: "test123",
      admissionYear: 2025,
      department: "softwareEngineering",
      role: Role.user,
      isEmailVerified: true,
      loginAttempts: 0,
      lastLoginAt: null,
    },
  });

  const payload = {
    userId: user.id,
    type: "PASSWORD_VERIFICATION",
  };

  const options: SignOptions = {
    expiresIn:
      envConfig.PASSWORD_RESET_TOKEN_EXPIRY as SignOptions["expiresIn"],
  };

  resetToken = tokenService.generatePasswordResetToken(payload, options);
}, 20000);

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}, 20000);

const verifyPasswordReset = (body = {}) =>
  request(app).post("/api/v1/auth/password-reset/verify").send(body);

describe("POST /api/v1/auth/password-reset/verify", () => {
  test("should reset password successfully", async () => {
    const res = await verifyPasswordReset({
      newPassword: "newpassword123",
      resetToken,
    });

    expect(res.statusCode).toBe(201);

    expect(res.body.success).toBe(true);

    expect(res.body.message).toBe("Password has been reset successfully.");

    expect(res.body.accessToken).toBeDefined();

    const updatedUser = await prisma.user.findUnique({
      where: {
        phoneNumber,
      },
    });

    const isValid = await bcrypt.compare(
      "newpassword123",
      updatedUser!.passwordHash,
    );

    expect(isValid).toBe(true);
  }, 10000);

  test("should return 400 for missing reset token", async () => {
    const res = await verifyPasswordReset({
      newPassword: "newpassword123",
    });

    expect(res.statusCode).toBe(400);

    expect(res.body.success).toBe(false);
  }, 10000);

  test("should return 400 for missing password", async () => {
    const res = await verifyPasswordReset({
      resetToken,
    });

    expect(res.statusCode).toBe(400);

    expect(res.body.success).toBe(false);
  }, 10000);

  test("should return 400 for short password", async () => {
    const res = await verifyPasswordReset({
      newPassword: "123",
      resetToken,
    });

    expect(res.statusCode).toBe(400);

    expect(res.body.success).toBe(false);
  }, 10000);

  test("should return 400 for invalid token", async () => {
    const res = await verifyPasswordReset({
      newPassword: "newpassword123",
      resetToken: "invalid-token",
    });

    expect(res.statusCode).toBe(400);

    expect(res.body.success).toBe(false);
  }, 10000);

  test("should return 404 when user no longer exists", async () => {
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    });

    const res = await verifyPasswordReset({
      newPassword: "newpassword123",
      resetToken,
    });

    expect(res.statusCode).toBe(404);

    expect(res.body.success).toBe(false);
  }, 10000);

  test("should allow login with new password after reset", async () => {
    await verifyPasswordReset({
      newPassword: "newpassword123",
      resetToken,
    });

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      phoneNumber,
      password: "newpassword123",
      rememberMe: false,
    });

    expect(loginRes.statusCode).toBe(200);

    expect(loginRes.body.success).toBe(true);

    expect(loginRes.body.accessToken).toBeDefined();
  }, 10000);
});
