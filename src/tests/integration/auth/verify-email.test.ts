import { test, describe, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../../../app.js";
import { prisma } from "../../../config/db.js";
import tokenService from "../../../services/token.service.js";
import { Role } from "../../../generated/enums.js";
import { envConfig } from "../../../config/config.js";
import type { SignOptions } from "jsonwebtoken";
import { User } from "../../../generated/client.js";

let userId: string;
let user: User;

beforeEach(async () => {
  await prisma.user.deleteMany();

  user = await prisma.user.create({
    data: {
      firstName: "nathnael",
      fatherName: "Tamirat",
      email: "verify@test.com",
      passwordHash: "hashedpassword",
      phoneNumber: "0926727954",
      gender: "male",
      studentId: "ets1088/25",
      admissionYear: 2025,
      department: "softwareEngineering",
      role: Role.user,
      isEmailVerified: false,
    },
  });

  userId = user.id;
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

const generateToken = () => {
  const payload = {
    userId,
    type: "EMAIL_VERIFICATION",
  };

  const options: SignOptions = {
    expiresIn: envConfig.EMAIL_VERIFICATION_EXPIRY as SignOptions["expiresIn"],
  };

  return tokenService.generateEmailVerifyToken(payload, options);
};

describe("POST /api/v1/auth/verify-email", () => {
  test("should verify email successfully and return tokens", async () => {
    const agent = request.agent(app);
    const token = generateToken();

    const res = await agent.post("/api/v1/auth/verify-email").send({ token });

    expect(res.statusCode).toBe(200);

    expect(res.body).toMatchObject({
      success: true,
      message: "Email verified successfully",
      data: {
        id: userId,
        firstName: "nathnael",
        fatherName: "Tamirat",
        email: "verify@test.com",
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

    // ✅ stronger cookie check
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    if (Array.isArray(cookies)) {
      expect(cookies.join("")).toContain("refresh-token");
    } else {
      expect(cookies).toContain("refresh-token");
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    expect(updatedUser?.isEmailVerified).toBe(true);
  });

  test("should return 400 if token is missing", async () => {
    const res = await request(app).post("/api/v1/auth/verify-email").send({});

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      success: false,
      message: "Verification token is required",
    });
  });

  test("should return 404 if user not found", async () => {
    const fakeToken = tokenService.generateEmailVerifyToken(
      { userId: "non-existent-id", type: "EMAIL_VERIFICATION" },
      { expiresIn: "10m" },
    );

    const res = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: fakeToken });

    expect(res.statusCode).toBe(404);

    expect(res.body).toEqual({
      success: false,
      message: "User not found",
    });
  });

  test("should return 409 if user already verified", async () => {
    const token = generateToken();

    await request(app).post("/api/v1/auth/verify-email").send({ token });

    const res = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token });

    expect(res.statusCode).toBe(409);

    expect(res.body).toEqual({
      success: false,
      message: "User is already verified",
    });
  });

  test("should return 400 for invalid token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: "invalid.token.here" });

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      success: false,
      message: "Verification link is invalid or has expired",
    });
  });

  test("should return 400 for expired token", async () => {
    const expiredToken = tokenService.generateEmailVerifyToken(
      { userId, type: "EMAIL_VERIFICATION" },
      { expiresIn: "1ms" },
    );

    await new Promise((r) => setTimeout(r, 10));

    const res = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: expiredToken });

    expect(res.statusCode).toBe(400);

    expect(res.body).toEqual({
      success: false,
      message: "Verification link is invalid or has expired",
    });
  });
  test.skip("should allow access with refresh-token cookie after verification", async () => {
    const agent = request.agent(app);
    const token = generateToken();

    await agent.post("/api/v1/auth/verify-email").send({ token });

    const res = await agent.get("/api/v1/users/me"); // or any protected route

    expect(res.statusCode).toBe(200);
  });
});
