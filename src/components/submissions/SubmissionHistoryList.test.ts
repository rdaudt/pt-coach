import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { SubmissionHistoryItem } from "../../features/submissions/selectors";
import { SubmissionHistoryList } from "./SubmissionHistoryList";

function createEntry(input: {
  id: string;
  submittedAt: string;
  exerciseLabel: string;
  status?: SubmissionHistoryItem["status"];
  note?: string | null;
}): SubmissionHistoryItem {
  return {
    id: input.id,
    request_id: `${input.id}-request`,
    exercise_key: "squat",
    exercise_label: input.exerciseLabel,
    client_note: input.note ?? null,
    file_name: `${input.id}.mp4`,
    mime_type: "video/mp4",
    file_size_bytes: 100_000,
    duration_seconds: 180,
    status: input.status ?? "ready_for_review",
    submitted_at: input.submittedAt,
    ready_for_review_at: input.submittedAt,
  };
}

describe("SubmissionHistoryList", () => {
  it("renders newest-first rows with key row metadata", () => {
    const oldEntry = createEntry({
      id: "older",
      submittedAt: "2026-03-09T11:00:00.000Z",
      exerciseLabel: "Squat",
      status: "uploaded",
      note: "old note",
    });
    const newEntry = createEntry({
      id: "newer",
      submittedAt: "2026-03-11T11:00:00.000Z",
      exerciseLabel: "Deadlift",
      status: "ready_for_review",
      note: "new note",
    });

    const html = renderToStaticMarkup(
      createElement(SubmissionHistoryList, {
        entries: [oldEntry, newEntry],
        is_loading: false,
        has_more: true,
        is_loading_more: false,
        error_message: null,
      }),
    );

    expect(html.indexOf("Deadlift")).toBeLessThan(html.indexOf("Squat"));
    expect(html).toContain("Submitted");
    expect(html).toContain("Ready for Review");
    expect(html).toContain("File: newer.mp4");
    expect(html).toContain("Note: new note");
    expect(html).toContain("Load more");
  });

  it("shows load-more pending state and appends provided rows", () => {
    const pageOne = createEntry({
      id: "page-one",
      submittedAt: "2026-03-11T11:00:00.000Z",
      exerciseLabel: "Bench Press",
    });
    const pageTwo = createEntry({
      id: "page-two",
      submittedAt: "2026-03-10T11:00:00.000Z",
      exerciseLabel: "Row",
    });

    const html = renderToStaticMarkup(
      createElement(SubmissionHistoryList, {
        entries: [pageOne, pageTwo],
        is_loading: false,
        has_more: true,
        is_loading_more: true,
        error_message: null,
      }),
    );

    expect(html).toContain("Bench Press");
    expect(html).toContain("Row");
    expect(html).toContain("Loading more...");
  });
});
