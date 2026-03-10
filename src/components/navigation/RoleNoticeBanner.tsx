"use client";

import { useMemo, useState } from "react";

type RoleNoticeToken = "permission" | "auth_required";

type RoleNoticeBannerProps = {
  notice?: string;
};

const NOTICE_COPY: Record<RoleNoticeToken, { title: string; detail: string }> = {
  permission: {
    title: "Redirected to your allowed area",
    detail: "You attempted to open a page reserved for the other role, so we redirected you here.",
  },
  auth_required: {
    title: "Sign in required",
    detail: "You need to sign in before opening trainer or client pages.",
  },
};

function normalizeNotice(notice?: string): RoleNoticeToken | null {
  if (notice === "permission" || notice === "auth_required") {
    return notice;
  }
  return null;
}

export function RoleNoticeBanner({ notice }: RoleNoticeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const normalizedNotice = useMemo(() => normalizeNotice(notice), [notice]);
  if (!normalizedNotice || dismissed) {
    return null;
  }

  const content = NOTICE_COPY[normalizedNotice];

  function dismissNotice() {
    setDismissed(true);

    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <section
      role="status"
      style={{
        border: "1px solid #d8c57a",
        backgroundColor: "#fff9e6",
        padding: "0.75rem",
        marginBottom: "1rem",
      }}
    >
      <strong>{content.title}</strong>
      <p style={{ margin: "0.5rem 0" }}>{content.detail}</p>
      <button type="button" onClick={dismissNotice}>
        Dismiss
      </button>
    </section>
  );
}