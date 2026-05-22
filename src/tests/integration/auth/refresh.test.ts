import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { SignOptions } from "jsonwebtoken";

import app from "../../../app.js";
import { prisma } from "../../../config/db.js";
import tokenService from "../../../services/token.service.js";
import { envConfig } from "../../../config/config.js";

import { Role } from "../../../generated/prisma/enums.js";

let user: any;
let refreshToken: string;

beforeEach(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("12345678", 12);

  user = await prisma.user.create({
    data: {
      firstName: "Nathnael",
      fatherName: "Tamirat",
      email: "refresh@test.com",
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

  const refreshTokenOptions: SignOptions = {
    expiresIn:
      envConfig.REFRESH_TOKEN_EXPIRATION as SignOptions["expiresIn"],
    algorithm: "RS256",
  };

  refreshToken = tokenService.generateSecurityToken(
    {
      userId: user.id,
      type: "REFRESH_TOKEN",
    },
    refreshTokenOptions,
  );

  const tokenHash = tokenService.generateHashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      deviceInfo: "test-device",
      ipAddress: "127.0.0.1",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      lastUsedAt: new Date(),
    },
  });
}, 20000);

afterAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}, 20000);

const refreshRequest = (token?: string) => {
  const req = request(app).post("/api/v1/auth/refresh");

  if (token) {
    req.set("Cookie", [`refresh-token=${token}`]);
  }

  return req;
};

describe("POST /api/v1/auth/refresh", () => {
  test("should generate new access token successfully", async () => {
    const res = await refreshRequest(refreshToken);

    expect(res.statusCode).toBe(200);

    expect(res.body.success).toBe(true);

    expect(res.body.message).toBe(
      "Access token generated successfully",
    );

    expect(res.body.accessToken).toBeDefined();

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        userId: user.id,
      },
    });

    expect(storedToken).not.toBeNull();

    expect(storedToken?.lastUsedAt).toBeInstanceOf(Date);
  });

  test("should return 401 when refresh token is missing", async () => {
    const res = await refreshRequest();

    expect(res.statusCode).toBe(401);

    expect(res.body.success).toBe(false);

    expect(res.body.message).toBe("Refresh token missing");
  });

  test("should return 401 for invalid refresh token", async () => {
    const res = await refreshRequest("invalid-token");

    expect(res.statusCode).toBe(401);

    expect(res.body.success).toBe(false);
  });

  test("should return 401 when token type is not REFRESH_TOKEN", async () => {
    const accessToken = tokenService.generateSecurityToken(
      {
        userId: user.id,
        type: "ACCESS_TOKEN",
      },
      {
        expiresIn:
          envConfig.ACCESS_TOKEN_EXPIRATION as SignOptions["expiresIn"],
        algorithm: "RS256",
      },
    );

    const res = await refreshRequest(accessToken);

    expect(res.statusCode).toBe(401);

    expect(res.body.success).toBe(false);

    expect(res.body.message).toBe("Invalid refresh token");
  });

  test("should return 401 when refresh token does not exist in DB", async () => {
    await prisma.refreshToken.deleteMany();

    const res = await refreshRequest(refreshToken);

    expect(res.statusCode).toBe(401);

    expect(res.body.success).toBe(false);

    expect(res.body.message).toBe("Invalid refresh token");
  });

  test("should return 401 when refresh token is expired", async () => {
    await prisma.refreshToken.updateMany({
      data: {
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const res = await refreshRequest(refreshToken);

    expect(res.statusCode).toBe(401);

    expect(res.body.success).toBe(false);

    expect(res.body.message).toBe("Refresh token expired");
  });

  test("should update lastUsedAt after successful refresh", async () => {
    const before = await prisma.refreshToken.findFirst({
      where: {
        userId: user.id,
      },
    });

    await new Promise((r) => setTimeout(r, 100));

    const res = await refreshRequest(refreshToken);

    expect(res.statusCode).toBe(200);

    const after = await prisma.refreshToken.findFirst({
      where: {
        userId: user.id,
      },
    });

    expect(after?.lastUsedAt.getTime()).toBeGreaterThan(
      before!.lastUsedAt.getTime(),
    );
  });
});