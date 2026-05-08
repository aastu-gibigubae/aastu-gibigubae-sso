import { test, describe, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";

import app from "../../../app.js";
import { prisma } from "../../../config/db.js";
import { Role, User } from "../../../generated/client.js";

let user: User;
let userId: string;
let userEmail: string;

beforeEach(async () => {
  await prisma.user.deleteMany();

  userEmail = `user_${Date.now()}_${Math.random()}@test.com`;

  const passwordHash = await bcrypt.hash("12345678", 12);

  user = await prisma.user.create({
    data: {
      firstName: "nathnael",
      fatherName: "Tamirat",
      email: userEmail,
      passwordHash,
      phoneNumber: "0926727954",
      gender: "male",
      studentId: "ets1088/25",
      admissionYear: 2025,
      department: "softwareEngineering",
      role: Role.user,
      isEmailVerified: true,
      loginAttempts: 0,
      lastLoginAt: null,
    },
  });

  userId = user.id;
}, 20000);

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}, 20000);

const login = (body = {}) =>
  request(app).post("/api/v1/auth/login").send(body);

const createLoginUser = (overrides = {}) => ({
  email: userEmail,
  password: "12345678",
  rememberMe: true,
  ...overrides,
});

describe.sequential("POST /api/v1/auth/login", () => {
  test("should login successfully and return tokens + user", async () => {
    const res = await login(createLoginUser());

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: "Login successful",
      data: {
        id: userId,
        firstName: "nathnael",
        fatherName: "Tamirat",
        email: userEmail,
        phoneNumber: "0926727954",
        role: "user",
        gender: "male",
        studentId: "ets1088/25",
        admissionYear: 2025,
        department: "softwareEngineering",
        isEmailVerified: true,
        isAccountVerified: false,
      },
      accessToken: expect.any(String),
    });

    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();

    if (Array.isArray(cookies)) {
      expect(cookies.join("")).toContain("refresh-token");
    } else {
      expect(cookies).toContain("refresh-token");
    }
  },10000);

  test("should return 404 and User not found", async () => {
    const res = await login({
      ...createLoginUser(),
      email: "notfound@test.com",
    });

    expect(res.statusCode).toBe(404);
  },10000);

  test("should return 401 and Invalid email or password", async () => {
    const res = await login({
      ...createLoginUser(),
      password: "wrongpassword",
    });

    expect(res.statusCode).toBe(401);

    const updatedUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    expect(updatedUser?.loginAttempts).toBe(1);
    expect(updatedUser?.lastLoginAt).not.toBeNull();
  },10000);

  test("should return 403 if email is not verified", async () => {
    await prisma.user.update({
      where: { email: userEmail },
      data: { isEmailVerified: false },
    });

    const res = await login(createLoginUser());

    expect(res.statusCode).toBe(403);
  },10000);

  test("should return 429 after 3 failed attempts within 5 minutes", async () => {
    await prisma.user.update({
      where: { email: userEmail },
      data: {
        loginAttempts: 3,
        lastLoginAt: new Date(),
      },
    });

    const res = await login(createLoginUser());

    expect(res.statusCode).toBe(429);
  },10000);

  test("should return 400 and Invalid email", async () => {
    const res = await login({
      ...createLoginUser(),
      email: "invalid-email",
    });

    expect(res.statusCode).toBe(400);
  },10000);

  test("should return 400 and Password must be at least 6 characters", async () => {
    const res = await login({
      ...createLoginUser(),
      password: "12345",
    });

    expect(res.statusCode).toBe(400);
  },10000);

  test("should reset loginAttempts after successful login", async () => {
    await prisma.user.update({
      where: { email: userEmail },
      data: {
        loginAttempts: 2,
        lastLoginAt: new Date(),
      },
    });

    await login(createLoginUser());

    const updatedUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });
    expect(updatedUser?.loginAttempts).toBe(0);
  },10000);
});
