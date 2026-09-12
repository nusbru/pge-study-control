import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Resolve the backend at request time so one Docker image works across environments.
  const destination = new URL(process.env.API_INTERNAL_URL ?? "http://127.0.0.1:5080");
  destination.pathname = `${destination.pathname.replace(/\/$/, "")}${request.nextUrl.pathname}`;
  destination.search = request.nextUrl.search;
  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: "/api/:path*",
};
