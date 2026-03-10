"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { RoleNoticeBanner } from "../../../components/navigation/RoleNoticeBanner";
import { SubmissionForm } from "../../../components/submissions/SubmissionForm";
import { SubmissionHistoryList } from "../../../components/submissions/SubmissionHistoryList";
import {
  mergeSubmissionHistoryEntries,
  type SubmissionApiError,
  type SubmissionHistoryItem,
  type SubmissionHistoryPage,
} from "../../../features/submissions/selectors";

const INITIAL_HISTORY_LIMIT = 10;

type HistorySuccessResponse = {
  status: "ok";
  history: SubmissionHistoryItem[];
  page: SubmissionHistoryPage;
};

type HistoryErrorResponse = {
  status: "error";
  error: {
    code?: string;
    message?: string;
  };
};

function parseApiError(payload: unknown, fallbackMessage: string): SubmissionApiError {
  if (payload && typeof payload === "object" && "status" in payload) {
    const asError = payload as HistoryErrorResponse;
    if (asError.status === "error") {
      return {
        code: asError.error.code ?? "REQUEST_FAILED",
        message: asError.error.message ?? fallbackMessage,
      };
    }
  }

  return {
    code: "REQUEST_FAILED",
    message: fallbackMessage,
  };
}

function isHistorySuccessResponse(payload: unknown): payload is HistorySuccessResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const response = payload as {
    status?: string;
    history?: unknown;
    page?: unknown;
  };
  return response.status === "ok" && Array.isArray(response.history) && Boolean(response.page);
}

export default function ClientSubmissionsPage() {
  const searchParams = useSearchParams();
  const notice = searchParams.get("notice") ?? undefined;

  const [historyEntries, setHistoryEntries] = useState<SubmissionHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState<SubmissionHistoryPage>({
    limit: INITIAL_HISTORY_LIMIT,
    has_more: false,
    next_cursor: null,
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory(cursor?: string) {
    const loadingMore = Boolean(cursor);
    if (loadingMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoadingHistory(true);
      setHistoryError(null);
    }

    try {
      const params = new URLSearchParams({
        limit: String(INITIAL_HISTORY_LIMIT),
      });
      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await fetch(`/api/submissions/history?${params.toString()}`, {
        method: "GET",
      });
      const payload = (await response.json()) as unknown;
      if (!response.ok || !isHistorySuccessResponse(payload)) {
        throw parseApiError(payload, "Unable to load submission history.");
      }

      setAccessError(null);
      setHistoryError(null);
      setHistoryPage(payload.page);
      setHistoryEntries((current) => (cursor ? mergeSubmissionHistoryEntries(current, payload.history) : payload.history));
    } catch (error) {
      const normalized =
        error && typeof error === "object" && "code" in error && "message" in error
          ? (error as SubmissionApiError)
          : {
              code: "REQUEST_FAILED",
              message: "Unable to load submission history.",
            };

      if (normalized.code === "AUTH_REQUIRED") {
        setAccessError("Sign in as a client to view and submit videos.");
      } else if (normalized.code === "FORBIDDEN_ROLE") {
        setAccessError("Only client accounts can access this page.");
      } else {
        setHistoryError(normalized.message);
      }
    } finally {
      setIsLoadingHistory(false);
      setIsLoadingMore(false);
    }
  }

  function handleSubmissionCreated(submission: SubmissionHistoryItem) {
    setHistoryEntries((current) => mergeSubmissionHistoryEntries(current, [submission]));
  }

  function handleLoadMore() {
    if (!historyPage.has_more || !historyPage.next_cursor || isLoadingMore) {
      return;
    }
    void loadHistory(historyPage.next_cursor);
  }

  return (
    <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem", display: "grid", gap: "1.5rem" }}>
      <header>
        <h1>Client Submissions</h1>
        <RoleNoticeBanner notice={notice} />
        <p>Submit one training video at a time and track review status below.</p>
      </header>

      {accessError ? (
        <section>
          <p>{accessError}</p>
          <p>
            <Link href="/signin">Go to sign in</Link>
          </p>
        </section>
      ) : (
        <>
          <SubmissionForm onSubmissionCreated={handleSubmissionCreated} />
          <SubmissionHistoryList
            entries={historyEntries}
            is_loading={isLoadingHistory}
            has_more={historyPage.has_more}
            is_loading_more={isLoadingMore}
            error_message={historyError}
            on_load_more={handleLoadMore}
          />
        </>
      )}

      <form method="post" action="/api/auth/signout">
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
