import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

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

export async function POST(request: NextRequest) {
  const actor = getAuthenticatedActor(request);
  if (!actor) {
    return jsonError(401, "AUTH_REQUIRED", "You must be signed in to send invites.");
  }
  if (actor.role !== "trainer") {
    return jsonError(403, "FORBIDDEN_ROLE", "Only trainers can send invites.");
  }

  try {
    const payload = await request.json();
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
      return jsonError(400, "INVALID_INPUT", "Invite payload is invalid.");
    }

    if (error instanceof InviteServiceError) {
      return jsonError(error.httpStatus, error.code, error.message);
    }

    if (error instanceof Error && error.message === "INVITE_EMAIL_SENDER_NOT_CONFIGURED") {
      return jsonError(503, "EMAIL_NOT_CONFIGURED", "Invite email sender is not configured.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unexpected invite send error.");
  }
}
