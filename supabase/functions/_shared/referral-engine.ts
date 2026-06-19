import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordPlatformEvent } from "./platform-analytics.ts";

const MAX_REFERRER_REWARDS_PER_MONTH = 5;
const PRO_REWARD_DAYS = 7;
const EXTRA_ANALYSES_REWARD = 2;

export function normalizeReferralCode(raw: unknown) {
  const code = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);
  if (code.length < 4) return null;
  return code;
}

function normalizeEmail(raw: unknown) {
  const email = String(raw || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function buildReferralCodeFromEmail(email: string) {
  const local = email
    .split("@")[0]
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .slice(0, 10);
  const hash = [...email].reduce(
    (acc, char) => ((acc << 5) - acc) + char.charCodeAt(0),
    0
  );
  const suffix = Math.abs(hash).toString(36).slice(0, 4);
  return `${local || "ib"}${suffix}`.slice(0, 16);
}

async function getReferralCodeRow(sb: SupabaseClient, code: string) {
  const { data } = await sb
    .from("referral_codes")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

function isSelfReferral(
  owner: { owner_user_id?: string | null; owner_email?: string | null },
  referee: { userId?: string | null; email?: string | null }
) {
  if (owner.owner_user_id && referee.userId && owner.owner_user_id === referee.userId) {
    return true;
  }
  const ownerEmail = normalizeEmail(owner.owner_email);
  const refereeEmail = normalizeEmail(referee.email);
  return Boolean(ownerEmail && refereeEmail && ownerEmail === refereeEmail);
}

export async function ensureReferralCode(
  sb: SupabaseClient,
  input: { userId: string; email: string; displayName?: string | null }
) {
  const email = normalizeEmail(input.email);
  if (!email) return { error: "invalid_email" as const };

  const { data: existingByUser } = await sb
    .from("referral_codes")
    .select("code, created_at")
    .eq("owner_user_id", input.userId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingByUser?.code) {
    return { ok: true, code: existingByUser.code, created: false };
  }

  let candidate = buildReferralCodeFromEmail(email);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = attempt > 0 ? String(Math.floor(Math.random() * 36 ** 2)).padStart(2, "0") : "";
    const code = normalizeReferralCode(`${candidate}${suffix}`);
    if (!code) break;

    const { data: taken } = await sb
      .from("referral_codes")
      .select("code")
      .eq("code", code)
      .maybeSingle();

    if (taken?.code) {
      candidate = code;
      continue;
    }

    const { error } = await sb.from("referral_codes").insert({
      code,
      owner_user_id: input.userId,
      owner_email: email,
      is_active: true,
    });

    if (!error) {
      return { ok: true, code, created: true };
    }
    if (error.code !== "23505") {
      return { error: error.message };
    }
    candidate = code;
  }

  return { error: "code_generation_failed" as const };
}

export async function trackReferralClick(
  sb: SupabaseClient,
  input: {
    code: string;
    sessionId?: string | null;
    refereeEmail?: string | null;
    ip?: string | null;
  }
) {
  const code = normalizeReferralCode(input.code);
  if (!code) return { error: "invalid_code" as const };

  const row = await getReferralCodeRow(sb, code);
  if (!row) return { error: "unknown_code" as const };

  const sessionId = String(input.sessionId || "").slice(0, 64) || null;
  const refereeEmail = normalizeEmail(input.refereeEmail);

  let attributionId: string | null = null;

  if (refereeEmail) {
    const { data: byEmail } = await sb
      .from("referral_attributions")
      .select("id, referral_code, click_count")
      .ilike("referee_email", refereeEmail)
      .maybeSingle();

    if (byEmail?.id) {
      if (byEmail.referral_code !== code) {
        return { ok: true, duplicate: true, stacked: false, attributionId: byEmail.id };
      }
      attributionId = byEmail.id;
      await sb
        .from("referral_attributions")
        .update({ click_count: (byEmail.click_count || 0) + 1 })
        .eq("id", byEmail.id);
    }
  }

  if (!attributionId && sessionId) {
    const { data: bySession } = await sb
      .from("referral_attributions")
      .select("id, referral_code, click_count")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (bySession?.id) {
      if (bySession.referral_code !== code) {
        return { ok: true, duplicate: true, stacked: false, attributionId: bySession.id };
      }
      attributionId = bySession.id;
      await sb
        .from("referral_attributions")
        .update({ click_count: (bySession.click_count || 0) + 1 })
        .eq("id", bySession.id);
    }
  }

  if (!attributionId) {
    const { data: inserted, error } = await sb
      .from("referral_attributions")
      .insert({
        referral_code: code,
        referrer_user_id: row.owner_user_id,
        referee_email: refereeEmail,
        session_id: sessionId,
        click_count: 1,
        metadata: { ip_hash: input.ip ? String(input.ip).slice(0, 16) : null },
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: true, duplicate: true, stacked: false };
      }
      return { error: error.message };
    }
    attributionId = inserted?.id || null;
  }

  try {
    await recordPlatformEvent(sb, {
      event_name: "referral_link_clicked",
      email: refereeEmail,
      funnel: "referral",
      funnel_step: "click",
      properties: { referral_code: code, session_id: sessionId },
      source: "referral_engine",
    });
  } catch {
    /* non-blocking */
  }

  return { ok: true, code, attributionId, referrerUserId: row.owner_user_id };
}

export async function attributeReferralSignup(
  sb: SupabaseClient,
  input: {
    code: string;
    userId: string;
    email: string;
    sessionId?: string | null;
  }
) {
  const code = normalizeReferralCode(input.code);
  const email = normalizeEmail(input.email);
  if (!code || !email) return { error: "invalid_input" as const };

  const row = await getReferralCodeRow(sb, code);
  if (!row) return { error: "unknown_code" as const };

  if (isSelfReferral(row, { userId: input.userId, email })) {
    return { error: "self_referral" as const };
  }

  const { data: existingUserAttr } = await sb
    .from("referral_attributions")
    .select("id, referral_code")
    .eq("referee_user_id", input.userId)
    .maybeSingle();

  if (existingUserAttr?.id && existingUserAttr.referral_code !== code) {
    return { ok: true, duplicate: true, stacked: false };
  }

  const { data: existingEmailAttr } = await sb
    .from("referral_attributions")
    .select("id, referral_code")
    .ilike("referee_email", email)
    .maybeSingle();

  if (existingEmailAttr?.id && existingEmailAttr.referral_code !== code) {
    return { ok: true, duplicate: true, stacked: false };
  }

  const patch = {
    referral_code: code,
    referrer_user_id: row.owner_user_id,
    referee_user_id: input.userId,
    referee_email: email,
    session_id: input.sessionId || null,
    signed_up_at: new Date().toISOString(),
  };

  if (existingUserAttr?.id || existingEmailAttr?.id) {
    const id = existingUserAttr?.id || existingEmailAttr?.id;
    await sb.from("referral_attributions").update(patch).eq("id", id!);
  } else {
    const { error } = await sb.from("referral_attributions").insert({
      ...patch,
      first_touch_at: new Date().toISOString(),
      click_count: 1,
    });
    if (error && error.code !== "23505") return { error: error.message };
  }

  try {
    await recordPlatformEvent(sb, {
      event_name: "referral_signup",
      email,
      user_id: input.userId,
      funnel: "referral",
      funnel_step: "signup",
      properties: { referral_code: code, referrer_user_id: row.owner_user_id },
      source: "referral_engine",
    });
  } catch {
    /* non-blocking */
  }

  return { ok: true, code, referrerUserId: row.owner_user_id };
}

async function countReferrerRewardsThisMonth(sb: SupabaseClient, userId: string) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const { count } = await sb
    .from("referral_rewards")
    .select("id", { count: "exact", head: true })
    .eq("beneficiary_user_id", userId)
    .gte("created_at", start.toISOString());

  return count || 0;
}

