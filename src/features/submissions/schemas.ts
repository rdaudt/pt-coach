import { z } from "zod";

export const submissionStatusSchema = z.enum(["uploaded", "ready_for_review", "feedback_sent"]);
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;

export const EXERCISE_LABEL_OPTIONS = [
  { key: "squat", label: "Squat", search_terms: ["squat"] },
  { key: "deadlift", label: "Deadlift", search_terms: ["deadlift"] },
  { key: "bench_press", label: "Bench Press", search_terms: ["bench press", "bench"] },
  { key: "overhead_press", label: "Overhead Press", search_terms: ["overhead press", "shoulder press"] },
  { key: "row", label: "Row", search_terms: ["row"] },
  { key: "pull_up", label: "Pull-Up", search_terms: ["pull-up", "pull up"] },
  { key: "other", label: "Other", search_terms: ["other"] },
] as const;

export const MAX_CLIENT_NOTE_LENGTH = 1_000;
export const MAX_CUSTOM_EXERCISE_LABEL_LENGTH = 120;
export const MAX_VIDEO_FILE_SIZE_BYTES = 500 * 1024 * 1024;
export const DURATION_WARNING_SECONDS = 10 * 60;
export const VIDEO_FILE_MIME_TYPES = ["video/mp4", "video/quicktime"] as const;
export const VIDEO_FILE_EXTENSIONS = [".mp4", ".mov"] as const;

export const exerciseLabelKeySchema = z.enum(EXERCISE_LABEL_OPTIONS.map((option) => option.key));
export type ExerciseLabelKey = z.infer<typeof exerciseLabelKeySchema>;

const exerciseLabelMap = new Map<ExerciseLabelKey, string>(
  EXERCISE_LABEL_OPTIONS.map((option) => [option.key, option.label]),
);

export function searchExerciseLabelOptions(query: string): ReadonlyArray<(typeof EXERCISE_LABEL_OPTIONS)[number]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return EXERCISE_LABEL_OPTIONS;
  }

  return EXERCISE_LABEL_OPTIONS.filter((option) => {
    if (option.label.toLowerCase().includes(normalized)) {
      return true;
    }
    return option.search_terms.some((term) => term.includes(normalized));
  });
}

export function resolveExerciseDisplayLabel(input: { key: ExerciseLabelKey; custom_label?: string }): string {
  if (input.key === "other") {
    return input.custom_label?.trim() ?? "";
  }

  return exerciseLabelMap.get(input.key) ?? "";
}

export const submissionExerciseSchema = z
  .object({
    key: exerciseLabelKeySchema,
    custom_label: z.string().trim().min(1).max(MAX_CUSTOM_EXERCISE_LABEL_LENGTH).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.key === "other" && !value.custom_label) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["custom_label"],
        message: "Custom exercise label is required when Other is selected.",
      });
    }

    if (value.key !== "other" && value.custom_label) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["custom_label"],
        message: "Custom exercise label is only allowed when Other is selected.",
      });
    }
  });

export const submissionFileSchema = z
  .object({
    file_name: z.string().trim().min(1).max(255),
    mime_type: z.enum(VIDEO_FILE_MIME_TYPES),
    size_bytes: z
      .number()
      .int()
      .positive()
      .max(MAX_VIDEO_FILE_SIZE_BYTES, `Video files must be ${MAX_VIDEO_FILE_SIZE_BYTES} bytes or smaller.`),
    duration_seconds: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    const lowerName = value.file_name.toLowerCase();
    const isAllowedExtension = VIDEO_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension));

    if (!isAllowedExtension) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["file_name"],
        message: "Only MP4 and MOV files are supported.",
      });
    }
  });

const clientNoteSchema = z
  .string()
  .trim()
  .max(MAX_CLIENT_NOTE_LENGTH)
  .optional()
  .transform((value) => {
    if (!value) {
      return undefined;
    }
    return value;
  });

export const createSubmissionSchema = z.object({
  request_id: z.string().uuid(),
  exercise: submissionExerciseSchema,
  client_note: clientNoteSchema,
  file: submissionFileSchema,
});

export type SubmissionExerciseInput = z.infer<typeof submissionExerciseSchema>;
export type SubmissionFileInput = z.infer<typeof submissionFileSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

export type SubmissionDurationWarning = {
  should_warn: true;
  recommended_limit_seconds: number;
  duration_seconds: number;
};

export function getDurationWarningMetadata(durationSeconds?: number): SubmissionDurationWarning | null {
  if (!durationSeconds || durationSeconds <= DURATION_WARNING_SECONDS) {
    return null;
  }

  return {
    should_warn: true,
    recommended_limit_seconds: DURATION_WARNING_SECONDS,
    duration_seconds: durationSeconds,
  };
}
