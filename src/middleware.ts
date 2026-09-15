import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { hasSupabaseEnv, publicEnv } from "@/lib/public-env";
import { startTimer, withTiming } from "@/lib/timing";

const protectedPrefixes = ["/account", "/admin", "/content", "/family", "/help", "/leaders", "/resources/custom-pack", "/team"];

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith("sb-"))
    .forEach((cookie) => {
      response.cookies.set(cookie.name, "", {
        expires: new Date(0),
        path: "/"
      });
    });
}

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const timer = startTimer("middleware", request.nextUrl.pathname);

  try {
    if (!hasSupabaseEnv) {
      return NextResponse.next();
    }

    const pathname = request.nextUrl.pathname;
    const isProtected = isProtectedPath(pathname);

    if (!isProtected) {
      return applySecurityHeaders(NextResponse.next());
    }

    const response = NextResponse.next();

    const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options: any }>
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    });

    let user = null;

    try {
      const {
        data: { user: authUser },
        error
      } = await withTiming("middleware.auth", pathname, async () => supabase.auth.getUser());

      if (error) {
        clearSupabaseAuthCookies(request, response);
      } else {
        user = authUser;
      }
    } catch {
      clearSupabaseAuthCookies(request, response);
    }

    if (isProtected && !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    return applySecurityHeaders(response);
  } finally {
    console.timeEnd(timer);
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|favicon-32x32.png|apple-touch-icon.png|icon.png|apple-icon.png|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml|webmanifest)$).*)"
  ]
};
