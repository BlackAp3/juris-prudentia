import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const createCourseSchema = z.object({
  code: z.string().trim().min(2).max(20),
  title: z.string().trim().min(3).max(120),
  academicYear: z.number().int().min(1).max(8),
  semester: z.number().int().min(1).max(3),
});

export const createQuestionSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(10).max(180),
  body: z.string().trim().min(20).max(5000),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
