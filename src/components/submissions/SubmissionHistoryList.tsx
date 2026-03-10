"use client";

import React from "react";

import {
  deriveSubmissionHistoryRows,
  type SubmissionHistoryItem,
} from "../../features/submissions/selectors";
import { SubmissionStatusBadge } from "./SubmissionStatusBadge";

type SubmissionHistoryListProps = {
  entries: SubmissionHistoryItem[];
  is_loading: boolean;
  has_more: boolean;
  is_loading_more: boolean;
  error_message: string | null;
  on_load_more?: () => void;
};

export function SubmissionHistoryList({
  entries,
  is_loading,
  has_more,
  is_loading_more,
  error_message,
  on_load_more,
}: SubmissionHistoryListProps) {
  const rows = deriveSubmissionHistoryRows(entries);

  return (
    <section>
      <h2>Submission History</h2>
      {is_loading && rows.length === 0 ? <p>Loading submission history...</p> : null}
      {!is_loading && rows.length === 0 ? <p>No submissions yet. Your uploads will appear here.</p> : null}
      {error_message ? (
        <p role="alert" style={{ color: "#9b1c1c" }}>
          {error_message}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0", display: "grid", gap: "0.75rem" }}>
          {rows.map((row) => (
            <li
              key={row.id}
              style={{
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                display: "grid",
                gap: "0.4rem",
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>{row.exercise_label}</p>
              <p style={{ margin: 0 }}>
                <SubmissionStatusBadge status={row.status} />
              </p>
              <p style={{ margin: 0, color: "#1f2937" }}>
                Submitted <time dateTime={row.submitted_at_iso}>{row.submitted_at_display}</time>
              </p>
              <p style={{ margin: 0, color: "#1f2937" }}>File: {row.file_name}</p>
              {row.note_preview ? (
                <p style={{ margin: 0, color: "#374151" }}>Note: {row.note_preview}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {has_more ? (
        <button type="button" onClick={on_load_more} disabled={is_loading_more || !on_load_more}>
          {is_loading_more ? "Loading more..." : "Load more"}
        </button>
      ) : null}
    </section>
  );
}
