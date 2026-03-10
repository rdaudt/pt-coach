import { NextResponse, type NextRequest } from "next/server";

import { ensureLocalRuntimeRegistered } from "../../../../features/dev/local-runtime";
import type { AppRole } from "../../../../features/auth/schemas";
import {
  SubmissionQueriesError,
  getSubmissionQueriesOrThrow,
} from "../../../../features/submissions/queries";
import type { SubmissionRecord } from "../../../../features/submissions/service";

type AuthenticatedActor = {
  userId: string;
  role: AppRole;
};

function getAuthenticatedActor(request: NextRequest): AuthenticatedActor | null {
  const userId = request.headers.get("x-pt-user-id") ?? request.cookies.get("pt_user_id")?.value;
  const roleValue = request.headers.get("x-pt-role") ?? request.cookies.get("pt_role")?.value;
  if (!userId || (roleValue !== "trainer" && roleValue !== "client")) {
    return null;
  }
  return {
    userId,
    role: roleValue,
  };
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      status: "error",
      error: { code, message },
    },
    { status },
  );
}

function parseLimit(searchParams: URLSearchParams): number | null | undefined {
  const rawLimit = searchParams.get("limit");
  if (!rawLimit) {
    return undefined;
  }

  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function serializeSubmissionHistoryItem(record: SubmissionRecord) {
  return {
    id: record.id,
    request_id: record.request_id,
    exercise_key: record.exercise_key,
    exercise_label: record.exercise_label,
    client_note: record.client_note,
    file_name: record.file_name,
    mime_type: record.mime_type,
    file_size_bytes: record.file_size_bytes,
    duration_seconds: record.duration_seconds,
    status: record.status,
    submitted_at: record.submitted_at.toISOString(),
    ready_for_review_at: record.ready_for_review_at?.toISOString() ?? null,
  };
}

export async function GET(request: NextRequest) {
  ensureLocalRuntimeRegistered();

  const actor = getAuthenticatedActor(request);
  if (!actor) {
    return jsonError(401, "AUTH_REQUIRED", "You must be signed in to view submission history.");
  }
  if (actor.role !== "client") {
    return jsonError(403, "FORBIDDEN_ROLE", "Only client accounts can access submission history.");
  }

  const parsedLimit = parseLimit(request.nextUrl.searchParams);
  if (parsedLimit === null) {
    return jsonError(400, "INVALID_LIMIT", "History limit must be a positive integer.");
  }

  try {
    const queries = getSubmissionQueriesOrThrow();
    const result = await queries.listClientHistory({
      actor_id: actor.userId,
      actor_role: actor.role,
      limit: parsedLimit,
      cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    });

    return NextResponse.json({
      status: "ok",
      history: result.submissions.map(serializeSubmissionHistoryItem),
      page: result.page,
    });
  } catch (error) {
    if (error instanceof SubmissionQueriesError) {
      return jsonError(error.httpStatus, error.code, error.message);
    }
    return jsonError(500, "INTERNAL_ERROR", "Unexpected submission history error.");
  }
}
