import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { SubmissionRecord } from "./service";
import { SubmissionRepositoryConflictError, SubmissionService, SubmissionServiceError } from "./service";

function createPayload(overrides?: Partial<Record<string, unknown>>) {
  return {
    request_id: "4f7b93a6-51c4-4f2f-bfd0-0994f9f488aa",
    exercise: {
      key: "squat",
    },
    client_note: "review depth",
    file: {
      file_name: "set1.mp4",
      mime_type: "video/mp4",
      size_bytes: 10_000_000,
      duration_seconds: 245,
    },
    ...overrides,
  };
}

function createHarness() {
  const now = new Date("2026-03-10T00:00:00.000Z");
  const records: SubmissionRecord[] = [];
  const trainerLinks = new Map<string, string>([["client-1", "trainer-1"]]);

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
    listByClient: vi.fn(async (input: { clientId: string; limit: number; cursorSubmittedAt?: Date }) =>
      records
        .filter((record) => record.client_id === input.clientId)
        .filter((record) => !input.cursorSubmittedAt || record.submitted_at.getTime() < input.cursorSubmittedAt.getTime())
        .sort((left, right) => right.submitted_at.getTime() - left.submitted_at.getTime())
        .slice(0, input.limit),
    ),
  };

  const service = new SubmissionService({
    repository,
    now: () => now,
  });

  return {
    now,
    records,
    trainerLinks,
    repository,
    service,
  };
}

describe("SubmissionService", () => {
  it("transitions created submissions to ready_for_review", async () => {
    const harness = createHarness();
    const result = await harness.service.createSubmission({
      actor_id: "client-1",
      actor_role: "client",
      payload: createPayload(),
    });

    expect(result.action).toBe("created");
    expect(result.submission.status).toBe("ready_for_review");
    expect(result.submission.ready_for_review_at?.toISOString()).toBe(harness.now.toISOString());
    expect(harness.repository.updateStatus).toHaveBeenCalledOnce();
  });

  it("blocks non-client actors from creating submissions", async () => {
    const harness = createHarness();

    await expect(
      harness.service.createSubmission({
        actor_id: "trainer-1",
        actor_role: "trainer",
        payload: createPayload(),
      }),
    ).rejects.toMatchObject<Partial<SubmissionServiceError>>({
      code: "FORBIDDEN_ROLE",
      httpStatus: 403,
    });
  });

  it("rejects create when client has no active trainer link", async () => {
    const harness = createHarness();
    harness.trainerLinks.delete("client-1");

    await expect(
      harness.service.createSubmission({
        actor_id: "client-1",
        actor_role: "client",
        payload: createPayload(),
      }),
    ).rejects.toMatchObject<Partial<SubmissionServiceError>>({
      code: "TRAINER_LINK_NOT_FOUND",
      httpStatus: 409,
    });
  });

  it("returns deduplicated result when request id already exists", async () => {
    const harness = createHarness();
    const payload = createPayload();

    const first = await harness.service.createSubmission({
      actor_id: "client-1",
      actor_role: "client",
      payload,
    });

    const second = await harness.service.createSubmission({
      actor_id: "client-1",
      actor_role: "client",
      payload,
    });

    expect(first.action).toBe("created");
    expect(second.action).toBe("deduplicated");
    expect(second.submission.id).toBe(first.submission.id);
    expect(harness.repository.create).toHaveBeenCalledOnce();
  });

  it("handles in-flight duplicate conflict by returning the existing submission", async () => {
    const harness = createHarness();
    const payload = createPayload();

    const existing = await harness.service.createSubmission({
      actor_id: "client-1",
      actor_role: "client",
      payload,
    });

    harness.repository.findByClientAndRequestId.mockImplementationOnce(async () => null);
    harness.repository.create.mockImplementationOnce(async () => {
      throw new SubmissionRepositoryConflictError("DUPLICATE_REQUEST", "Request already exists.");
    });

    const result = await harness.service.createSubmission({
      actor_id: "client-1",
      actor_role: "client",
      payload,
    });

    expect(result.action).toBe("deduplicated");
    expect(result.submission.id).toBe(existing.submission.id);
    expect(harness.repository.findByClientAndRequestId).toHaveBeenCalledTimes(3);
  });

  it("persists canonical exercise and optional custom label metadata", async () => {
    const harness = createHarness();
    const result = await harness.service.createSubmission({
      actor_id: "client-1",
      actor_role: "client",
      payload: createPayload({
        exercise: {
          key: "other",
          custom_label: "Split Squat Variation",
        },
        client_note: undefined,
      }),
    });

    expect(result.submission.exercise_key).toBe("other");
    expect(result.submission.exercise_label).toBe("Split Squat Variation");
    expect(result.submission.client_note).toBeNull();
  });

  it("lists client submissions in newest-first order", async () => {
    const harness = createHarness();
    const first = await harness.service.createSubmission({
      actor_id: "client-1",
      actor_role: "client",
      payload: createPayload(),
    });

    harness.records.push({
      ...first.submission,
      id: randomUUID(),
      request_id: "ab8140c3-4cfc-4ef4-bca6-eb0a90f1f514",
      submitted_at: new Date("2026-03-11T00:00:00.000Z"),
      uploaded_at: new Date("2026-03-11T00:00:00.000Z"),
      created_at: new Date("2026-03-11T00:00:00.000Z"),
      updated_at: new Date("2026-03-11T00:00:00.000Z"),
      ready_for_review_at: new Date("2026-03-11T00:00:00.000Z"),
    });

    const listed = await harness.service.listClientSubmissions({
      actor_id: "client-1",
      actor_role: "client",
      limit: 10,
    });

    expect(listed).toHaveLength(2);
    expect(listed[0].submitted_at.toISOString()).toBe("2026-03-11T00:00:00.000Z");
  });
});

