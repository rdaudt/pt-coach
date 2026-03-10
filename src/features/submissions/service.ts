import type { AppRole } from "../auth/schemas";
import {
  createSubmissionSchema,
  getDurationWarningMetadata,
  resolveExerciseDisplayLabel,
  type CreateSubmissionInput,
  type SubmissionDurationWarning,
  type SubmissionStatus,
} from "./schemas";

export type SubmissionRecord = {
  id: string;
  request_id: string;
  client_id: string;
  trainer_id: string;
  exercise_key: CreateSubmissionInput["exercise"]["key"];
  exercise_label: string;
  client_note: string | null;
  file_name: string;
  mime_type: CreateSubmissionInput["file"]["mime_type"];
  file_size_bytes: number;
  duration_seconds: number | null;
  status: SubmissionStatus;
  uploaded_at: Date;
  submitted_at: Date;
  ready_for_review_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type CreateSubmissionPersistenceInput = {
  request_id: string;
  client_id: string;
  trainer_id: string;
  exercise_key: CreateSubmissionInput["exercise"]["key"];
  exercise_label: string;
  client_note: string | null;
  file_name: string;
  mime_type: CreateSubmissionInput["file"]["mime_type"];
  file_size_bytes: number;
  duration_seconds: number | null;
  status: "uploaded";
  uploaded_at: Date;
  submitted_at: Date;
};

export type SubmissionRepository = {
  findByClientAndRequestId(clientId: string, requestId: string): Promise<SubmissionRecord | null>;
  findActiveTrainerIdForClient(clientId: string): Promise<string | null>;
  create(input: CreateSubmissionPersistenceInput): Promise<SubmissionRecord>;
  updateStatus(input: {
    submissionId: string;
    status: "ready_for_review";
    transitionedAt: Date;
  }): Promise<SubmissionRecord>;
  listByClient?(input: {
    clientId: string;
    limit: number;
    cursorSubmittedAt?: Date;
  }): Promise<SubmissionRecord[]>;
};

export type SubmissionServiceDependencies = {
  repository: SubmissionRepository;
  now?: () => Date;
};

export type SubmissionCreateResult = {
  action: "created" | "deduplicated";
  submission: SubmissionRecord;
  duration_warning: SubmissionDurationWarning | null;
};

export type SubmissionServiceErrorCode =
  | "SERVICE_NOT_CONFIGURED"
  | "FORBIDDEN_ROLE"
  | "TRAINER_LINK_NOT_FOUND"
  | "SUBMISSION_NOT_FOUND";

export class SubmissionServiceError extends Error {
  constructor(
    readonly code: SubmissionServiceErrorCode,
    message: string,
    readonly httpStatus = 400,
  ) {
    super(message);
    this.name = "SubmissionServiceError";
  }
}

export class SubmissionRepositoryConflictError extends Error {
  constructor(
    readonly code: "DUPLICATE_REQUEST",
    message: string,
  ) {
    super(message);
    this.name = "SubmissionRepositoryConflictError";
  }
}

function isDuplicateRequestError(error: unknown): error is SubmissionRepositoryConflictError {
  return error instanceof SubmissionRepositoryConflictError && error.code === "DUPLICATE_REQUEST";
}

export class SubmissionService {
  private readonly now: () => Date;

  constructor(private readonly deps: SubmissionServiceDependencies) {
    this.now = deps.now ?? (() => new Date());
  }

  async createSubmission(input: {
    actor_id: string;
    actor_role: AppRole;
    payload: unknown;
  }): Promise<SubmissionCreateResult> {
    if (input.actor_role !== "client") {
      throw new SubmissionServiceError("FORBIDDEN_ROLE", "Only client accounts can create submissions.", 403);
    }

    const parsed = createSubmissionSchema.parse(input.payload);
    const existing = await this.deps.repository.findByClientAndRequestId(input.actor_id, parsed.request_id);
    if (existing) {
      return {
        action: "deduplicated",
        submission: existing,
        duration_warning: getDurationWarningMetadata(existing.duration_seconds ?? undefined),
      };
    }

    const trainerId = await this.deps.repository.findActiveTrainerIdForClient(input.actor_id);
    if (!trainerId) {
      throw new SubmissionServiceError(
        "TRAINER_LINK_NOT_FOUND",
        "Client must be linked to an active trainer before submitting video.",
        409,
      );
    }

    const now = this.now();
    let created: SubmissionRecord;
    try {
      created = await this.deps.repository.create({
        request_id: parsed.request_id,
        client_id: input.actor_id,
        trainer_id: trainerId,
        exercise_key: parsed.exercise.key,
        exercise_label: resolveExerciseDisplayLabel(parsed.exercise),
        client_note: parsed.client_note ?? null,
        file_name: parsed.file.file_name,
        mime_type: parsed.file.mime_type,
        file_size_bytes: parsed.file.size_bytes,
        duration_seconds: parsed.file.duration_seconds ?? null,
        status: "uploaded",
        uploaded_at: now,
        submitted_at: now,
      });
    } catch (error) {
      if (isDuplicateRequestError(error)) {
        const conflicted = await this.deps.repository.findByClientAndRequestId(input.actor_id, parsed.request_id);
        if (!conflicted) {
          throw error;
        }
        return {
          action: "deduplicated",
          submission: conflicted,
          duration_warning: getDurationWarningMetadata(conflicted.duration_seconds ?? undefined),
        };
      }
      throw error;
    }

    const transitioned = await this.deps.repository.updateStatus({
      submissionId: created.id,
      status: "ready_for_review",
      transitionedAt: now,
    });

    return {
      action: "created",
      submission: transitioned,
      duration_warning: getDurationWarningMetadata(parsed.file.duration_seconds),
    };
  }

  async listClientSubmissions(input: {
    actor_id: string;
    actor_role: AppRole;
    limit?: number;
    cursorSubmittedAt?: Date;
  }): Promise<SubmissionRecord[]> {
    if (input.actor_role !== "client") {
      throw new SubmissionServiceError("FORBIDDEN_ROLE", "Only client accounts can list their submissions.", 403);
    }
    if (!this.deps.repository.listByClient) {
      throw new SubmissionServiceError(
        "SERVICE_NOT_CONFIGURED",
        "Submission list adapter is not configured for this environment.",
        503,
      );
    }

    return this.deps.repository.listByClient({
      clientId: input.actor_id,
      limit: input.limit ?? 20,
      cursorSubmittedAt: input.cursorSubmittedAt,
    });
  }
}

export type SubmissionServiceFactory = () => SubmissionService;

let submissionServiceFactory: SubmissionServiceFactory | null = null;

export function registerSubmissionServiceFactory(factory: SubmissionServiceFactory): void {
  submissionServiceFactory = factory;
}

export function getSubmissionServiceOrThrow(): SubmissionService {
  if (!submissionServiceFactory) {
    throw new SubmissionServiceError(
      "SERVICE_NOT_CONFIGURED",
      "Submission service dependencies are not registered for this environment.",
      503,
    );
  }

  return submissionServiceFactory();
}

