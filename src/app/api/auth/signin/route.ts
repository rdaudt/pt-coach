import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import { getLocalAuthService } from "../../../../features/dev/local-runtime";
import { jsonError, isFormSubmission, parseRequestPayload, setSessionCookies } from "../_shared";

function redirectToSignIn(request: NextRequest, errorCode: string, inviteToken?: string): NextResponse {
  const target = new URL("/signin", request.url);
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
    const session = await authService.signIn({
      email: String(payload.email ?? ""),
      password: String(payload.password ?? ""),
    });

    const redirectPath =
      session.role === "client" && inviteToken ? `/invite/${encodeURIComponent(inviteToken)}` : `/${session.role}`;

    if (fromForm) {
      const redirectResponse = NextResponse.redirect(new URL(redirectPath, request.url), { status: 303 });
      setSessionCookies(redirectResponse, { userId: session.user.id, role: session.role });
      return redirectResponse;
    }

    const response = NextResponse.json({
      status: "ok",
      session: {
        user: session.user,
        role: session.role,
      },
      redirect_to: redirectPath,
    });
    setSessionCookies(response, { userId: session.user.id, role: session.role });
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return fromForm
        ? redirectToSignIn(request, "invalid_input", inviteToken)
        : jsonError(400, "INVALID_INPUT", "Sign-in payload is invalid.");
    }

    if (error instanceof Error && error.message === "AUTH_INVALID_CREDENTIALS") {
      return fromForm
        ? redirectToSignIn(request, "invalid_credentials", inviteToken)
        : jsonError(401, "AUTH_INVALID_CREDENTIALS", "Invalid email or password.");
    }

    if (error instanceof Error && error.message === "PROFILE_NOT_FOUND") {
      return fromForm
        ? redirectToSignIn(request, "profile_missing", inviteToken)
        : jsonError(404, "PROFILE_NOT_FOUND", "User profile is missing for this account.");
    }

    return fromForm
      ? redirectToSignIn(request, "unexpected_error", inviteToken)
      : jsonError(500, "INTERNAL_ERROR", "Unexpected sign-in error.");
  }
}
