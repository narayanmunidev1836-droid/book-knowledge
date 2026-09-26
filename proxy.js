import { NextResponse } from "next/server";

const protectedPaths = ["/sant", "/admin"];

function hasSession(req) {
  return Boolean(
    req.cookies.get("authjs.session-token") ||
      req.cookies.get("__Secure-authjs.session-token")
  );
}

export function proxy(req) {
  const { pathname } = req.nextUrl;
  const session = hasSession(req);
  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname === "/" && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
