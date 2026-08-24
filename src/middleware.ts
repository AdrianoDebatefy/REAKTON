import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const INTERNAL_ORIGIN = "http://127.0.0.1:3010";

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

function publicHost(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    request.nextUrl.host
  );
}

/** Nginx proxies to localhost — rewrite target must stay internal. */
function toInternalRewriteUrl(rewriteUrl: string): string {
  const url = new URL(rewriteUrl);
  const internal = new URL(INTERNAL_ORIGIN);
  url.protocol = internal.protocol;
  url.hostname = internal.hostname;
  url.port = internal.port;
  return url.toString();
}

/** Locale redirects must keep the public HTTPS URL (not downgrade to http). */
function toPublicRedirectUrl(request: NextRequest, location: string): string {
  const url = new URL(location, request.url);
  url.protocol = requestUsesHttps(request) ? "https:" : "http:";
  url.host = publicHost(request);
  return url.toString();
}

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  const rewrite = response.headers.get("x-middleware-rewrite");
  if (rewrite) {
    response.headers.set("x-middleware-rewrite", toInternalRewriteUrl(rewrite));
  }

  const location = response.headers.get("location");
  if (location) {
    response.headers.set("location", toPublicRedirectUrl(request, location));
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
