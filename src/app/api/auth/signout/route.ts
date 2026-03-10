import { NextResponse, type NextRequest } from "next/server";

import { clearSessionCookies, isFormSubmission, jsonError } from "../_shared";

export async function POST(request: NextRequest) {
  const fromForm = isFormSubmission(request);

  if (fromForm) {
    const redirectResponse = NextResponse.redirect(new URL("/signin?notice=signed_out", request.url), { status: 303 });
    clearSessionCookies(redirectResponse);
    return redirectResponse;
  }

  const response = NextResponse.json({
    status: "ok",
  });
  clearSessionCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  if (isFormSubmission(request)) {
    return jsonError(405, "METHOD_NOT_ALLOWED", "Use POST to sign out.");
  }

  const response = NextResponse.redirect(new URL("/signin?notice=signed_out", request.url), { status: 303 });
  clearSessionCookies(response);
  return response;
}
