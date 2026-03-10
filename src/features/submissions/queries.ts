import type { AppRole } from "../auth/schemas";

import type { SubmissionRecord } from "./service";

export const DEFAULT_HISTORY_LIMIT = 10;
export const MAX_HISTORY_LIMIT = 50;

export type SubmissionHistoryRepository = {
  listByClient(input: {
    clientId: string;
    limit: number;
    cursorSubmittedAt?: Date;
  }): Promise<SubmissionRecord[]>;
};

export type SubmissionHistoryResult = {
  submissions: SubmissionRecord[];
  page: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
};

export type SubmissionQueriesDependencies = {
  repository?: SubmissionHistoryRepository;
};

export type SubmissionQueriesErrorCode = "SERVICE_NOT_CONFIGURED" | "FORBIDDEN_ROLE" | "INVALID_CURSOR";

export class SubmissionQueriesError extends Error {
  constructor(
    readonly code: SubmissionQueriesErrorCode,
    message: string,
    readonly httpStatus = 400,
  ) {
    super(message);
    this.name = "SubmissionQueriesError";
  }
}

function normalizeLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit) || !Number.isFinite(limit)) {
    return DEFAULT_HISTORY_LIMIT;
  }

  const integerLimit = Math.trunc(limit);
  if (integerLimit <= 0) {
    return DEFAULT_HISTORY_LIMIT;
  }

  return Math.min(integerLimit, MAX_HISTORY_LIMIT);
}

function parseCursor(cursor?: string | Date): Date | undefined {
  if (!cursor) {
    return undefined;
  }
  if (cursor instanceof Date) {
    return cursor;
  }

  const parsed = new Date(cursor);
  if (Number.isNaN(parsed.getTime())) {
    throw new SubmissionQueriesError("INVALID_CURSOR", "History cursor must be a valid ISO timestamp.", 400);
  }
  return parsed;
}

export class SubmissionQueries {
  constructor(private readonly deps: SubmissionQueriesDependencies) {}

  async listClientHistory(input: {
    actor_id: string;
    actor_role: AppRole;
    limit?: number;
    cursor?: string | Date;
  }): Promise<SubmissionHistoryResult> {
    if (input.actor_role !== "client") {
      throw new SubmissionQueriesError("FORBIDDEN_ROLE", "Only client accounts can fetch submission history.", 403);
    }

    const repository = this.deps.repository;
    if (!repository?.listByClient) {
      throw new SubmissionQueriesError(
        "SERVICE_NOT_CONFIGURED",
        "Submission history adapter is not configured for this environment.",
        503,
      );
    }

    const normalizedLimit = normalizeLimit(input.limit);
    const cursorSubmittedAt = parseCursor(input.cursor);
    const rows = await repository.listByClient({
      clientId: input.actor_id,
      limit: normalizedLimit + 1,
      cursorSubmittedAt,
    });

    const sortedNewestFirst = [...rows].sort((left, right) => right.submitted_at.getTime() - left.submitted_at.getTime());
    const hasMore = sortedNewestFirst.length > normalizedLimit;
    const pageRows = sortedNewestFirst.slice(0, normalizedLimit);
    const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.submitted_at.toISOString() ?? null : null;

    return {
      submissions: pageRows,
      page: {
        limit: normalizedLimit,
        has_more: hasMore,
        next_cursor: nextCursor,
      },
    };
  }
}

export type SubmissionQueriesFactory = () => SubmissionQueries;

let submissionQueriesFactory: SubmissionQueriesFactory | null = null;

export function registerSubmissionQueriesFactory(factory: SubmissionQueriesFactory): void {
  submissionQueriesFactory = factory;
}

export function getSubmissionQueriesOrThrow(): SubmissionQueries {
  if (!submissionQueriesFactory) {
    throw new SubmissionQueriesError(
      "SERVICE_NOT_CONFIGURED",
      "Submission history query dependencies are not registered for this environment.",
      503,
    );
  }

  return submissionQueriesFactory();
}
