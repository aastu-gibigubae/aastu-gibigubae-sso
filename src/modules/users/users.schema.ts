import { z } from "zod";
import { Department, Gender } from "../../generated/prisma/enums.js";

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),

  fatherName: z.string().min(2).optional(),

  grandFatherName: z.string().min(2).optional(),

  christianName: z.string().min(2).optional(),

  phoneNumber: z
    .string()
    .regex(/^(?:\+2519\d{8}|\+2517\d{8}|09\d{8}|07\d{8})$/)
    .transform((val) => (val.startsWith("0") ? "+251" + val.slice(1) : val))
    .optional(),

  gender: z.enum(Gender).optional(),

  department: z.nativeEnum(Department).optional(),

  dormitoryBlock: z.string().min(1).optional(),

  dormitoryNumber: z.string().min(1).optional(),

  studentId: z
    .string()
    .regex(/^ets\d{4}\/\d{2}$/, "Student ID must be like: ets1234/25")
    .transform((v) => v.toLowerCase())
    .optional(),
});

export const emailSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email" }),
});
