import { describe, expect, it, vi } from "vitest";

import { RelationshipQueries } from "./queries";

describe("RelationshipQueries", () => {
  it("filters expired pending invites from trainer dashboard", async () => {
    const now = new Date("2026-03-09T00:00:00.000Z");

    const queries = new RelationshipQueries({
      now: () => now,
      repository: {
        listActiveClientsForTrainer: vi.fn(async () => []),
        listPendingInvitesForTrainer: vi.fn(async () => [
          {
            id: "invite-1",
            client_email: "future@example.com",
            expires_at: new Date("2026-03-16T00:00:00.000Z"),
            sent_at: now,
          },
          {
            id: "invite-2",
            client_email: "expired@example.com",
            expires_at: new Date("2026-03-01T00:00:00.000Z"),
            sent_at: now,
          },
        ]),
        findClientProfile: vi.fn(async () => null),
        findActiveTrainerForClient: vi.fn(async () => null),
        findLatestPendingInviteByEmail: vi.fn(async () => null),
      },
    });

    const result = await queries.getTrainerDashboard({
      trainerId: "trainer-1",
      role: "trainer",
    });

    expect(result.pending_invites).toHaveLength(1);
    expect(result.pending_invites[0].client_email).toBe("future@example.com");
  });

  it("returns pending state for unlinked client with active invite", async () => {
    const now = new Date("2026-03-09T00:00:00.000Z");

    const queries = new RelationshipQueries({
      now: () => now,
      repository: {
        listActiveClientsForTrainer: vi.fn(async () => []),
        listPendingInvitesForTrainer: vi.fn(async () => []),
        findClientProfile: vi.fn(async () => ({
          id: "client-1",
          email: "client@example.com",
          role: "client",
        })),
        findActiveTrainerForClient: vi.fn(async () => null),
        findLatestPendingInviteByEmail: vi.fn(async () => ({
          id: "invite-1",
          client_email: "client@example.com",
          expires_at: new Date("2026-03-16T00:00:00.000Z"),
          sent_at: now,
        })),
      },
    });

    const result = await queries.getClientConnection({
      clientId: "client-1",
      role: "client",
    });

    expect(result.status).toBe("pending");
  });
});