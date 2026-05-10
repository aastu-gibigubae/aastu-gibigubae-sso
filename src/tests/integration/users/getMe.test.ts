import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";

import app from "../../../app.js";
import { prisma } from "../../../config/db.js";
import { Role } from "../../../generated/enums.js";
import { envConfig } from "../../../config/config.js";
import tokenService from "../../../services/token.service.js";

let user: any;
let token: string;

beforeEach(async () => {
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("12345678", 12);

  user = await prisma.user.create({
    data: {
      firstName: "Test",
      fatherName: "User",
      email: "test@getme.com",
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
  const accessTokenPayLoad = {
    userId: user.id,
    type: "ACCESS_TOKEN",
  };
  token = tokenService.generateSecurityToken(
    accessTokenPayLoad,
    accessTokenOptions,
  );
}, 20000);

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}, 20000);

const getMe = (authToken?: string) =>
  request(app)
    .get("/api/v1/users/me")
    .set("Authorization",authToken ? `Bearer ${authToken}`: "")

describe("GET /api/v1/users/me", () => {
  test("should return user profile successfully", async () => {
    const res = await getMe(token);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("email", user.email);
  }, 10000);

  test("should return 401 when not authenticated", async () => {
    const res = await getMe();

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  }, 10000);

  test("should return 404 when user does not exist", async () => {
    await prisma.user.delete({
      where: { id: user.id },
    });

    const res = await getMe(token);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  }, 10000);
});
