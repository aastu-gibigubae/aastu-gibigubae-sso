import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";

import app from "../../../app.js";
import { prisma } from "../../../config/db.js";
import { Role } from "../../../generated/prisma/client.js";
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
      passwordHash,
      phoneNumber: "0900000000",
      gender: "male",
      studentId: "ets1234/25",
      admissionYear: 2025,
      department: "softwareEngineering",
      role: Role.subAdmin,
      permissions: ["SEE-USERS"],
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

const getAll = (authToken?: string) =>
  request(app)
    .get("/api/v1/users/")
    .set("Authorization", authToken ? `Bearer ${authToken}` : "");

describe("GET /api/v1/users/me", () => {
  test("should return the users fetched successfully", async () => {
    const res = await getAll(token);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Users fetched successfully");
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toHaveProperty("page");
    expect(res.body.pagination).toHaveProperty("total");
  }, 10000);

  test("should return 401 when not authenticated", async () => {
    const res = await getAll();

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  }, 10000);

  test("should return 404 when user does not exist", async () => {
    await prisma.user.delete({
      where: { id: user.id },
    });

    const res = await getAll(token);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  }, 10000);

  test("should support pagination", async () => {
    const res = await request(app)
      .get("/api/v1/users?page=1&limit=1")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });
});
