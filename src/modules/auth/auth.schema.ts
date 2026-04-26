import { Department } from "@prisma/client";
import { z } from "zod";
const departmentValues = Object.values(Department) as [string, ...string[]];

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name is too short")
    .transform((v) => v.toLowerCase()),
  fatherName: z
    .string()
    .min(2, "Father name is too short")
    .transform((v) => v.toLowerCase()),
  email: z
    .string()
    .email("Invalid email")
    .transform((v) => v.toLowerCase()),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z
    .string()
    .regex(/^\+?\d{8,15}$/, "Invalid phone Number")
    .transform((val) => (val.startsWith("0") ? "+251" + val.slice(1) : val)),
  gender: z.enum(["male", "female"]),
  studentId: z
    .string()
    .regex(/^ets\d{4}\/\d{2}$/, "Student ID must be like: ets1234/25")
    .transform((v) => v.toLowerCase()),
  department: z.enum(departmentValues),
});
