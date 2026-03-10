"use client";

import React, { useMemo, useRef, useState } from "react";

import {
  EXERCISE_LABEL_OPTIONS,
  searchExerciseLabelOptions,
  type ExerciseLabelKey,
} from "../../features/submissions/schemas";
import {
  deriveSubmissionFormViewState,
  type SubmissionApiError,
  type SubmissionHistoryItem,
} from "../../features/submissions/selectors";

type SubmissionFormProps = {
  onSubmissionCreated?: (submission: SubmissionHistoryItem) => void;
};

type ApiSuccessResponse = {
  status: "ok";
  action: "created" | "deduplicated";
  submission: SubmissionHistoryItem;
  duration_warning: {
    should_warn: true;
    recommended_limit_seconds: number;
    duration_seconds: number;
  } | null;
};

type ApiErrorResponse = {
  status: "error";
  error: {
    code?: string;
    message?: string;
  };
};

function createDefaultDraft() {
  return {
    exercise_key: "" as ExerciseLabelKey | "",
    exercise_custom_label: "",
    client_note: "",
    selected_file_name: "",
  };
}

function asApiError(value: unknown): SubmissionApiError {
  if (value && typeof value === "object" && "status" in value) {
    const candidate = value as ApiErrorResponse;
    if (candidate.status === "error") {
      return {
        code: candidate.error.code ?? "UPLOAD_FAILED",
        message: candidate.error.message ?? "Upload failed.",
      };
    }
  }

  return {
    code: "UPLOAD_FAILED",
    message: "Upload failed. Please retry.",
  };
}

function isSuccessResponse(value: unknown): value is ApiSuccessResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as { status?: string; submission?: unknown };
  return candidate.status === "ok" && Boolean(candidate.submission);
}

function getSubmitSuccessMessage(action: "created" | "deduplicated"): string {
  if (action === "deduplicated") {
    return "This upload request was already received. History has been updated.";
  }
  return "Video submitted. It is now ready for review.";
}

