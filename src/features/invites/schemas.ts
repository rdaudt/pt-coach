import { z } from "zod";

export const inviteEmailSchema = z.string().trim().email().transform((value) => value.toLowerCase());
export const inviteTokenSchema = z
  .string()
  .trim()
  .min(24)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invite token format is invalid");

export const sendInviteSchema = z.object({
  client_email: inviteEmailSchema,
});

export const resendInviteSchema = z.object({
  client_email: inviteEmailSchema,
});

export const acceptInviteSchema = z.object({
  invite_token: inviteTokenSchema,
});

export const inviteStatusSchema = z.enum(["pending", "expired", "consumed", "revoked"]);

export const inviteRecordSchema = z.object({
  id: z.string().uuid(),
  trainer_id: z.string().uuid(),
  client_email: inviteEmailSchema,
  invite_token: inviteTokenSchema,
  expires_at: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  consumed_at: z.coerce.date().nullable(),
  consumed_by_client_id: z.string().uuid().nullable(),
  revoked_at: z.coerce.date().nullable(),
});

export type SendInviteInput = z.infer<typeof sendInviteSchema>;
export type ResendInviteInput = z.infer<typeof resendInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type InviteStatus = z.infer<typeof inviteStatusSchema>;
export type InviteRecord = z.infer<typeof inviteRecordSchema>;