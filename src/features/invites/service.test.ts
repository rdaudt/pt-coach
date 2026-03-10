import { describe, expect, it, vi } from "vitest";

import { InviteService, InviteServiceError, type ProfileRecord, type TrainerClientRecord } from "./service";
import type { InviteRecord } from "./schemas";

function createHarness() {
  const now = new Date("2026-03-09T00:00:00.000Z");
  const invites: InviteRecord[] = [];
  const relationships: TrainerClientRecord[] = [];

  const profiles: ProfileRecord[] = [
    { id: "trainer-1", email: "trainer@example.com", role: "trainer" },
    { id: "trainer-2", email: "trainer2@example.com", role: "trainer" },
    { id: "client-1", email: "client@example.com", role: "client" },
  ];

  const invitesRepo = {
    findPendingByTrainerAndEmail: vi.fn(async (trainerId: string, clientEmail: string) =>
      invites.find(
        (invite) =>
          invite.trainer_id === trainerId &&
          invite.client_email === clientEmail &&
          !invite.consumed_at &&
          !invite.revoked_at,
      ) ?? null,
    ),
    createPendingInvite: vi.fn(async (input: { trainerId: string; clientEmail: string; inviteToken: string; expiresAt: Date }) => {
      const invite: InviteRecord = {
        id: `invite-${invites.length + 1}`,
        trainer_id: input.trainerId,
        client_email: input.clientEmail,
        invite_token: input.inviteToken,
        expires_at: input.expiresAt,
        created_at: now,
        updated_at: now,
        consumed_at: null,
        consumed_by_client_id: null,
        revoked_at: null,
      };
      invites.push(invite);
      return invite;
    }),
    refreshPendingInvite: vi.fn(async (input: { inviteId: string; inviteToken: string; expiresAt: Date }) => {
      const invite = invites.find((value) => value.id === input.inviteId);
      if (!invite) {
        throw new Error("INVITE_NOT_FOUND");
      }
      invite.invite_token = input.inviteToken;
      invite.expires_at = input.expiresAt;
      invite.updated_at = now;
      return invite;
    }),
    findByToken: vi.fn(async (token: string) => invites.find((invite) => invite.invite_token === token) ?? null),
    consumeInvite: vi.fn(async (input: { inviteId: string; clientId: string; consumedAt: Date }) => {
      const invite = invites.find((value) => value.id === input.inviteId);
      if (!invite) {
        throw new Error("INVITE_NOT_FOUND");
      }
      invite.consumed_at = input.consumedAt;
      invite.consumed_by_client_id = input.clientId;
      invite.updated_at = input.consumedAt;
    }),
  };

  const relationshipsRepo = {
    findActiveByClientId: vi.fn(async (clientId: string) =>
      relationships.find((link) => link.client_id === clientId && link.status === "active") ?? null,
    ),
    activateLink: vi.fn(async (input: { trainerId: string; clientId: string }) => {
      const link: TrainerClientRecord = {
        id: `link-${relationships.length + 1}`,
        trainer_id: input.trainerId,
        client_id: input.clientId,
        status: "active",
      };
      relationships.push(link);
      return link;
    }),
    activateLinkFromInvite: undefined,
  };

  const profilesRepo = {
    findById: vi.fn(async (userId: string) => profiles.find((profile) => profile.id === userId) ?? null),
    findByEmail: vi.fn(async (email: string) => profiles.find((profile) => profile.email === email) ?? null),
  };

  const service = new InviteService({
    invites: invitesRepo,
    relationships: relationshipsRepo,
    profiles: profilesRepo,
    now: () => now,
  });

  return { now, invites, relationships, invitesRepo, relationshipsRepo, profilesRepo, service };
}

describe("InviteService", () => {
  it("creates a new invite for first send", async () => {
    const harness = createHarness();

    const result = await harness.service.issueInvite("trainer-1", {
      client_email: "client@example.com",
    });

    expect(result.action).toBe("created");
    expect(harness.invites).toHaveLength(1);
    expect(harness.invites[0].trainer_id).toBe("trainer-1");
  });

  it("refreshes existing pending invite instead of duplicating", async () => {
    const harness = createHarness();

    const first = await harness.service.issueInvite("trainer-1", {
      client_email: "newclient@example.com",
    });
    const firstToken = first.invite.invite_token;
    const second = await harness.service.issueInvite("trainer-1", {
      client_email: "newclient@example.com",
    });

    expect(first.action).toBe("created");
    expect(second.action).toBe("refreshed");
    expect(harness.invites).toHaveLength(1);
    expect(harness.invites[0].invite_token).not.toBe(firstToken);
  });

  it("rejects accept when client is already linked to another trainer", async () => {
    const harness = createHarness();

    harness.invites.push({
      id: "invite-1",
      trainer_id: "trainer-1",
      client_email: "client@example.com",
      invite_token: "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234",
      expires_at: new Date("2026-03-16T00:00:00.000Z"),
      created_at: harness.now,
      updated_at: harness.now,
      consumed_at: null,
      consumed_by_client_id: null,
      revoked_at: null,
    });

    harness.relationships.push({
      id: "link-1",
      trainer_id: "trainer-2",
      client_id: "client-1",
      status: "active",
    });

    await expect(
      harness.service.acceptInvite("client-1", { invite_token: "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234" }),
    ).rejects.toMatchObject<Partial<InviteServiceError>>({
      code: "CLIENT_ALREADY_LINKED",
    });
  });

  it("uses transactional acceptance hook when repository provides it", async () => {
    const harness = createHarness();

    harness.invites.push({
      id: "invite-1",
      trainer_id: "trainer-1",
      client_email: "client@example.com",
      invite_token: "token_ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      expires_at: new Date("2026-03-16T00:00:00.000Z"),
      created_at: harness.now,
      updated_at: harness.now,
      consumed_at: null,
      consumed_by_client_id: null,
      revoked_at: null,
    });

    harness.relationshipsRepo.activateLinkFromInvite = vi.fn(async (input) => {
      const invite = harness.invites.find((value) => value.id === input.inviteId);
      if (invite) {
        invite.consumed_at = input.consumedAt;
        invite.consumed_by_client_id = input.clientId;
      }
      return {
        id: "link-1",
        trainer_id: input.trainerId,
        client_id: input.clientId,
        status: "active",
      };
    });

    const result = await harness.service.acceptInvite("client-1", {
      invite_token: "token_ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    });

    expect(result.relationship.status).toBe("active");
    expect(harness.relationshipsRepo.activateLinkFromInvite).toHaveBeenCalledOnce();
    expect(harness.invitesRepo.consumeInvite).not.toHaveBeenCalled();
  });
});
