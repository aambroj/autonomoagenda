import { redirect } from "next/navigation";

const OWNER_EMAIL = process.env.OWNER_EMAIL?.trim().toLowerCase() ?? "";

const ALLOWED_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

type SubscriptionAccessRow = {
  status: string | null;
};

type EnsurePaidAccessParams = {
  supabase: any;
  userId: string;
  userEmail?: string | null;
  redirectTo?: string;
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function buildRedirectTarget(basePath: string, reason: string) {
  const [pathname, search = ""] = basePath.split("?");
  const params = new URLSearchParams(search);

  params.set("required", "1");
  params.set("reason", reason);

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export async function ensurePaidAccess({
  supabase,
  userId,
  userEmail,
  redirectTo = "/cuenta",
}: EnsurePaidAccessParams) {
  const normalizedUserEmail = normalizeEmail(userEmail);

  if (OWNER_EMAIL && normalizedUserEmail === OWNER_EMAIL) {
    return {
      allowed: true as const,
      accessType: "owner" as const,
      status: "owner",
    };
  }

  const response = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  const data = response.data as SubscriptionAccessRow | null;
  const error = response.error;

  if (error) {
    redirect(buildRedirectTarget(redirectTo, "subscription_error"));
  }

  const normalizedStatus =
    typeof data?.status === "string" ? data.status.trim().toLowerCase() : "";

  if (ALLOWED_SUBSCRIPTION_STATUSES.has(normalizedStatus)) {
    return {
      allowed: true as const,
      accessType: "subscription" as const,
      status: normalizedStatus,
    };
  }

  redirect(
    buildRedirectTarget(
      redirectTo,
      normalizedStatus || "subscription_required",
    ),
  );
}
