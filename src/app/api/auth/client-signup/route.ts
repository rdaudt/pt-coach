import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import { InviteServiceError } from "../../../../features/invites/service";
import { getLocalAuthService } from "../../../../features/dev/local-runtime";
import { jsonError, isFormSubmission, parseRequestPayload, setSessionCookies } from "../_shared";

function redirectToSignup(request: NextRequest, errorCode: string, inviteToken?: string): NextResponse {
  const target = new URL("/client-signup", request.url);
  target.searchParams.set("error", errorCode);
  if (inviteToken) {
    target.searchParams.set("invite_token", inviteToken);
  }
  return NextResponse.redirect(target, { status: 303 });
}

export async function POST(request: NextRequest) {
  const fromForm = isFormSubmission(request);
  const payload = await parseRequestPayload(request);
  const inviteToken = String(payload.invite_token ?? "");
  const authService = getLocalAuthService();

  try {
    const user = await authService.signUpClient({
      role: "client",
      email: String(payload.email ?? ""),
      password: String(payload.password ?? ""),
      full_name: String(payload.full_name ?? ""),
      invite_token: inviteToken,
    });

    if (fromForm) {
      const redirectResponse = NextResponse.redirect(new URL(`/invite/${encodeURIComponent(inviteToken)}`, request.url), {
        status: 303,
      });
      setSessionCookies(redirectResponse, { userId: user.id, role: "client" });
      return redirectResponse;
    }

    const response = NextResponse.json({
      status: "ok",
      user: {
        id: user.id,
        email: user.email,
        role: "client",
      },
      next_steps: {
        accept_invite_url: `/invite/${encodeURIComponent(inviteToken)}`,
      },
    });
    setSessionCookies(response, { userId: user.id, role: "client" });
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return fromForm
        ? redirectToSignup(request, "invalid_input", inviteToken)
        : jsonError(400, "INVALID_INPUT", "Client signup payload is invalid.");
    }

    if (error instanceof InviteServiceError) {
      return fromForm
        ? redirectToSignup(request, error.code.toLowerCase(), inviteToken)
        : jsonError(error.httpStatus, error.code, error.message);
    }

    if (error instanceof Error && error.message === "AUTH_EMAIL_ALREADY_REGISTERED") {
      return fromForm
        ? redirectToSignup(request, "email_taken", inviteToken)
        : jsonError(409, "AUTH_EMAIL_ALREADY_REGISTERED", "Email is already registered.");
    }

    if (error instanceof Error && error.message === "ROLE_MISMATCH_SUPPORT_REQUIRED") {
      return fromForm
        ? redirectToSignup(request, "role_mismatch", inviteToken)
        : jsonError(409, "ROLE_MISMATCH_SUPPORT_REQUIRED", "Existing account role does not match client signup.");
    }

    return fromForm
      ? redirectToSignup(request, "unexpected_error", inviteToken)
      : jsonError(500, "INTERNAL_ERROR", "Unexpected client signup error.");
  }
}
