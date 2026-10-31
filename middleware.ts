import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = req.nextUrl.pathname === "/admin/login";
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  if (isAdminRoute && !isLoginPage) {
    if (!req.auth) {
      const loginUrl = new URL("/admin/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isLoginPage && req.auth) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/auth/:path*"],
};