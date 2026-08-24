import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const INTERNAL_PORTS = new Set(["3000", "3001", "3010", "8080"]);

function firstHeaderValue(value: string | null): string | undefined {
  return value?.split(",")[0]?.trim() || undefined;
}

/** nginx may forward the Node port (3010) — next-intl then leaks it into redirect URLs. */
function sanitizeProxyHeaders(request: NextRequest): NextRequest {
  const headers = new Headers(request.headers);
  const proto = firstHeaderValue(headers.get("x-forwarded-proto"))?.toLowerCase();
  const host = firstHeaderValue(headers.get("x-forwarded-host") ?? headers.get("host"));
  const port = firstHeaderValue(headers.get("x-forwarded-port"));

  if (host && !host.includes(":")) {
    if (port && INTERNAL_PORTS.has(port)) {
      headers.delete("x-forwarded-port");
    }
    if (proto === "https") {
      headers.set("x-forwarded-port", "443");
    } else if (proto === "http" && !headers.get("x-forwarded-port")) {
      headers.set("x-forwarded-port", "80");
    }
  }

  return new NextRequest(request.nextUrl, { headers });
}

function detectLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return routing.defaultLocale;
}

function requestUsesHttps(request: NextRequest): boolean {
  const forwarded = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  if (forwarded) {
    return forwarded === "https";
  }
  return request.nextUrl.protocol === "https:";
}

function publicHostname(request: NextRequest): string {
  const raw =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ||
    firstHeaderValue(request.headers.get("host")) ||
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
  const { pathname } = request.nextUrl;

  if (pathname === "/dev" || pathname.startsWith("/dev/")) {
    const response = NextResponse.next();
    response.headers.set("x-reakton-locale", routing.defaultLocale);
    return response;
  }

  const proxyRequest = sanitizeProxyHeaders(request);
  const response = intlMiddleware(proxyRequest);
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
    redirected.headers.set("x-reakton-locale", detectLocale(pathname));
    return redirected;
  }

  response.headers.set("x-reakton-locale", detectLocale(pathname));
  return response;
}

export const config = {
  matcher: [
    "/",
    "/(de|en|ja)/:path*",
    "/((?!api|admin|dev|_next|_vercel|.*\\..*).*)",
  ],
};
