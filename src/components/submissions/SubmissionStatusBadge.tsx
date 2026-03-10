import React from "react";

import type { SubmissionStatus } from "../../features/submissions/schemas";

type SubmissionStatusBadgeProps = {
  status: SubmissionStatus;
};

const STATUS_META: Record<
  SubmissionStatus,
  {
    label: string;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
  }
> = {
  uploaded: {
    label: "Uploaded",
    backgroundColor: "#edf3ff",
    borderColor: "#98b4e6",
    textColor: "#1c3d78",
  },
  ready_for_review: {
    label: "Ready for Review",
    backgroundColor: "#e9f7ef",
    borderColor: "#8cc8a4",
    textColor: "#165c34",
  },
  feedback_sent: {
    label: "Feedback Sent",
    backgroundColor: "#f2edff",
    borderColor: "#b7a4e2",
    textColor: "#4c2f8c",
  },
};

export function SubmissionStatusBadge({ status }: SubmissionStatusBadgeProps) {
  const meta = STATUS_META[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        border: `1px solid ${meta.borderColor}`,
        backgroundColor: meta.backgroundColor,
        color: meta.textColor,
        fontSize: "0.8rem",
        fontWeight: 600,
        lineHeight: 1,
        padding: "0.3rem 0.6rem",
      }}
    >
      {meta.label}
    </span>
  );
}
