import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import type { SubmissionRecord } from "../../../../features/submissions/service";
import { SubmissionQueries, registerSubmissionQueriesFactory } from "../../../../features/submissions/queries";
import { GET } from "./route";

vi.mock("../../../../features/dev/local-runtime", () => ({
  ensureLocalRuntimeRegistered: vi.fn(),
}));

function createRecord(input: {
  clientId: string;
  requestId: string;
  submittedAt: string;
}): SubmissionRecord {
  const submitted = new Date(input.submittedAt);
  return {
    id: randomUUID(),
    request_id: input.requestId,
    client_id: input.clientId,
    trainer_id: "trainer-1",
    exercise_key: "squat",
    exercise_label: "Squat",
    client_note: null,
    file_name: `${input.requestId}.mp4`,
    mime_type: "video/mp4",
    file_size_bytes: 100_000,
    duration_seconds: 120,
    status: "ready_for_review",
    uploaded_at: submitted,
    submitted_at: submitted,
    ready_for_review_at: submitted,
    created_at: submitted,
    updated_at: submitted,
  };
}

function createGetRequest(input: { userId?: string; role?: "client" | "trainer"; query?: string }) {
  const headers = new Headers();
  if (input.userId) {
    headers.set("x-pt-user-id", input.userId);
  }
  if (input.role) {
    headers.set("x-pt-role", input.role);
  }

  const suffix = input.query ? `?${input.query}` : "";
  return new NextRequest(`http://localhost/api/submissions/history${suffix}`, {
    method: "GET",
    headers,
  });
}

describe("GET /api/submissions/history", () => {
  beforeEach(() => {
    const records = [
      createRecord({
        clientId: "client-1",
        requestId: "client-1-newest",
        submittedAt: "2026-03-11T12:00:00.000Z",
      }),
      createRecord({
        clientId: "client-1",
        requestId: "client-1-middle",
        submittedAt: "2026-03-10T12:00:00.000Z",
      }),
      createRecord({
        clientId: "client-1",
        requestId: "client-1-oldest",
        submittedAt: "2026-03-09T12:00:00.000Z",
      }),
      createRecord({
        clientId: "client-2",
        requestId: "client-2-secret",
        submittedAt: "2026-03-11T08:00:00.000Z",
      }),
    ];

    registerSubmissionQueriesFactory(
      () =>
        new SubmissionQueries({
          repository: {
            listByClient: vi.fn(async (input) =>
              records
                .filter((record) => record.client_id === input.clientId)
                .filter(
                  (record) =>
                    !input.cursorSubmittedAt || record.submitted_at.getTime() < input.cursorSubmittedAt.getTime(),
                )
                .sort((left, right) => right.submitted_at.getTime() - left.submitted_at.getTime())
                .slice(0, input.limit),
            ),
          },
        }),
    );
  });

  it("returns owner-only newest-first history with load-more metadata", async () => {
    const response = await GET(
      createGetRequest({
        userId: "client-1",
        role: "client",
        query: "limit=2",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.history.map((entry: { request_id: string }) => entry.request_id)).toEqual([
      "client-1-newest",
      "client-1-middle",
    ]);
    expect(body.history.map((entry: { request_id: string }) => entry.request_id)).not.toContain("client-2-secret");
    expect(body.page.has_more).toBe(true);
    expect(body.page.next_cursor).toBe("2026-03-10T12:00:00.000Z");
  });

  it("paginates with cursor for load-more behavior", async () => {
    const pageOneResponse = await GET(
      createGetRequest({
        userId: "client-1",
        role: "client",
        query: "limit=2",
      }),
    );
    const pageOne = await pageOneResponse.json();

    const pageTwoResponse = await GET(
      createGetRequest({
        userId: "client-1",
        role: "client",
        query: `limit=2&cursor=${encodeURIComponent(pageOne.page.next_cursor)}`,
      }),
    );
    const pageTwo = await pageTwoResponse.json();

    expect(pageTwoResponse.status).toBe(200);
    expect(pageTwo.history.map((entry: { request_id: string }) => entry.request_id)).toEqual(["client-1-oldest"]);
    expect(pageTwo.page.has_more).toBe(false);
    expect(pageTwo.page.next_cursor).toBeNull();
  });

  it("rejects unauthenticated history requests", async () => {
    const response = await GET(createGetRequest({}));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("rejects non-client history requests", async () => {
    const response = await GET(
      createGetRequest({
        userId: "trainer-1",
        role: "trainer",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN_ROLE");
  });
});
