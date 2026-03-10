import type { SubmissionDurationWarning, SubmissionStatus, ExerciseLabelKey } from "./schemas";

export type SubmissionApiError = {
  code: string;
  message: string;
};

export type SubmissionHistoryItem = {
  id: string;
  request_id: string;
  exercise_key: ExerciseLabelKey;
  exercise_label: string;
  client_note: string | null;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  status: SubmissionStatus;
  submitted_at: string;
  ready_for_review_at: string | null;
};

export type SubmissionHistoryPage = {
  limit: number;
  has_more: boolean;
  next_cursor: string | null;
};

export type SubmissionFormDraft = {
  exercise_key: ExerciseLabelKey | "";
  exercise_custom_label: string;
  client_note: string;
  selected_file_name: string;
};

export type SubmissionFormStateInput = {
  draft: SubmissionFormDraft;
  has_selected_file: boolean;
  is_submitting: boolean;
  upload_progress_percent: number | null;
  duration_warning: SubmissionDurationWarning | null;
  error: SubmissionApiError | null;
  preserve_for_retry: boolean;
};

export type SubmissionFormViewState = {
  can_submit: boolean;
  requires_custom_label: boolean;
  label_error: string | null;
  progress_message: string | null;
  warning_message: string | null;
  error_message: string | null;
  retry_message: string | null;
  preserved_retry_metadata: SubmissionFormDraft;
};

export type SubmissionHistoryRow = {
  id: string;
  exercise_label: string;
  status: SubmissionStatus;
  submitted_at_iso: string;
  submitted_at_display: string;
  note_preview: string | null;
  file_name: string;
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (remainder === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainder}s`;
}

function formatSubmissionTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown submit time";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function toNotePreview(clientNote: string | null): string | null {
  if (!clientNote) {
    return null;
  }

  const trimmed = clientNote.trim();
  if (!trimmed) {
    return null;
  }

  const maxLength = 140;
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function getLabelErrorMessage(draft: SubmissionFormDraft): string | null {
  if (!draft.exercise_key) {
    return "Select an exercise label before submitting.";
  }

  if (draft.exercise_key === "other" && !draft.exercise_custom_label.trim()) {
    return "Custom exercise label is required when Other is selected.";
  }

  return null;
}

export function deriveSubmissionFormViewState(input: SubmissionFormStateInput): SubmissionFormViewState {
  const labelError = getLabelErrorMessage(input.draft);
  const canSubmit = input.has_selected_file && !input.is_submitting && !labelError;

  let progressMessage: string | null = null;
  if (input.is_submitting) {
    progressMessage =
      typeof input.upload_progress_percent === "number"
        ? `Uploading video and saving metadata (${Math.round(input.upload_progress_percent)}%)`
        : "Uploading video and saving metadata...";
  }

  let warningMessage: string | null = null;
  if (input.duration_warning) {
    warningMessage = `Duration warning: this video is ${formatDuration(input.duration_warning.duration_seconds)}. Recommended limit is ${formatDuration(input.duration_warning.recommended_limit_seconds)}.`;
  }

  const errorMessage = input.error?.message ?? null;
  const retryMessage =
    input.preserve_for_retry && input.error
      ? "Upload failed. Exercise label and note were preserved so you can retry."
      : null;

  return {
    can_submit: canSubmit,
    requires_custom_label: input.draft.exercise_key === "other",
    label_error: labelError,
    progress_message: progressMessage,
    warning_message: warningMessage,
    error_message: errorMessage,
    retry_message: retryMessage,
    preserved_retry_metadata: {
      exercise_key: input.draft.exercise_key,
      exercise_custom_label: input.draft.exercise_custom_label,
      client_note: input.draft.client_note,
      selected_file_name: input.draft.selected_file_name,
    },
  };
}

export function deriveSubmissionHistoryRows(history: SubmissionHistoryItem[]): SubmissionHistoryRow[] {
  return [...history]
    .sort((left, right) => {
      return new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime();
    })
    .map((entry) => ({
      id: entry.id,
      exercise_label: entry.exercise_label,
      status: entry.status,
      submitted_at_iso: entry.submitted_at,
      submitted_at_display: formatSubmissionTimestamp(entry.submitted_at),
      note_preview: toNotePreview(entry.client_note),
      file_name: entry.file_name,
    }));
}

export function mergeSubmissionHistoryEntries(
  current: SubmissionHistoryItem[],
  incoming: SubmissionHistoryItem[],
): SubmissionHistoryItem[] {
  const byId = new Map<string, SubmissionHistoryItem>();
  for (const item of current) {
    byId.set(item.id, item);
  }
  for (const item of incoming) {
    byId.set(item.id, item);
  }

  return [...byId.values()].sort(
    (left, right) => new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime(),
  );
}
