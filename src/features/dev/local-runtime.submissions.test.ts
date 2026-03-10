import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST as createSubmission } from "../../app/api/submissions/create/route";
import { GET as getSubmissionHistory } from "../../app/api/submissions/history/route";
import {
  resetLocalRuntimeForTests,
  seedLocalRelationshipForTests,
  seedLocalSubmissionForTests,
} from "./local-runtime";

function createSubmissionPayload(requestId: string) {
  return {
    request_id: requestId,
    exercise: {
      key: "squat",
    },
    client_note: "check bar path",
    file: {
      file_name: "set1.mp4",
      mime_type: "video/mp4",
      size_bytes: 500_000,
      duration_seconds: 180,
    },
  };
}

function createSubmissionRequest(input: { clientId: string; payload: Record<string, unknown> }) {
  return new NextRequest("http://localhost/api/submissions/create", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-pt-user-id": input.clientId,
      "x-pt-role": "client",
    },
    body: JSON.stringify(input.payload),
  });
}

function createHistoryRequest(input: { clientId: string; query?: string }) {
  const suffix = input.query ? `?${input.query}` : "";
  return new NextRequest(`http://localhost/api/submissions/history${suffix}`, {
    method: "GET",
    headers: {
      "x-pt-user-id": input.clientId,
      "x-pt-role": "client",
    },
  });
}

describe("local runtime submission adapters", () => {
  beforeEach(() => {
    resetLocalRuntimeForTests();
    seedLocalRelationshipForTests({
      clientId: "client-1",
      trainerId: "trainer-1",
      status: "active",
    });
    seedLocalRelationshipForTests({
      clientId: "client-2",
      trainerId: "trainer-2",
      status: "active",
    });
  });

  it("supports create and owner-scoped history routes without external dependencies", async () => {
    seedLocalSubmissionForTests({
      requestId: "seeded-client-1",
      clientId: "client-1",
      trainerId: "trainer-1",
      submittedAt: new Date("2026-03-01T00:00:00.000Z"),
    });

    const clientOneRequestId = randomUUID();
    const createClientOneResponse = await createSubmission(
      createSubmissionRequest({
        clientId: "client-1",
        payload: createSubmissionPayload(clientOneRequestId),
      }),
    );
    const createClientOneBody = await createClientOneResponse.json();
    expect(createClientOneResponse.status).toBe(200);
    expect(createClientOneBody.status).toBe("ok");

    const clientTwoRequestId = randomUUID();
    const createClientTwoResponse = await createSubmission(
      createSubmissionRequest({
        clientId: "client-2",
        payload: createSubmissionPayload(clientTwoRequestId),
      }),
    );
    expect(createClientTwoResponse.status).toBe(200);

    const pageOneResponse = await getSubmissionHistory(
      createHistoryRequest({
        clientId: "client-1",
        query: "limit=1",
      }),
    );
    const pageOneBody = await pageOneResponse.json();
    expect(pageOneResponse.status).toBe(200);
    expect(pageOneBody.status).toBe("ok");
    expect(pageOneBody.page.has_more).toBe(true);

    const pageTwoResponse = await getSubmissionHistory(
      createHistoryRequest({
        clientId: "client-1",
        query: `limit=1&cursor=${encodeURIComponent(pageOneBody.page.next_cursor)}`,
      }),
    );
    const pageTwoBody = await pageTwoResponse.json();
    expect(pageTwoResponse.status).toBe(200);
    expect(pageTwoBody.status).toBe("ok");

    const historyIds = [
      ...pageOneBody.history.map((entry: { request_id: string }) => entry.request_id),
      ...pageTwoBody.history.map((entry: { request_id: string }) => entry.request_id),
    ];

    expect(historyIds).toContain(clientOneRequestId);
    expect(historyIds).toContain("seeded-client-1");
    expect(historyIds).not.toContain(clientTwoRequestId);
  });
});
