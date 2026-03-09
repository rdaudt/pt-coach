import { NextResponse, type NextRequest } from "next/server";

type AppRole = "trainer" | "client";

const TRAINER_PREFIX = "/trainer";
const CLIENT_PREFIX = "/client";
const AUTH_PREFIX = "/signin";

function getRoleFromCookie(request: NextRequest): AppRole | null {
  const roleValue = request.cookies.get("pt_role")?.value;
  if (roleValue === "trainer" || roleValue === "client") {
    return roleValue;
  }
  return null;
}

function appendNotice(url: URL, notice: "permission" | "auth_required") {
  url.searchParams.set("notice", notice);
  return url;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = getRoleFromCookie(request);

  if (!role && (pathname.startsWith(TRAINER_PREFIX) || pathname.startsWith(CLIENT_PREFIX))) {
    return NextResponse.redirect(appendNotice(new URL(AUTH_PREFIX, request.url), "auth_required"));
  }

  if (role === "trainer" && pathname.startsWith(CLIENT_PREFIX)) {
    return NextResponse.redirect(appendNotice(new URL(TRAINER_PREFIX, request.url), "permission"));
  }

  if (role === "client" && pathname.startsWith(TRAINER_PREFIX)) {
    return NextResponse.redirect(appendNotice(new URL(CLIENT_PREFIX, request.url), "permission"));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/trainer/:path*", "/client/:path*"],
};
