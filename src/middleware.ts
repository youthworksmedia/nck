import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { hasSupabaseEnv, publicEnv } from "@/lib/public-env";

const protectedPrefixes = ["/account", "/content", "/resources", "/team", "/lesson-builder"];

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

export async function middleware(request: NextRequest) {
  if (!hasSupabaseEnv) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

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

  const isProtected = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  let user = null;

  try {
    const {
      data: { user: authUser },
      error
    } = await supabase.auth.getUser();

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
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/account/:path*", "/content/:path*", "/resources/:path*", "/team/:path*", "/lesson-builder/:path*"]
};
