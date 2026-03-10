import { NextResponse, type NextRequest } from "next/server";
import type { AppRole } from "../../../features/auth/schemas";

type Payload = Record<string, unknown>;

export function isFormSubmission(request: NextRequest): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
}

export async function parseRequestPayload(request: NextRequest): Promise<Payload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const parsed = await request.json();
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Payload;
    }
    return {};
  }

  if (isFormSubmission(request)) {
    const formData = await request.formData();
    const payload: Payload = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = typeof value === "string" ? value : value.name;
    }
    return payload;
  }

  return {};
}

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function setSessionCookies(response: NextResponse, input: { userId: string; role: AppRole }) {
  response.cookies.set("pt_user_id", input.userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  response.cookies.set("pt_role", input.role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set("pt_user_id", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("pt_role", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
