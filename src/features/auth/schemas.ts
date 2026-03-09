import { z } from "zod";

export const appRoleSchema = z.enum(["trainer", "client"]);
export type AppRole = z.infer<typeof appRoleSchema>;

export const signupBaseSchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(8),
  full_name: z.string().min(1).max(120),
});

export const trainerSignupSchema = signupBaseSchema.extend({
  role: z.literal("trainer"),
});

export const clientSignupSchema = signupBaseSchema.extend({
  role: z.literal("client"),
  invite_token: z.string().min(16),
});

export const signInSchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(8),
});

export const roleNoticeSchema = z.object({
  notice: z.enum(["permission", "auth_required"]).optional(),
});
