import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import { ensureLocalRuntimeRegistered } from "../../../../features/dev/local-runtime";
import type { AppRole } from "../../../../features/auth/schemas";
import {
  SubmissionServiceError,
  getSubmissionServiceOrThrow,
  type SubmissionRecord,
} from "../../../../features/submissions/service";

type AuthenticatedActor = {
  userId: string;
  role: AppRole;
};

type FilePayload = {
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  duration_seconds?: number;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toOptionalString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function toOptionalPositiveInt(value: FormDataEntryValue | null): number | undefined {
  const parsed = Number.parseInt(toOptionalString(value) ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function isFormSubmission(request: NextRequest): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
}

function getFilePayload(formData: FormData): FilePayload {
  const fileField = formData.get("file");
  if (fileField && typeof fileField !== "string") {
    return {
      file_name: fileField.name,
      mime_type: fileField.type || undefined,
      size_bytes: fileField.size,
      duration_seconds:
        toOptionalPositiveInt(formData.get("duration_seconds")) ??
        toOptionalPositiveInt(formData.get("file_duration_seconds")) ??
        toOptionalPositiveInt(formData.get("file.duration_seconds")),
    };
  }

  return {
    file_name: toOptionalString(formData.get("file_name")) ?? toOptionalString(formData.get("file.file_name")),
    mime_type: toOptionalString(formData.get("mime_type")) ?? toOptionalString(formData.get("file.mime_type")),
    size_bytes: toOptionalPositiveInt(formData.get("size_bytes")) ?? toOptionalPositiveInt(formData.get("file.size_bytes")),
    duration_seconds:
      toOptionalPositiveInt(formData.get("duration_seconds")) ??
      toOptionalPositiveInt(formData.get("file_duration_seconds")) ??
      toOptionalPositiveInt(formData.get("file.duration_seconds")),
  };
}

async function getPayload(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const parsed = await request.json();
    return isRecord(parsed) ? parsed : {};
  }

  if (!isFormSubmission(request)) {
    return {};
  }

  const formData = await request.formData();
  const requestId = toOptionalString(formData.get("request_id"));
  const exerciseKey = toOptionalString(formData.get("exercise_key")) ?? toOptionalString(formData.get("exercise.key"));
  const customLabel =
    toOptionalString(formData.get("exercise_custom_label")) ?? toOptionalString(formData.get("exercise.custom_label"));
  const filePayload = getFilePayload(formData);

  const payload: Record<string, unknown> = {
    request_id: requestId,
    exercise: {
      key: exerciseKey,
      ...(customLabel ? { custom_label: customLabel } : {}),
    },
    file: {
      file_name: filePayload.file_name,
      mime_type: filePayload.mime_type,
      size_bytes: filePayload.size_bytes,
      ...(filePayload.duration_seconds ? { duration_seconds: filePayload.duration_seconds } : {}),
    },
  };

  const clientNote = toOptionalString(formData.get("client_note"));
  if (clientNote !== undefined) {
    payload.client_note = clientNote;
  }

  return payload;
}

function serializeSubmission(submission: SubmissionRecord) {
  return {
    id: submission.id,
    request_id: submission.request_id,
    client_id: submission.client_id,
    trainer_id: submission.trainer_id,
    exercise_key: submission.exercise_key,
    exercise_label: submission.exercise_label,
    client_note: submission.client_note,
    file_name: submission.file_name,
    mime_type: submission.mime_type,
    file_size_bytes: submission.file_size_bytes,
    duration_seconds: submission.duration_seconds,
    status: submission.status,
    uploaded_at: submission.uploaded_at.toISOString(),
    submitted_at: submission.submitted_at.toISOString(),
    ready_for_review_at: submission.ready_for_review_at?.toISOString() ?? null,
    created_at: submission.created_at.toISOString(),
    updated_at: submission.updated_at.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  ensureLocalRuntimeRegistered();

  const actor = getAuthenticatedActor(request);
  if (!actor) {
    return jsonError(401, "AUTH_REQUIRED", "You must be signed in to submit training videos.");
  }
  if (actor.role !== "client") {
    return jsonError(403, "FORBIDDEN_ROLE", "Only client accounts can submit training videos.");
  }

  try {
    const payload = await getPayload(request);
    const service = getSubmissionServiceOrThrow();
    const result = await service.createSubmission({
      actor_id: actor.userId,
      actor_role: actor.role,
      payload,
    });

    return NextResponse.json({
      status: "ok",
      action: result.action,
      submission: serializeSubmission(result.submission),
      duration_warning: result.duration_warning,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          status: "error",
          error: {
            code: "INVALID_INPUT",
            message: "Submission payload is invalid.",
            details: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
        },
        { status: 400 },
      );
    }

    if (error instanceof SubmissionServiceError) {
      return jsonError(error.httpStatus, error.code, error.message);
    }

    return jsonError(500, "INTERNAL_ERROR", "Unexpected submission create error.");
  }
}
