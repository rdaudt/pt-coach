import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import { getLocalAuthService } from "../../../../features/dev/local-runtime";
import { jsonError, isFormSubmission, parseRequestPayload, setSessionCookies } from "../_shared";

function redirectToSignup(request: NextRequest, errorCode: string): NextResponse {
  const target = new URL("/trainer-signup", request.url);
  target.searchParams.set("error", errorCode);
  return NextResponse.redirect(target, { status: 303 });
}

export async function POST(request: NextRequest) {
  const fromForm = isFormSubmission(request);
  const authService = getLocalAuthService();

  try {
    const payload = await parseRequestPayload(request);
    const user = await authService.signUpTrainer({
      role: "trainer",
      email: String(payload.email ?? ""),
      password: String(payload.password ?? ""),
      full_name: String(payload.full_name ?? ""),
    });

    if (fromForm) {
      const redirectResponse = NextResponse.redirect(new URL("/trainer", request.url), { status: 303 });
      setSessionCookies(redirectResponse, { userId: user.id, role: "trainer" });
      return redirectResponse;
    }

    const response = NextResponse.json({
      status: "ok",
      user: {
        id: user.id,
        email: user.email,
        role: "trainer",
      },
    });
    setSessionCookies(response, { userId: user.id, role: "trainer" });
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return fromForm
        ? redirectToSignup(request, "invalid_input")
        : jsonError(400, "INVALID_INPUT", "Trainer signup payload is invalid.");
    }

    if (error instanceof Error && error.message === "AUTH_EMAIL_ALREADY_REGISTERED") {
      return fromForm
        ? redirectToSignup(request, "email_taken")
        : jsonError(409, "AUTH_EMAIL_ALREADY_REGISTERED", "Email is already registered.");
    }

    if (error instanceof Error && error.message === "ROLE_MISMATCH_SUPPORT_REQUIRED") {
      return fromForm
        ? redirectToSignup(request, "role_mismatch")
        : jsonError(409, "ROLE_MISMATCH_SUPPORT_REQUIRED", "Existing account role does not match trainer signup.");
    }

    return fromForm
      ? redirectToSignup(request, "unexpected_error")
      : jsonError(500, "INTERNAL_ERROR", "Unexpected trainer signup error.");
  }
}
