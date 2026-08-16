import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
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

/** Behind TLS-terminating nginx, rewrite requests to the public origin (not localhost:3010). */
function withPublicOrigin(request: NextRequest): NextRequest {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";

  if (!host) return request;

  const url = request.nextUrl.clone();
  url.protocol = `${proto}:`;
  url.host = host.split(",")[0]!.trim();

  return new NextRequest(url, {
    headers: request.headers,
  });
}

export default function middleware(request: NextRequest) {
  const publicRequest = withPublicOrigin(request);
  const response = intlMiddleware(publicRequest);
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
