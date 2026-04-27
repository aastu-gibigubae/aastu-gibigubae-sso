import { test, describe, expect, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "../../../config/db.js";
import app from "../../../app.js";
import { registerInput } from "../../../modules/auth/auth.schema.js";

beforeEach(async () => {
  //clearing the db
  await prisma.user.deleteMany();
});
const register = (body: registerInput) =>
  request(app).post("/api/v1/auth/register").send(body);
const createUser = (overrides:Partial<registerInput> = {}):registerInput => ({
  firstName: "nathnael",
  fatherName: "Tamirat",
  email: "brooke.kohler60@ethereal.email",
  password: "12345678",
  phoneNumber: "0926727954",
  gender: "male",
  studentId: "ets1088/25",
  department: "softwareEngineering",
  ...overrides,
});
describe("POST api/v1/auth/register", () => {
  test("should return 201 number and email verification message", async () => {
    const body = createUser();
    const res = await request(app).post("/api/v1/auth/register").send(body);
    console.log(res.body);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Account created. Verification email sent.");
  }, 10000);
  test("should return 200 number and email verification resent", async () => {
    const body = createUser();
    await request(app).post("/api/v1/auth/register").send(body);
    const res = await request(app).post("/api/v1/auth/register").send(body);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Verification email resent successfully.");
  }, 20000);
  test.todo("should return 209 and User with this email already exists");
  test("should return 400 and Student ID must be like: ets1234/25", async () => {
    const body = createUser({ studentId: "ets108825" });
    const res = await register(body);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Student ID must be like: ets1234/25");
  }, 10000);
  test("should return 400 and Password must be at least 6 characters", async () => {
    const body = createUser({ password: "12345" });
    const res = await register(body);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Password must be at least 6 characters");
  }, 10000);
  test("should return 400 and Invalid phone Number", async () => {
    const body = createUser({ phoneNumber: "0912141" });
    const res = await register(body);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid phone Number");
  }, 10000);
  test("should return 400 and Invalid department option", async () => {
    const body = createUser({ department: "computerScience" });
    const res = await register(body);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid department option");
  }, 10000);
  test("should return 400 and Gender must be either 'male' or 'female", async () => {
    const body = createUser({ gender: "m" as any});
    const res = await register(body);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Gender must be either 'male' or 'female'");
  }, 10000);
  test("should return 400 and First name is too short", async () => {
    const body = createUser({ firstName: "a" });
    const res = await register(body);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("First name is too short");
  }, 10000);
  test("should return 400 and Father name is too short", async () => {
    const body = createUser({ fatherName: "a" });
    const res = await register(body);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Father name is too short");
  }, 10000);
});
