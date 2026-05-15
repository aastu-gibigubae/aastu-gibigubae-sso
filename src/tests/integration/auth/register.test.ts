import { test, describe, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { prisma } from "../../../config/db.js";
import app from "../../../app.js";
import { registerInput } from "../../../modules/auth/auth.schema.js";

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

const register = (body: registerInput) =>
  request(app).post("/api/v1/auth/register").send(body);

const baseUser = (
  overrides: Partial<registerInput> = {},
): registerInput => ({
  firstName: "nathnael",
  fatherName: "Tamirat",
  password: "12345678",
  phoneNumber: "0912345678",
  gender: "male",
  studentId: "ets1088/25",
  department: "softwareEngineering",
  rememberMe: true,
  ...overrides,
});

describe("REGISTER - FULL COVERAGE", () => {
  test("SUCCESS: register user", async () => {
    const res = await register(baseUser());

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Register successful");

    expect(res.body.data.phoneNumber).toBe("+251912345678");
    expect(res.body.accessToken).toBeDefined();
  });

  test("FAIL: duplicate phone number", async () => {
    await register(baseUser());

    const res = await register(baseUser());

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("User with this phone number already exists");
  });

  test("FAIL: invalid phone number", async () => {
    const res = await register(
      baseUser({ phoneNumber: "0912" }),
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid phoneNumber");
  });

  test("FAIL: weak password", async () => {
    const res = await register(
      baseUser({ password: "123" }),
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Password must be at least 6 characters");
  });

  test("FAIL: invalid student ID", async () => {
    const res = await register(
      baseUser({ studentId: "invalid" }),
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(
      "Student ID must be like: ets1234/25",
    );
  });

  test("FAIL: invalid department", async () => {
    const res = await register(
      baseUser({ department: "computerScience" as any }),
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid department option");
  });

  test("FAIL: invalid gender", async () => {
    const res = await register(
      baseUser({ gender: "m" as any }),
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(
      "Gender must be either 'male' or 'female'",
    );
  });

  test("FAIL: first name too short", async () => {
    const res = await register(
      baseUser({ firstName: "a" }),
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("First name is too short");
  });

  test("FAIL: father name too short", async () => {
    const res = await register(
      baseUser({ fatherName: "a" }),
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Father name is too short");
  });
});