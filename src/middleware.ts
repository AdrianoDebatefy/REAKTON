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

/** Behind nginx, middleware rewrites must target the local Node port (not the public domain). */
function withInternalOrigin(request: NextRequest): NextRequest {
  const url = request.nextUrl.clone();
  url.protocol = "http:";
  url.hostname = "127.0.0.1";
  url.port = "3010";

  return new NextRequest(url, {
    headers: request.headers,
  });
}

export default function middleware(request: NextRequest) {
  const internalRequest = withInternalOrigin(request);
  const response = intlMiddleware(internalRequest);
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
