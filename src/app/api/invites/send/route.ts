import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import { ensureLocalRuntimeRegistered } from "../../../../features/dev/local-runtime";
import {
  getInviteServiceOrThrow,
  InviteServiceError,
  type ProfileRole,
} from "../../../../features/invites/service";
import {
  buildTrainerInviteEmail,
  sendInviteEmail,
} from "../../../../services/email/invite-template";

type AuthenticatedActor = {
  userId: string;
  role: ProfileRole;
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
  return NextResponse.json({ error: { code, message } }, { status });
}

function isFormSubmission(request: NextRequest): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
}

async function getPayload(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const parsed = await request.json();
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  }

  if (isFormSubmission(request)) {
    const formData = await request.formData();
    const payload: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = typeof value === "string" ? value : value.name;
    }
    return payload;
  }

  return {};
}

export async function POST(request: NextRequest) {
  ensureLocalRuntimeRegistered();
  const fromForm = isFormSubmission(request);
  const actor = getAuthenticatedActor(request);
  if (!actor) {
    if (fromForm) {
      return NextResponse.redirect(new URL("/signin?error=auth_required", request.url), { status: 303 });
    }
    return jsonError(401, "AUTH_REQUIRED", "You must be signed in to send invites.");
  }
  if (actor.role !== "trainer") {
    if (fromForm) {
      return NextResponse.redirect(new URL("/trainer?notice=permission", request.url), { status: 303 });
    }
    return jsonError(403, "FORBIDDEN_ROLE", "Only trainers can send invites.");
  }

  try {
    const payload = await getPayload(request);
    const inviteService = getInviteServiceOrThrow();
    const result = await inviteService.issueInvite(actor.userId, payload);

    const inviteUrl = new URL(`/invite/${result.invite.invite_token}`, request.nextUrl.origin).toString();
    const email = buildTrainerInviteEmail({
      trainerDisplayName: "Your trainer",
      clientEmail: result.invite.client_email,
      inviteUrl,
      expiresAt: result.invite.expires_at,
    });

    await sendInviteEmail(email);

    if (fromForm) {
      return NextResponse.redirect(new URL("/trainer?notice=invite_sent", request.url), { status: 303 });
    }

    return NextResponse.json({
      status: "ok",
      action: result.action,
      invite: {
        id: result.invite.id,
        client_email: result.invite.client_email,
        expires_at: result.invite.expires_at.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      if (fromForm) {
        return NextResponse.redirect(new URL("/trainer?notice=invite_error", request.url), { status: 303 });
      }
      return jsonError(400, "INVALID_INPUT", "Invite payload is invalid.");
    }

    if (error instanceof InviteServiceError) {
      if (fromForm) {
        return NextResponse.redirect(new URL("/trainer?notice=invite_error", request.url), { status: 303 });
      }
      return jsonError(error.httpStatus, error.code, error.message);
    }

    if (error instanceof Error && error.message === "INVITE_EMAIL_SENDER_NOT_CONFIGURED") {
      if (fromForm) {
        return NextResponse.redirect(new URL("/trainer?notice=invite_error", request.url), { status: 303 });
      }
      return jsonError(503, "EMAIL_NOT_CONFIGURED", "Invite email sender is not configured.");
    }

    if (fromForm) {
      return NextResponse.redirect(new URL("/trainer?notice=invite_error", request.url), { status: 303 });
    }
    return jsonError(500, "INTERNAL_ERROR", "Unexpected invite send error.");
  }
}
