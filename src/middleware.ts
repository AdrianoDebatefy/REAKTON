import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

function detectLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return routing.defaultLocale;
}

function requestUsesHttps(request: NextRequest): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() === "https";
  }
  return request.nextUrl.protocol === "https:";
}

function publicHostname(request: NextRequest): string {
  const raw =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    request.nextUrl.hostname;
  return raw.split(":")[0];
}

function toPublicRedirectUrl(request: NextRequest, location: string): string {
  const url = new URL(location, request.url);
  url.protocol = requestUsesHttps(request) ? "https:" : "http:";
  url.hostname = publicHostname(request);
  url.port = "";
  return url.toString();
}

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const location = response.headers.get("location");

  if (location) {
    const redirected = NextResponse.redirect(
      toPublicRedirectUrl(request, location),
      response.status,
    );
    const cookie = response.headers.get("set-cookie");
    if (cookie) {
      redirected.headers.set("set-cookie", cookie);
    }
    redirected.headers.set("x-reakton-locale", detectLocale(request.nextUrl.pathname));
    return redirected;
  }

  response.headers.set("x-reakton-locale", detectLocale(request.nextUrl.pathname));
  return response;
}

export const config = {
  matcher: [
    "/",
    "/(de|en|ja)/:path*",
    "/((?!api|admin|_next|_vercel|.*\\..*).*)",
  ],
};
