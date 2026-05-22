import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";

import app from "../../../app.js";
import { prisma } from "../../../config/db.js";
import { Role } from "../../../generated/prisma/enums.js";
import tokenService from "../../../services/token.service.js";
import { envConfig } from "../../../config/config.js";
import type { SignOptions } from "jsonwebtoken";

let user: any;
let token: string;

beforeEach(async () => {
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("12345678", 12);

  user = await prisma.user.create({
    data: {
      firstName: "Test",
      fatherName: "User",
      email: "test@example.com",
      passwordHash,
      phoneNumber: "0900000000",
      gender: "male",
      studentId: "ets1234/25",
      admissionYear: 2025,
      department: "softwareEngineering",
      role: Role.user,
      isEmailVerified: true,
    },
  });

  const accessTokenOptions: SignOptions = {
    expiresIn: envConfig.ACCESS_TOKEN_EXPIRATION as SignOptions["expiresIn"],
    algorithm: "RS256",
  };

  token = tokenService.generateSecurityToken(
    {
      userId: user.id,
      type: "ACCESS_TOKEN",
    },
    accessTokenOptions,
  );
}, 20000);

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}, 20000);

const updatePassword = (authToken?: string, body = {}) =>
  request(app)
    .patch("/api/v1/auth/update-password")
    .set("Authorization", authToken ? `Bearer ${authToken}` : "")
    .send(body);

describe("PATCH /api/v1/auth/update-password", () => {
  test("SUCCESS: should update password", async () => {
    const res = await updatePassword(token, {
      oldPassword: "12345678",
      newPassword: "newpassword123",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Password updated successful");

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    const isValid = await bcrypt.compare(
      "newpassword123",
      updatedUser!.passwordHash,
    );

    expect(isValid).toBe(true);
  }, 20000);

  test("FAIL: unauthenticated request should return 401", async () => {
    const res = await updatePassword(undefined, {
      oldPassword: "12345678",
      newPassword: "newpassword123",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("FAIL: wrong old password should return 401", async () => {
    const res = await updatePassword(token, {
      oldPassword: "wrongpassword",
      newPassword: "newpassword123",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Invalid");
  });

  test("FAIL: user not found should return 404", async () => {
    await prisma.user.delete({
      where: { id: user.id },
    });

    const res = await updatePassword(token, {
      oldPassword: "12345678",
      newPassword: "newpassword123",
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User not found");
  });

  test("FAIL: invalid payload should return 400", async () => {
    const res = await updatePassword(token, {
      oldPassword: "12345678",
      newPassword: "123",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Password must be at least 6 characters");
  });
});
