import { z } from "zod";
import { Department } from "../../generated/prisma/enums.js";

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
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z
    .string()
    .regex(
      /^(?:\+2519\d{8}|\+2517\d{8}|09\d{8}|07\d{8})$/,
      "Invalid phoneNumber",
    )
    .transform((val) => (val.startsWith("0") ? "+251" + val.slice(1) : val)),
  gender: z.enum(["male", "female"], {
    message: "Gender must be either 'male' or 'female'",
  }),
  studentId: z
    .string()
    .regex(/^ets\d{4}\/\d{2}$/, "Student ID must be like: ets1234/25")
    .transform((v) => v.toLowerCase()),
  department: z.enum(departmentValues, {
    message: "Invalid department option",
  }),
  rememberMe: z.boolean(),
});

export const loginSchema = z.object({
  phoneNumber: z
    .string()
    .regex(
      /^(?:\+2519\d{8}|\+2517\d{8}|09\d{8}|07\d{8})$/,
      "Invalid phoneNumber",
    )
    .transform((val) => (val.startsWith("0") ? "+251" + val.slice(1) : val)),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean(),
});

export const passwordRequestSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email" }),
});
export const passwordVerifySchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  resetToken: z.string(),
});
export const passwordTokenSchema = z.object({
  userId: z.string(),
  type: z.literal("PASSWORD_VERIFICATION")
})
export const updatePasswordSchema = z.object({
   oldPassword: z.string().min(6, "Password must be at least 6 characters"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
})

export const emailTokenSchema = z.object({
  userId: z.string(),
  type: z.literal("EMAIL_VERIFICATION"),
});
export type registerInput = z.input<typeof registerSchema>;
