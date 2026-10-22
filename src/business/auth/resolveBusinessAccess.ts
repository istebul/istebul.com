import type { BusinessRuntime } from "../app/BusinessRuntime";
import type { BusinessAccessResult } from "./BusinessAccessState";

const ACCESS_ERROR_MESSAGE =
  "İşletme erişimi doğrulanamadı. Lütfen yeniden deneyin.";

export async function resolveBusinessAccess(
  runtime: BusinessRuntime
): Promise<BusinessAccessResult> {
  try {
    const {
      data,
      error: sessionError
    } = await runtime.client.auth.getSession();

    if (sessionError) {
      return { state: "error", error: ACCESS_ERROR_MESSAGE };
    }

    const session = data?.session;

    if (!session?.user) {
      return { state: "unauthenticated" };
    }

    const {
      data: membership,
      error: membershipError
    } = await runtime.client
      .from("business_users")
      .select("business_id, role")
      .eq("user_id", session.user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return {
        state: "error",
        error: ACCESS_ERROR_MESSAGE
      };
    }

    if (!membership?.business_id) {
      return {
        state: "needs-business",
        userId: session.user.id
      };
    }

    return {
      state: "ready",
      userId: session.user.id,
      businessId: membership.business_id,
      role: typeof membership.role === "string" ? membership.role : undefined
    };
  } catch {
    return { state: "error", error: ACCESS_ERROR_MESSAGE };
  }
}
