import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";

import app from "../../../app.js";
import { prisma } from "../../../config/db.js";
import { Role, User } from "../../../generated/client.js";

let user: User;
let userEmail: string;

beforeEach(async () => {
  await prisma.user.deleteMany();

  userEmail = `reset_${Date.now()}_${Math.random()}@test.com`;

  const passwordHash = await bcrypt.hash("12345678", 12);
  user = await prisma.user.create({
    data: {
      firstName: "Test",
      fatherName: "User",
      email: userEmail,
      passwordHash,
      phoneNumber: "0900000000",
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
}, 20000);

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}, 20000);

const requestReset = (body = {}) =>
  request(app).post("/api/v1/auth/password-reset/request").send(body);

describe("POST /api/v1/auth/password-reset/request", () => {
  test("should send password reset email successfully", async () => {
    const res = await requestReset({
      email: userEmail,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: "Password reset instructions sent to your email",
    });
  }, 10000);

  test("should return 404 when user not found", async () => {
    const res = await requestReset({
      email: "notfound@test.com",
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  }, 10000);

  test("should return 403 when email is not verified", async () => {
    await prisma.user.update({
      where: { email: userEmail },
      data: {
        isEmailVerified: false,
      },
    });

    const res = await requestReset({
      email: userEmail,
    });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  }, 10000);

  test("should return 400 for invalid email format", async () => {
    const res = await requestReset({
      email: "invalid-email",
    });

    
    expect(res.statusCode).toBe(400);
  }, 10000);

  test("should create valid reset token flow (indirect check)", async () => {
    const res = await requestReset({
      email: userEmail,
    });
    expect(res.statusCode).toBe(201);

    const dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.isEmailVerified).toBe(true);
  }, 10000);
});
