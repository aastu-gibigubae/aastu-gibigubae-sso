import { test, describe, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";

import app from "../../../app.js";
import { prisma } from "../../../config/db.js";
import { Role } from "../../../generated/prisma/client.js";


let userPhone = "+251912345678";

beforeEach(async () => {
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("12345678", 12);

  await prisma.user.create({
    data: {
      firstName: "nathnael",
      fatherName: "Tamirat",
      passwordHash,
      phoneNumber: userPhone,
      gender: "male",
      studentId: "ets1088/25",
      admissionYear: 2025,
      department: "softwareEngineering",
      role: Role.user,
      loginAttempts: 0,
      lastLoginAt: null,
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

const login = (body = {}) => request(app).post("/api/v1/auth/login").send(body);

const baseLogin = (overrides = {}) => ({
  phoneNumber: userPhone,
  password: "12345678",
  rememberMe: true,
  ...overrides,
});

describe("LOGIN - FULL COVERAGE", () => {
  test("SUCCESS login", async () => {
    const res = await login(baseLogin());

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Login successful");

    expect(res.body.data.phoneNumber).toBe(userPhone);
    expect(res.body.accessToken).toBeDefined();
  });

  test("FAIL user not found", async () => {
    const res = await login(baseLogin({ phoneNumber: "+251900000000" }));

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User not found");
  });

  test("FAIL invalid password", async () => {
    const res = await login(baseLogin({ password: "wrongpass" }));

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid phoneNumber or password");
  });

  test("FAIL validation (bad phone)", async () => {
    const res = await login(baseLogin({ phoneNumber: "123" }));

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid phoneNumber")
  });

  test("FAIL validation (short password)", async () => {
    const res = await login(baseLogin({ password: "123" }));

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Password must be at least 6 characters");
  });

  test("FAIL rate limit", async () => {
    await prisma.user.update({
      where: { phoneNumber: userPhone },
      data: {
        loginAttempts: 3,
        lastLoginAt: new Date(),
      },
    });

    const res = await login(baseLogin());

    expect(res.statusCode).toBe(429);
    expect(res.body.message).toBe(
      "Too many login attempts. Try again in 5 minutes.",
    );
  });

  test("SUCCESS resets login attempts", async () => {
    await prisma.user.update({
      where: { phoneNumber: userPhone },
      data: {
        loginAttempts: 2,
        lastLoginAt: new Date(),
      },
    });

    await login(baseLogin());

    const updated = await prisma.user.findUnique({
      where: { phoneNumber: userPhone },
    });

    expect(updated?.loginAttempts).toBe(0);
  });
});
