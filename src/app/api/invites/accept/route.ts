import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import { ensureLocalRuntimeRegistered } from "../../../../features/dev/local-runtime";
import {
  getInviteServiceOrThrow,
  InviteServiceError,
  type ProfileRole,
} from "../../../../features/invites/service";

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

async function getPayload(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const parsed = await request.json();
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const payload: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = typeof value === "string" ? value : value.name;
    }
    return payload;
  }

  return {};
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function isFormSubmission(request: NextRequest): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
}

export async function POST(request: NextRequest) {
  ensureLocalRuntimeRegistered();
  const fromForm = isFormSubmission(request);
  const actor = getAuthenticatedActor(request);

  try {
    const payload = await getPayload(request);
    const inviteToken = typeof payload.invite_token === "string" ? payload.invite_token : "";
    const encodedToken = encodeURIComponent(inviteToken);

    if (!actor) {
      if (fromForm) {
        return NextResponse.redirect(new URL(`/signin?error=auth_required&invite_token=${encodedToken}`, request.url), {
          status: 303,
        });
      }
      return NextResponse.json(
        {
          error: {
            code: "AUTH_REQUIRED",
            message: "Sign in as a client before accepting this invite.",
          },
          next_steps: {
            signin_url: `/signin?invite_token=${encodedToken}`,
            signup_url: `/client-signup?invite_token=${encodedToken}`,
          },
        },
        { status: 401 },
      );
    }

    if (actor.role !== "client") {
      if (fromForm) {
        return NextResponse.redirect(new URL(`/invite/${encodedToken}?notice=invite_error`, request.url), {
          status: 303,
        });
      }
      return jsonError(403, "FORBIDDEN_ROLE", "Only client accounts can accept trainer invites.");
    }

    const inviteService = getInviteServiceOrThrow();
    const result = await inviteService.acceptInvite(actor.userId, payload);

    if (fromForm) {
      return NextResponse.redirect(new URL("/client?notice=invite_accepted", request.url), { status: 303 });
    }

    return NextResponse.json({
      status: "ok",
      relationship: {
        trainer_id: result.relationship.trainer_id,
        client_id: result.relationship.client_id,
        status: result.relationship.status,
      },
      invite: {
        id: result.invite.id,
        client_email: result.invite.client_email,
      },
      redirect_to: "/client",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      if (fromForm) {
        return NextResponse.redirect(new URL("/client?notice=invite_error", request.url), { status: 303 });
      }
      return jsonError(400, "INVALID_INPUT", "Invite accept payload is invalid.");
    }

    if (error instanceof InviteServiceError) {
      if (fromForm) {
        return NextResponse.redirect(new URL("/client?notice=invite_error", request.url), { status: 303 });
      }
      return jsonError(error.httpStatus, error.code, error.message);
    }

    if (fromForm) {
      return NextResponse.redirect(new URL("/client?notice=invite_error", request.url), { status: 303 });
    }
    return jsonError(500, "INTERNAL_ERROR", "Unexpected invite accept error.");
  }
}
