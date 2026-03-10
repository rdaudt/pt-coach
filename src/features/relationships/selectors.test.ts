import { describe, expect, it } from "vitest";

import { deriveClientConnectionState, deriveTrainerOverviewMetrics } from "./selectors";

describe("relationship selectors", () => {
  it("derives active client connection state", () => {
    const state = deriveClientConnectionState({
      status: "active",
      trainer: {
        id: "trainer-1",
        display_name: "Coach Alex",
        business_name: null,
      },
      linked_at: null,
    });

    expect(state.status).toBe("active");
    expect(state.detail).toContain("Coach Alex");
    expect(state.action_href).toBe("/client/submissions");
  });

  it("derives trainer overview metrics", () => {
    const metrics = deriveTrainerOverviewMetrics({
      active_clients: [
        {
          id: "client-1",
          email: "client1@example.com",
          full_name: "Client One",
          linked_at: new Date("2026-03-09T00:00:00.000Z"),
        },
      ],
      pending_invites: [
        {
          id: "invite-1",
          client_email: "pending@example.com",
          expires_at: new Date("2026-03-16T00:00:00.000Z"),
          sent_at: new Date("2026-03-09T00:00:00.000Z"),
        },
      ],
    });

    expect(metrics.active_clients_count).toBe(1);
    expect(metrics.pending_invites_count).toBe(1);
    expect(metrics.has_active_clients).toBe(true);
    expect(metrics.has_pending_invites).toBe(true);
  });
});
