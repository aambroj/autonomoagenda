import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase() ?? "";

function isProtectedRoute(pathname: string) {
  return (
    pathname === "/agenda" ||
    pathname.startsWith("/agenda/") ||
    pathname === "/compartir" ||
    pathname.startsWith("/compartir/")
  );
}

function isAuthRoute(pathname: string) {
  return pathname === "/login" || pathname === "/registro";
}

function hasSubscriptionAccess(status: unknown) {
  if (typeof status !== "string") return false;

  const normalized = status.trim().toLowerCase();
  return normalized === "active" || normalized === "trialing";
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

  if (!user) {
    return response;
  }

  const currentUserEmail = user.email?.trim().toLowerCase() ?? "";
  const isOwner = ownerEmail !== "" && currentUserEmail === ownerEmail;

  let canAccessPaidArea = isOwner;

  if (!canAccessPaidArea) {
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) {
      if (isProtectedRoute(pathname) || isAuthRoute(pathname)) {
        return buildRedirectResponse(request, response, "/cuenta", {
          required: "1",
          reason: "subscription_error",
        });
      }

      return response;
    }

    canAccessPaidArea = hasSubscriptionAccess(subscription?.status);
  }

  if (isProtectedRoute(pathname) && !canAccessPaidArea) {
    return buildRedirectResponse(request, response, "/cuenta", {
      required: "1",
      reason: "subscription_required",
    });
  }

  if (isAuthRoute(pathname)) {
    if (canAccessPaidArea) {
      return buildRedirectResponse(request, response, "/agenda");
    }

    return buildRedirectResponse(request, response, "/cuenta", {
      required: "1",
      reason: "subscription_required",
    });
  }

  return response;
}

export const config = {
  matcher: ["/agenda/:path*", "/compartir/:path*", "/login", "/registro"],
};
