import { describe, expect, it } from "vitest";

import { acceptInviteSchema, inviteTokenSchema, sendInviteSchema } from "./schemas";

describe("invite schemas", () => {
  it("normalizes email in sendInviteSchema", () => {
    const parsed = sendInviteSchema.parse({ client_email: "  CLIENT@Example.com " });
    expect(parsed.client_email).toBe("client@example.com");
  });

  it("rejects too-short invite tokens", () => {
    expect(() => inviteTokenSchema.parse("short-token")).toThrow();
  });

  it("accepts valid accept payload", () => {
    const parsed = acceptInviteSchema.parse({
      invite_token: "Abcdefghijklmnopqrstuvwx-1234",
    });

    expect(parsed.invite_token).toBe("Abcdefghijklmnopqrstuvwx-1234");
  });
});