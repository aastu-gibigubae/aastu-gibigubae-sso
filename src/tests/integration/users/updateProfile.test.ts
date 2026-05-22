import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { SignOptions } from "jsonwebtoken";

import app from "../../../app.js";
import { prisma } from "../../../config/db.js";
import tokenService from "../../../services/token.service.js";
import { envConfig } from "../../../config/config.js";

import { Role } from "../../../generated/prisma/enums.js";
import { User } from "../../../generated/prisma/client.js";

let user: User;
let token: string;

beforeEach(async () => {
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("12345678", 12);

  user = await prisma.user.create({
    data: {
      firstName: "Nathnael",
      fatherName: "Tamirat",
      grandFatherName: "Kassa",
      christianName: "Test1",

      passwordHash,

      phoneNumber: "0900000000",

      gender: "male",

      studentId: "ets1088/25",
      admissionYear: 2025,

      department: "softwareEngineering",

      role: Role.user,

      isEmailVerified: true,
      isAccountVerified: true,
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

const updateProfile = (
  body: Record<string, unknown>,
  authToken?: string,
) =>
  request(app)
    .patch("/api/v1/users/update-profile")
    .set("Authorization", authToken ? `Bearer ${authToken}` : "")
    .send(body);

describe("PATCH /api/v1/users/update-profile", () => {
  test("should update profile successfully", async () => {
    const res = await updateProfile(
      {
        firstName: "Kalab",
        fatherName: "Tamiru",
        grandFatherName: "Bekele",
        christianName: "Test",

        phoneNumber: "0912345678",

        gender: "male",

        department: "biotechnology",

        studentId: "ets9999/26",
      },
      token,
    );

    expect(res.statusCode).toBe(200);

    expect(res.body.success).toBe(true);

    expect(res.body.message).toBe("Profile updated successfully");

    expect(res.body.data.firstName).toBe("Kalab");

    expect(res.body.data.phoneNumber).toBe("+251912345678");

    expect(res.body.data.studentId).toBe("ets9999/26");

    expect(res.body.data.admissionYear).toBe(2026);

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser?.firstName).toBe("Kalab");

    expect(updatedUser?.department).toBe("biotechnology");

    expect(updatedUser?.admissionYear).toBe(2026);
  },10000);

  test("should return 401 when not authenticated", async () => {
    const res = await updateProfile({
      firstName: "Kalab",
    });

    expect(res.statusCode).toBe(401);

    expect(res.body.success).toBe(false);
  });

  test("should return 404 when user no longer exists", async () => {
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    });

    const res = await updateProfile(
      {
        firstName: "Kalab",
      },
      token,
    );

    expect(res.statusCode).toBe(404);

    expect(res.body.success).toBe(false);
  });

  test("should return 400 for invalid phone number", async () => {
    const res = await updateProfile(
      {
        phoneNumber: "0912",
      },
      token,
    );

    expect(res.statusCode).toBe(400);

    expect(res.body.success).toBe(false);
  });

  test("should return 400 for invalid student ID", async () => {
    const res = await updateProfile(
      {
        studentId: "invalid",
      },
      token,
    );

    expect(res.statusCode).toBe(400);

    expect(res.body.success).toBe(false);
  });

  test("should return 400 for invalid department", async () => {
    const res = await updateProfile(
      {
        department: "invalidDepartment",
      },
      token,
    );

    expect(res.statusCode).toBe(400);

    expect(res.body.success).toBe(false);
  });

  test("should return 400 for invalid gender", async () => {
    const res = await updateProfile(
      {
        gender: "unknown",
      },
      token,
    );

    expect(res.statusCode).toBe(400);

    expect(res.body.success).toBe(false);
  });

  test("should update only provided fields", async () => {
    const res = await updateProfile(
      {
        firstName: "OnlyFirstNameChanged",
      },
      token,
    );

    expect(res.statusCode).toBe(200);

    expect(res.body.data.firstName).toBe(
      "OnlyFirstNameChanged",
    );

    expect(res.body.data.fatherName).toBe("Tamirat");

    expect(res.body.data.studentId).toBe("ets1088/25");
  });
});