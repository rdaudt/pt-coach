import { describe, expect, it } from "vitest";

import {
  DURATION_WARNING_SECONDS,
  MAX_CLIENT_NOTE_LENGTH,
  MAX_VIDEO_FILE_SIZE_BYTES,
  createSubmissionSchema,
  getDurationWarningMetadata,
  resolveExerciseDisplayLabel,
  searchExerciseLabelOptions,
  submissionFileSchema,
} from "./schemas";

function validPayload() {
  return {
    request_id: "9f85a719-5756-40e9-b867-c95af6dd950f",
    exercise: {
      key: "squat" as const,
    },
    client_note: "hips drift on rep 3",
    file: {
      file_name: "set1.mp4",
      mime_type: "video/mp4" as const,
      size_bytes: 120_000_000,
      duration_seconds: 280,
    },
  };
}

describe("createSubmissionSchema", () => {
  it("accepts controlled exercise keys and optional client note", () => {
    const parsed = createSubmissionSchema.parse(validPayload());

    expect(parsed.exercise.key).toBe("squat");
    expect(parsed.client_note).toBe("hips drift on rep 3");
  });

  it("trims an empty note to undefined", () => {
    const parsed = createSubmissionSchema.parse({
      ...validPayload(),
      client_note: "   ",
    });

    expect(parsed.client_note).toBeUndefined();
  });

  it("requires custom label when exercise key is other", () => {
    const result = createSubmissionSchema.safeParse({
      ...validPayload(),
      exercise: {
        key: "other",
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects custom label when exercise key is controlled", () => {
    const result = createSubmissionSchema.safeParse({
      ...validPayload(),
      exercise: {
        key: "deadlift",
        custom_label: "Romanian Deadlift",
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects client note longer than configured max", () => {
    const result = createSubmissionSchema.safeParse({
      ...validPayload(),
      client_note: "a".repeat(MAX_CLIENT_NOTE_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });
});

describe("submissionFileSchema", () => {
  it("allows MP4 and MOV payloads under size cap", () => {
    const mp4Result = submissionFileSchema.safeParse({
      file_name: "attempt.mp4",
      mime_type: "video/mp4",
      size_bytes: 10_000,
    });
    const movResult = submissionFileSchema.safeParse({
      file_name: "attempt.mov",
      mime_type: "video/quicktime",
      size_bytes: 10_000,
    });

    expect(mp4Result.success).toBe(true);
    expect(movResult.success).toBe(true);
  });

  it("rejects unsupported mime types", () => {
    const result = submissionFileSchema.safeParse({
      file_name: "attempt.mp4",
      mime_type: "video/webm",
      size_bytes: 10_000,
    });

    expect(result.success).toBe(false);
  });

  it("rejects unsupported file extensions", () => {
    const result = submissionFileSchema.safeParse({
      file_name: "attempt.avi",
      mime_type: "video/mp4",
      size_bytes: 10_000,
    });

    expect(result.success).toBe(false);
  });

  it("rejects files larger than 500MB", () => {
    const result = submissionFileSchema.safeParse({
      file_name: "attempt.mp4",
      mime_type: "video/mp4",
      size_bytes: MAX_VIDEO_FILE_SIZE_BYTES + 1,
    });

    expect(result.success).toBe(false);
  });
});

describe("search and duration helpers", () => {
  it("finds controlled labels through search terms", () => {
    const options = searchExerciseLabelOptions("shoulder");
    expect(options.map((option) => option.key)).toContain("overhead_press");
  });

  it("resolves display label by controlled key and custom label", () => {
    expect(resolveExerciseDisplayLabel({ key: "row" })).toBe("Row");
    expect(resolveExerciseDisplayLabel({ key: "other", custom_label: "Wall Sit" })).toBe("Wall Sit");
  });

  it("returns soft warning metadata without blocking parse", () => {
    const warning = getDurationWarningMetadata(DURATION_WARNING_SECONDS + 1);
    const noWarning = getDurationWarningMetadata(DURATION_WARNING_SECONDS);

    expect(warning).toEqual({
      should_warn: true,
      recommended_limit_seconds: DURATION_WARNING_SECONDS,
      duration_seconds: DURATION_WARNING_SECONDS + 1,
    });
    expect(noWarning).toBeNull();
  });
});

