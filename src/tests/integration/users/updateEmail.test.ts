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
let token: string;

beforeEach(async () => {
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("12345678", 12);

  user = await prisma.user.create({
    data: {
      firstName: "Nathnael",
      fatherName: "Tamirat",
      grandFatherName: "Abebe",
      christianName: "Nathan",
      email: "oldemail@test.com",
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

  const accessTokenPayload = {
    userId: user.id,
    type: "ACCESS_TOKEN",
  };

  token = tokenService.generateSecurityToken(
    accessTokenPayload,
    accessTokenOptions,
  );
}, 20000);

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}, 20000);

const updateEmail = (
  body: {
    email?: string;
  },
  authToken?: string,
) =>
  request(app)
    .patch("/api/v1/users/update-email")
    .set("Authorization", authToken ? `Bearer ${authToken}` : "")
    .send(body);

describe("PATCH /api/v1/users/update-email", () => {
  test("should update email successfully and send verification email", async () => {
    const newEmail = `test_${Date.now()}@gmail.com`;

    const res = await updateEmail(
      {
        email: newEmail,
      },
      token,
    );

    expect(res.statusCode).toBe(200);

    expect(res.body.success).toBe(true);

    expect(res.body.message).toBe(
      "Verification email sent successfully",
    );

    expect(res.body.data.email).toBe(newEmail);

    expect(res.body.data.isEmailVerified).toBe(false);

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser?.email).toBe(newEmail);

    expect(updatedUser?.isEmailVerified).toBe(false);
  }, 15000);

  test("should return 401 when user is not authenticated", async () => {
    const res = await updateEmail({
      email: "newemail@gmail.com",
    });

    expect(res.statusCode).toBe(401);

    expect(res.body.success).toBe(false);

    expect(res.body.message).toBe("Authentication required");
  });

  test("should return 404 when user does not exist", async () => {
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    });

    const res = await updateEmail(
      {
        email: "newemail@gmail.com",
      },
      token,
    );

    expect(res.statusCode).toBe(404);

    expect(res.body.success).toBe(false);

    expect(res.body.message).toBe("User not found");
  },10000);

  test("should return 400 for invalid email", async () => {
    const res = await updateEmail(
      {
        email: "invalid-email",
      },
      token,
    );

    expect(res.statusCode).toBe(400);

    expect(res.body.success).toBe(false);
  });

  test("should return 400 when email is missing", async () => {
    const res = await updateEmail({}, token);

    expect(res.statusCode).toBe(400);

    expect(res.body.success).toBe(false);
  });

  test("should overwrite existing email", async () => {
    const res = await updateEmail(
      {
        email: "updatedemail@gmail.com",
      },
      token,
    );

    expect(res.statusCode).toBe(200);

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser?.email).toBe(
      "updatedemail@gmail.com",
    );
  },10000);

  test("should mark email as unverified after updating", async () => {
    const res = await updateEmail(
      {
        email: "verifyagain@gmail.com",
      },
      token,
    );

    expect(res.statusCode).toBe(200);

    expect(res.body.data.isEmailVerified).toBe(false);

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser?.isEmailVerified).toBe(false);
  },10000);
});