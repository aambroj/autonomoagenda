import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase() ?? "";

function isProtectedRoute(pathname: string) {
  return pathname === "/agenda" || pathname.startsWith("/agenda/");
}

function isAuthRoute(pathname: string) {
  return pathname === "/login" || pathname === "/registro";
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }

  return to;
}

function buildRedirectResponse(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  searchParams?: Record<string, string>,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  return copyCookies(response, NextResponse.redirect(url));
}

export async function proxy(request: NextRequest) {
  if (!supabaseUrl) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabasePublishableKey) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && isProtectedRoute(pathname)) {
    return buildRedirectResponse(request, response, "/login", {
      redirectTo: `${pathname}${search}`,
    });
  }

  if (user && isAuthRoute(pathname)) {
    const currentUserEmail = user.email?.trim().toLowerCase() ?? "";

    if (currentUserEmail === ownerEmail) {
      return buildRedirectResponse(request, response, "/agenda");
    }

    return buildRedirectResponse(request, response, "/cuenta", {
      forced: "1",
    });
  }

  if (user && isProtectedRoute(pathname)) {
    const currentUserEmail = user.email?.trim().toLowerCase() ?? "";

    if (currentUserEmail !== ownerEmail) {
      return buildRedirectResponse(request, response, "/cuenta", {
        forced: "1",
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/agenda/:path*", "/login", "/registro"],
};
