import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { SubmissionRecord } from "./service";
import { SubmissionQueries, SubmissionQueriesError } from "./queries";

function createRecord(input: {
  clientId: string;
  submittedAt: string;
  requestId?: string;
}): SubmissionRecord {
  const submitted = new Date(input.submittedAt);
  return {
    id: randomUUID(),
    request_id: input.requestId ?? randomUUID(),
    client_id: input.clientId,
    trainer_id: "trainer-1",
    exercise_key: "squat",
    exercise_label: "Squat",
    client_note: null,
    file_name: "set1.mp4",
    mime_type: "video/mp4",
    file_size_bytes: 500_000,
    duration_seconds: 180,
    status: "ready_for_review",
    uploaded_at: submitted,
    submitted_at: submitted,
    ready_for_review_at: submitted,
    created_at: submitted,
    updated_at: submitted,
  };
}

describe("SubmissionQueries", () => {
  it("returns owner-scoped submissions in newest-first order", async () => {
    const records = [
      createRecord({ clientId: "client-1", submittedAt: "2026-03-10T10:00:00.000Z" }),
      createRecord({ clientId: "client-2", submittedAt: "2026-03-10T12:00:00.000Z" }),
      createRecord({ clientId: "client-1", submittedAt: "2026-03-11T09:00:00.000Z" }),
    ];

    const queries = new SubmissionQueries({
      repository: {
        listByClient: vi.fn(async (input) =>
          records
            .filter((record) => record.client_id === input.clientId)
            .slice(0, input.limit)
            .reverse(),
        ),
      },
    });

    const result = await queries.listClientHistory({
      actor_id: "client-1",
      actor_role: "client",
      limit: 10,
    });

    expect(result.submissions).toHaveLength(2);
    expect(result.submissions[0].client_id).toBe("client-1");
    expect(result.submissions[0].submitted_at.toISOString()).toBe("2026-03-11T09:00:00.000Z");
    expect(result.page.has_more).toBe(false);
    expect(result.page.next_cursor).toBeNull();
  });

  it("supports cursor pagination with load-more metadata", async () => {
    const records = [
      createRecord({ clientId: "client-1", submittedAt: "2026-03-11T09:00:00.000Z" }),
      createRecord({ clientId: "client-1", submittedAt: "2026-03-10T09:00:00.000Z" }),
      createRecord({ clientId: "client-1", submittedAt: "2026-03-09T09:00:00.000Z" }),
    ];

    const queries = new SubmissionQueries({
      repository: {
        listByClient: vi.fn(async (input) =>
          records
            .filter((record) => record.client_id === input.clientId)
            .filter(
              (record) =>
                !input.cursorSubmittedAt || record.submitted_at.getTime() < input.cursorSubmittedAt.getTime(),
            )
            .slice(0, input.limit),
        ),
      },
    });

    const pageOne = await queries.listClientHistory({
      actor_id: "client-1",
      actor_role: "client",
      limit: 2,
    });

    expect(pageOne.submissions).toHaveLength(2);
    expect(pageOne.page.has_more).toBe(true);
    expect(pageOne.page.next_cursor).toBe("2026-03-10T09:00:00.000Z");

    const pageTwo = await queries.listClientHistory({
      actor_id: "client-1",
      actor_role: "client",
      limit: 2,
      cursor: pageOne.page.next_cursor ?? undefined,
    });

    expect(pageTwo.submissions).toHaveLength(1);
    expect(pageTwo.submissions[0].submitted_at.toISOString()).toBe("2026-03-09T09:00:00.000Z");
    expect(pageTwo.page.has_more).toBe(false);
  });

  it("rejects non-client actors", async () => {
    const queries = new SubmissionQueries({
      repository: {
        listByClient: vi.fn(async () => []),
      },
    });

    await expect(
      queries.listClientHistory({
        actor_id: "trainer-1",
        actor_role: "trainer",
      }),
    ).rejects.toMatchObject<Partial<SubmissionQueriesError>>({
      code: "FORBIDDEN_ROLE",
      httpStatus: 403,
    });
  });

  it("rejects invalid cursors", async () => {
    const queries = new SubmissionQueries({
      repository: {
        listByClient: vi.fn(async () => []),
      },
    });

    await expect(
      queries.listClientHistory({
        actor_id: "client-1",
        actor_role: "client",
        cursor: "not-a-date",
      }),
    ).rejects.toMatchObject<Partial<SubmissionQueriesError>>({
      code: "INVALID_CURSOR",
      httpStatus: 400,
    });
  });
});