async function applyReferralEntitlements(
  sb: SupabaseClient,
  userId: string,
  patch: {
    proDays?: number;
    extraAnalyses?: number;
    premiumExplanationUnlock?: boolean;
  }
) {
  const { data: profile } = await sb
    .from("profiles")
    .select("referral_entitlements")
    .eq("id", userId)
    .maybeSingle();

  const current = (profile?.referral_entitlements || {}) as Record<string, unknown>;
  const now = Date.now();
  const existingProUntil = current.pro_until
    ? new Date(String(current.pro_until)).getTime()
    : 0;
  const base = Math.max(now, existingProUntil);
  const proUntil = patch.proDays
    ? new Date(base + patch.proDays * 24 * 60 * 60 * 1000).toISOString()
    : current.pro_until || null;

  const next = {
    ...current,
    pro_until: proUntil,
    extra_auto_analyses:
      Number(current.extra_auto_analyses || 0) + (patch.extraAnalyses || 0),
    premium_explanation_unlock:
      Boolean(current.premium_explanation_unlock) ||
      Boolean(patch.premiumExplanationUnlock),
    updated_at: new Date().toISOString(),
  };

  await sb
    .from("profiles")
    .update({ referral_entitlements: next })
    .eq("id", userId);

  return next;
}

export async function grantReferrerConversionRewards(
  sb: SupabaseClient,
  input: {
    referralCode: string;
    referrerUserId: string;
    conversionType: "lead" | "subscription";
    refereeEmail?: string | null;
    refereeUserId?: string | null;
  }
) {
  const code = normalizeReferralCode(input.referralCode);
  if (!code || !input.referrerUserId) {
    return { error: "invalid_input" as const };
  }

  const monthly = await countReferrerRewardsThisMonth(sb, input.referrerUserId);
  if (monthly >= MAX_REFERRER_REWARDS_PER_MONTH) {
    return { ok: true, capped: true, rewards: [] };
  }

  const idempotencyKey = `conversion:${input.conversionType}:${code}:${
    input.refereeUserId || normalizeEmail(input.refereeEmail) || "anon"
  }`;

  const { data: existingReward } = await sb
    .from("referral_rewards")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingReward?.id) {
    return { ok: true, duplicate: true, rewards: [] };
  }

  const entitlements = await applyReferralEntitlements(sb, input.referrerUserId, {
    proDays: PRO_REWARD_DAYS,
    extraAnalyses: EXTRA_ANALYSES_REWARD,
    premiumExplanationUnlock: true,
  });

  await sb.from("referral_rewards").insert({
    idempotency_key: idempotencyKey,
    referral_code: code,
    beneficiary_user_id: input.referrerUserId,
    reward_type: `referrer_${input.conversionType}`,
    payload: {
      pro_days: PRO_REWARD_DAYS,
      extra_auto_analyses: EXTRA_ANALYSES_REWARD,
      premium_explanation_unlock: true,
      entitlements,
    },
  });

  try {
    await recordPlatformEvent(sb, {
      event_name: "referral_conversion",
      email: input.refereeEmail || null,
      user_id: input.refereeUserId || null,
      funnel: "referral",
      funnel_step: input.conversionType,
      properties: {
        referral_code: code,
        referrer_user_id: input.referrerUserId,
        reward_types: ["pro_trial_extension", "extra_analyses", "premium_unlock"],
      },
      source: "referral_engine",
    });
  } catch {
    /* non-blocking */
  }

  return {
    ok: true,
    rewards: ["pro_trial_extension", "extra_analyses", "premium_unlock"],
    entitlements,
  };
}

