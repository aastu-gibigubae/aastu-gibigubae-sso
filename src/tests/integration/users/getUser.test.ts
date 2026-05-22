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
let adminUser: any;
let token: string;
let adminToken: string;

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
      role: Role.user,
      permissions: [],
    },
  });

  adminUser = await prisma.user.create({
    data: {
      firstName: "Admin",
      fatherName: "User",
      passwordHash,
      phoneNumber: "0911111111",
      gender: "male",
      studentId: "ets9999/25",
      admissionYear: 2025,
      department: "softwareEngineering",
      role: Role.admin,
      permissions: ["SEE-USERS"],
    },
  });

  const accessTokenOptions: SignOptions = {
    expiresIn: envConfig.ACCESS_TOKEN_EXPIRATION as SignOptions["expiresIn"],
    algorithm: "RS256",
  };

  token = tokenService.generateSecurityToken(
    { userId: user.id, type: "ACCESS_TOKEN" },
    accessTokenOptions,
  );

  adminToken = tokenService.generateSecurityToken(
    { userId: adminUser.id, type: "ACCESS_TOKEN" },
    accessTokenOptions,
  );
}, 20000);

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}, 20000);

const getUserById = (id: string, authToken?: string) =>
  request(app)
    .get(`/api/v1/users/${id}`)
    .set("Authorization", authToken ? `Bearer ${authToken}` : "");

describe("GET /api/v1/users/:id", () => {
  test("should return user successfully (admin access)", async () => {
    const res = await getUserById(user.id, adminToken);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("User fetched successfully");

    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(user.id);
    expect(res.body.data.phoneNumber).toBe(user.phoneNumber);
  }, 10000);

  test("should return 401 when not authenticated", async () => {
    const res = await getUserById(user.id);

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Authentication required");
  }, 10000);

  test("should return 403 when role is not allowed", async () => {
    const res = await getUserById(user.id, token);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  }, 10000);

  test("should return 404 when user does not exist", async () => {
    await prisma.user.delete({
      where: { id: user.id },
    });

    const res = await getUserById(user.id, adminToken);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User not found");
  }, 10000);

  test("should return 400/404 for invalid id", async () => {
    const res = await getUserById("invalid-id", adminToken);

    expect([400, 404]).toContain(res.statusCode);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  }, 10000);
});