import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import type { SubmissionRecord } from "../../../../features/submissions/service";
import {
  SubmissionRepositoryConflictError,
  SubmissionService,
  SubmissionServiceError,
  registerSubmissionServiceFactory,
} from "../../../../features/submissions/service";
import { POST } from "./route";

vi.mock("../../../../features/dev/local-runtime", () => ({
  ensureLocalRuntimeRegistered: vi.fn(),
}));

function createPayload(overrides?: Record<string, unknown>) {
  return {
    request_id: randomUUID(),
    exercise: {
      key: "squat",
    },
    client_note: "check depth",
    file: {
      file_name: "set1.mp4",
      mime_type: "video/mp4",
      size_bytes: 5_000_000,
      duration_seconds: 180,
    },
    ...overrides,
  };
}

function createServiceHarness() {
  const now = new Date("2026-03-10T00:00:00.000Z");
  const trainerLinks = new Map<string, string>([["client-1", "trainer-1"]]);
  const records: SubmissionRecord[] = [];

  const repository = {
    findByClientAndRequestId: vi.fn(async (clientId: string, requestId: string) => {
      return records.find((record) => record.client_id === clientId && record.request_id === requestId) ?? null;
    }),
    findActiveTrainerIdForClient: vi.fn(async (clientId: string) => trainerLinks.get(clientId) ?? null),
    create: vi.fn(async (input) => {
      const existing = records.find(
        (record) => record.client_id === input.client_id && record.request_id === input.request_id,
      );
      if (existing) {
        throw new SubmissionRepositoryConflictError("DUPLICATE_REQUEST", "Request already exists.");
      }

      const created: SubmissionRecord = {
        id: randomUUID(),
        request_id: input.request_id,
        client_id: input.client_id,
        trainer_id: input.trainer_id,
        exercise_key: input.exercise_key,
        exercise_label: input.exercise_label,
        client_note: input.client_note,
        file_name: input.file_name,
        mime_type: input.mime_type,
        file_size_bytes: input.file_size_bytes,
        duration_seconds: input.duration_seconds,
        status: input.status,
        uploaded_at: input.uploaded_at,
        submitted_at: input.submitted_at,
        ready_for_review_at: null,
        created_at: now,
        updated_at: now,
      };
      records.push(created);
      return created;
    }),
    updateStatus: vi.fn(async (input: { submissionId: string; status: "ready_for_review"; transitionedAt: Date }) => {
      const record = records.find((value) => value.id === input.submissionId);
      if (!record) {
        throw new SubmissionServiceError("SUBMISSION_NOT_FOUND", "Submission not found.", 404);
      }

      record.status = input.status;
      record.ready_for_review_at = input.transitionedAt;
      record.updated_at = input.transitionedAt;
      return record;
    }),
  };

  const service = new SubmissionService({
    repository,
    now: () => now,
  });

  return { service };
}

function createJsonRequest(input: {
  payload: Record<string, unknown>;
  userId?: string;
  role?: "client" | "trainer";
}) {
  const headers = new Headers({
    "content-type": "application/json",
  });
  if (input.userId) {
    headers.set("x-pt-user-id", input.userId);
  }
  if (input.role) {
    headers.set("x-pt-role", input.role);
  }

  return new NextRequest("http://localhost/api/submissions/create", {
    method: "POST",
    headers,
    body: JSON.stringify(input.payload),
  });
}

function createFormRequest(input: { userId: string; role: "client" | "trainer"; formData: FormData }) {
  const headers = new Headers({
    "x-pt-user-id": input.userId,
    "x-pt-role": input.role,
  });

  return new NextRequest("http://localhost/api/submissions/create", {
    method: "POST",
    headers,
    body: input.formData,
  });
}

describe("POST /api/submissions/create", () => {
  beforeEach(() => {
    const harness = createServiceHarness();
    registerSubmissionServiceFactory(() => harness.service);
  });

  it("creates a submission for authenticated clients using multipart payload", async () => {
    const formData = new FormData();
    formData.set("request_id", randomUUID());
    formData.set("exercise_key", "squat");
    formData.set("client_note", "check rep tempo");
    formData.set("duration_seconds", "240");
    formData.set("file", new File(["video-bytes"], "set1.mp4", { type: "video/mp4" }));

    const response = await POST(
      createFormRequest({
        userId: "client-1",
        role: "client",
        formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.action).toBe("created");
    expect(body.submission.status).toBe("ready_for_review");
    expect(body.submission.file_name).toBe("set1.mp4");
  });

  it("rejects unsupported file types", async () => {
    const response = await POST(
      createJsonRequest({
        userId: "client-1",
        role: "client",
        payload: createPayload({
          file: {
            file_name: "set1.webm",
            mime_type: "video/webm",
            size_bytes: 5_000_000,
          },
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("rejects oversize files", async () => {
    const response = await POST(
      createJsonRequest({
        userId: "client-1",
        role: "client",
        payload: createPayload({
          file: {
            file_name: "set1.mp4",
            mime_type: "video/mp4",
            size_bytes: 500 * 1024 * 1024 + 1,
          },
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("requires custom label when exercise key is other", async () => {
    const response = await POST(
      createJsonRequest({
        userId: "client-1",
        role: "client",
        payload: createPayload({
          exercise: {
            key: "other",
          },
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("rejects unauthenticated requests", async () => {
    const response = await POST(
      createJsonRequest({
        payload: createPayload(),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("rejects non-client actors", async () => {
    const response = await POST(
      createJsonRequest({
        userId: "trainer-1",
        role: "trainer",
        payload: createPayload(),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN_ROLE");
  });
});
