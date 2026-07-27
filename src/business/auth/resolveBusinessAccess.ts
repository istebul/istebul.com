import type { BusinessRuntime } from "../app/BusinessRuntime";
import type { BusinessAccessResult } from "./BusinessAccessState";

export async function resolveBusinessAccess(
  runtime: BusinessRuntime
): Promise<BusinessAccessResult> {

  const {
    data: { session }
  } = await runtime.client.auth.getSession();

  if (!session?.user) {
    return {
      state: "unauthenticated"
    };
  }

  const { data: membership } = await runtime.client
    .from("business_users")
    .select("business_id")
    .eq("user_id", session.user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.business_id) {
    return {
      state: "needs-business",
      userId: session.user.id
    };
  }

  return {
    state: "ready",
    userId: session.user.id,
    businessId: membership.business_id
  };
}
