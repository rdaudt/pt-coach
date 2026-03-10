import { describe, expect, it } from "vitest";

import {
  deriveSubmissionFormViewState,
  mergeSubmissionHistoryEntries,
  type SubmissionFormStateInput,
  type SubmissionHistoryItem,
} from "./selectors";

function createFormInput(overrides?: Partial<SubmissionFormStateInput>): SubmissionFormStateInput {
  return {
    draft: {
      exercise_key: "squat",
      exercise_custom_label: "",
      client_note: "",
      selected_file_name: "set1.mp4",
    },
    has_selected_file: true,
    is_submitting: false,
    upload_progress_percent: null,
    duration_warning: null,
    error: null,
    preserve_for_retry: false,
    ...overrides,
  };
}

function createHistoryItem(input: {
  id: string;
  submittedAt: string;
  exerciseLabel: string;
}): SubmissionHistoryItem {
  return {
    id: input.id,
    request_id: `${input.id}-request`,
    exercise_key: "squat",
    exercise_label: input.exerciseLabel,
    client_note: null,
    file_name: `${input.id}.mp4`,
    mime_type: "video/mp4",
    file_size_bytes: 100_000,
    duration_seconds: 200,
    status: "ready_for_review",
    submitted_at: input.submittedAt,
    ready_for_review_at: input.submittedAt,
  };
}

describe("submission selectors", () => {
  it("flags custom-label validation when Other is selected without custom text", () => {
    const state = deriveSubmissionFormViewState(
      createFormInput({
        draft: {
          exercise_key: "other",
          exercise_custom_label: "   ",
          client_note: "check depth",
          selected_file_name: "set1.mp4",
        },
      }),
    );

    expect(state.requires_custom_label).toBe(true);
    expect(state.label_error).toContain("Custom exercise label is required");
    expect(state.can_submit).toBe(false);
  });

  it("derives in-flight progress state", () => {
    const state = deriveSubmissionFormViewState(
      createFormInput({
        is_submitting: true,
        upload_progress_percent: 42,
      }),
    );

    expect(state.progress_message).toContain("42%");
    expect(state.can_submit).toBe(false);
  });

  it("derives duration warning state from API metadata", () => {
    const state = deriveSubmissionFormViewState(
      createFormInput({
        duration_warning: {
          should_warn: true,
          recommended_limit_seconds: 600,
          duration_seconds: 900,
        },
      }),
    );

    expect(state.warning_message).toContain("Duration warning");
    expect(state.warning_message).toContain("Recommended limit");
  });

  it("derives retry message while preserving metadata", () => {
    const state = deriveSubmissionFormViewState(
      createFormInput({
        draft: {
          exercise_key: "deadlift",
          exercise_custom_label: "",
          client_note: "preserve this",
          selected_file_name: "set2.mp4",
        },
        error: {
          code: "NETWORK_ERROR",
          message: "Connection dropped.",
        },
        preserve_for_retry: true,
      }),
    );

    expect(state.error_message).toBe("Connection dropped.");
    expect(state.retry_message).toContain("preserved");
    expect(state.preserved_retry_metadata.exercise_key).toBe("deadlift");
    expect(state.preserved_retry_metadata.client_note).toBe("preserve this");
  });

  it("merges load-more pages without duplicates and keeps newest-first order", () => {
    const current = [
      createHistoryItem({
        id: "history-2",
        submittedAt: "2026-03-10T10:00:00.000Z",
        exerciseLabel: "Bench Press",
      }),
      createHistoryItem({
        id: "history-1",
        submittedAt: "2026-03-09T10:00:00.000Z",
        exerciseLabel: "Squat",
      }),
    ];

    const incoming = [
      createHistoryItem({
        id: "history-3",
        submittedAt: "2026-03-11T10:00:00.000Z",
        exerciseLabel: "Deadlift",
      }),
      createHistoryItem({
        id: "history-1",
        submittedAt: "2026-03-09T10:00:00.000Z",
        exerciseLabel: "Squat",
      }),
    ];

    const merged = mergeSubmissionHistoryEntries(current, incoming);

    expect(merged.map((entry) => entry.id)).toEqual(["history-3", "history-2", "history-1"]);
  });
});