export function SubmissionForm({ onSubmissionCreated }: SubmissionFormProps) {
  const [draft, setDraft] = useState(createDefaultDraft);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [labelQuery, setLabelQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const [durationWarning, setDurationWarning] = useState<ApiSuccessResponse["duration_warning"]>(null);
  const [apiError, setApiError] = useState<SubmissionApiError | null>(null);
  const [preserveForRetry, setPreserveForRetry] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => searchExerciseLabelOptions(labelQuery), [labelQuery]);
  const selectedOption = useMemo(
    () => EXERCISE_LABEL_OPTIONS.find((option) => option.key === draft.exercise_key),
    [draft.exercise_key],
  );
  const visibleOptions = useMemo(() => {
    if (!selectedOption) {
      return filteredOptions;
    }

    const containsSelected = filteredOptions.some((option) => option.key === selectedOption.key);
    if (containsSelected) {
      return filteredOptions;
    }
    return [selectedOption, ...filteredOptions];
  }, [filteredOptions, selectedOption]);

  const viewState = useMemo(
    () =>
      deriveSubmissionFormViewState({
        draft,
        has_selected_file: Boolean(selectedFile),
        is_submitting: isSubmitting,
        upload_progress_percent: uploadProgressPercent,
        duration_warning: durationWarning,
        error: apiError,
        preserve_for_retry: preserveForRetry,
      }),
    [apiError, draft, durationWarning, isSubmitting, preserveForRetry, selectedFile, uploadProgressPercent],
  );

  function ensureRequestId(): string {
    if (!requestIdRef.current) {
      requestIdRef.current = crypto.randomUUID();
    }
    return requestIdRef.current;
  }

  function resetRequestId(): void {
    requestIdRef.current = null;
  }

  function onExerciseChange(value: ExerciseLabelKey | "") {
    setDraft((current) => ({
      ...current,
      exercise_key: value,
      exercise_custom_label: value === "other" ? current.exercise_custom_label : "",
    }));
  }

  function clearAfterSuccess() {
    setDraft(createDefaultDraft());
    setSelectedFile(null);
    setLabelQuery("");
    resetRequestId();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function submitCurrentDraft() {
    if (!selectedFile || !viewState.can_submit) {
      return;
    }

    setApiError(null);
    setSuccessMessage(null);
    setPreserveForRetry(false);
    setDurationWarning(null);
    setIsSubmitting(true);
    setUploadProgressPercent(12);

    const requestId = ensureRequestId();
    const formData = new FormData();
    formData.set("request_id", requestId);
    formData.set("exercise_key", draft.exercise_key);
    if (draft.exercise_key === "other") {
      formData.set("exercise_custom_label", draft.exercise_custom_label.trim());
    }
    if (draft.client_note.trim()) {
      formData.set("client_note", draft.client_note.trim());
    }
    formData.set("file", selectedFile);

    try {
      setUploadProgressPercent(68);
      const response = await fetch("/api/submissions/create", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as unknown;

      if (!response.ok || !isSuccessResponse(body)) {
        throw asApiError(body);
      }

      setUploadProgressPercent(100);
      setDurationWarning(body.duration_warning ?? null);
      setSuccessMessage(getSubmitSuccessMessage(body.action));
      setPreserveForRetry(false);
      onSubmissionCreated?.(body.submission);
      clearAfterSuccess();
    } catch (error) {
      const normalizedError =
        error && typeof error === "object" && "message" in error
          ? {
              code: "UPLOAD_FAILED",
              message: String((error as { message: unknown }).message),
            }
          : {
              code: "UPLOAD_FAILED",
              message: "Upload failed. Please retry.",
            };

      setApiError(normalizedError);
      setPreserveForRetry(true);
      setUploadProgressPercent(null);
      setSuccessMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitCurrentDraft();
  }

  return (
    <section>
      <h2>Submit Training Video</h2>
      <p>Upload one video at a time with exercise metadata so your coach can review quickly.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
        <label htmlFor="submission-label-search">Search exercise label</label>
        <input
          id="submission-label-search"
          type="search"
          value={labelQuery}
          onChange={(event) => setLabelQuery(event.target.value)}
          placeholder="Search labels (e.g. squat, bench)"
        />

        <label htmlFor="submission-exercise-label">Exercise label</label>
        <select
          id="submission-exercise-label"
          value={draft.exercise_key}
          disabled={isSubmitting}
          onChange={(event) => onExerciseChange(event.target.value as ExerciseLabelKey | "")}
          required
        >
          <option value="">Select a label</option>
          {visibleOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>

        {viewState.requires_custom_label ? (
          <>
            <label htmlFor="submission-custom-label">Custom exercise label</label>
            <input
              id="submission-custom-label"
              type="text"
              value={draft.exercise_custom_label}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  exercise_custom_label: event.target.value,
                }))
              }
              disabled={isSubmitting}
              required
            />
          </>
        ) : null}

        <label htmlFor="submission-note">Optional note</label>
        <textarea
          id="submission-note"
          value={draft.client_note}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              client_note: event.target.value,
            }))
          }
          disabled={isSubmitting}
          rows={4}
          maxLength={1000}
          placeholder="Any context for your coach?"
        />

        <label htmlFor="submission-file">Video file (MP4 or MOV)</label>
        <input
          id="submission-file"
          ref={fileInputRef}
          type="file"
          accept=".mp4,.mov,video/mp4,video/quicktime"
          disabled={isSubmitting}
          onChange={(event) => {
            const nextFile = event.currentTarget.files?.[0] ?? null;
            setSelectedFile(nextFile);
            setDraft((current) => ({
              ...current,
              selected_file_name: nextFile?.name ?? "",
            }));
          }}
          required
        />

        {viewState.label_error ? (
          <p role="alert" style={{ color: "#8a3b00", margin: 0 }}>
            {viewState.label_error}
          </p>
        ) : null}

        {viewState.progress_message ? (
          <p role="status" style={{ color: "#1f4db7", margin: 0 }}>
            {viewState.progress_message}
          </p>
        ) : null}

        {viewState.warning_message ? (
          <p role="status" style={{ color: "#755000", margin: 0 }}>
            {viewState.warning_message}
          </p>
        ) : null}

        {viewState.error_message ? (
          <p role="alert" style={{ color: "#9b1c1c", margin: 0 }}>
            {viewState.error_message}
          </p>
        ) : null}

        {viewState.retry_message ? (
          <p role="status" style={{ margin: 0 }}>
            {viewState.retry_message}
          </p>
        ) : null}

        {preserveForRetry && draft.exercise_key ? (
          <p style={{ margin: 0 }}>
            Retry metadata: {viewState.preserved_retry_metadata.exercise_key}
            {viewState.preserved_retry_metadata.client_note
              ? ` • note: ${viewState.preserved_retry_metadata.client_note}`
              : ""}
          </p>
        ) : null}

        {successMessage ? (
          <p role="status" style={{ color: "#126b3a", margin: 0 }}>
            {successMessage}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" disabled={!viewState.can_submit}>
            {isSubmitting ? "Submitting..." : "Submit video"}
          </button>
          {preserveForRetry ? (
            <button type="button" onClick={() => void submitCurrentDraft()} disabled={!viewState.can_submit}>
              Retry upload
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