export async function processReferralConversion(
  sb: SupabaseClient,
  input: {
    referralCode: string;
    conversionType: "lead" | "subscription";
    refereeEmail?: string | null;
    refereeUserId?: string | null;
    sessionId?: string | null;
  }
) {
  const code = normalizeReferralCode(input.referralCode);
  if (!code) return { skipped: true, reason: "no_code" };

  const row = await getReferralCodeRow(sb, code);
  if (!row?.owner_user_id) return { skipped: true, reason: "no_referrer" };

  if (
    isSelfReferral(row, {
      userId: input.refereeUserId,
      email: input.refereeEmail,
    })
  ) {
    return { skipped: true, reason: "self_referral" };
  }

  const refereeEmail = normalizeEmail(input.refereeEmail);
  let attributionId: string | null = null;

  if (input.refereeUserId) {
    const { data } = await sb
      .from("referral_attributions")
      .select("id, referral_code")
      .eq("referee_user_id", input.refereeUserId)
      .maybeSingle();
    if (data?.id && data.referral_code !== code) {
      return { skipped: true, reason: "stacking_blocked" };
    }
    attributionId = data?.id || null;
  }

  if (!attributionId && refereeEmail) {
    const { data } = await sb
      .from("referral_attributions")
      .select("id, referral_code")
      .ilike("referee_email", refereeEmail)
      .maybeSingle();
    if (data?.id && data.referral_code !== code) {
      return { skipped: true, reason: "stacking_blocked" };
    }
    attributionId = data?.id || null;
  }

  const touchPatch = {
    referral_code: code,
    referrer_user_id: row.owner_user_id,
    referee_user_id: input.refereeUserId || null,
    referee_email: refereeEmail,
    session_id: input.sessionId || null,
    converted_at: new Date().toISOString(),
    conversion_type: input.conversionType,
  };

  if (attributionId) {
    await sb.from("referral_attributions").update(touchPatch).eq("id", attributionId);
  } else {
    await sb.from("referral_attributions").insert({
      ...touchPatch,
      first_touch_at: new Date().toISOString(),
      click_count: 0,
    });
  }

  return grantReferrerConversionRewards(sb, {
    referralCode: code,
    referrerUserId: row.owner_user_id,
    conversionType: input.conversionType,
    refereeEmail,
    refereeUserId: input.refereeUserId,
  });
}
