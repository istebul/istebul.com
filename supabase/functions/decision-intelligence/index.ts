import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  aggregateSegmentBenchmarks,
  buildSegmentKey,
} from "../_shared/scoring-intelligence.ts";
import { recordPlatformEvent } from "../_shared/platform-analytics.ts";
import {
  mapDecisionFeedbackToSignals,
  recordOutcomeSignals,
} from "../_shared/outcome-capture.ts";
import {
  deriveProductIntelligenceEvents,
  hasMinimumProductFeedback,
  mapProductFeedbackToSignals,
  normalizeProductFeedbackAnswers,
} from "../_shared/product-feedback.ts";
import { resolveCorsOrigin } from "../_shared/cors-origins.ts";
import {
  API_ERROR_CODES,
  jsonApiError,
  jsonApiResponse,
  logApiEvent,
} from "../_shared/api-response.ts";

const FN = "decision-intelligence";

function corsHeaders(origin: string | null) {
  const allowedOrigin = resolveCorsOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

/** Flat `{ ok: true, ... }` success envelope for existing moat clients. */
function jsonOkFlat(
  payload: Record<string, unknown>,
  status = 200,
  origin: string | null = null,
  requestId?: string
): Response {
  const body = requestId ? { ok: true, ...payload, request_id: requestId } : { ok: true, ...payload };
  return withCors(jsonApiResponse(body, status), origin);
}

function withCors(
  response: Response,
  origin: string | null
): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const COMPETITIVE_POSITIONING = {
  headline: "Karar platformu — listeleyici veya banka değil",
  pillars: [
    {
      id: "deterministic_scores",
      title: "Skor motoru deterministik",
      summary:
        "Uyum skoru ve güven bandı kural tabanlıdır; LLM yalnızca gerekçe metni üretir.",
    },
    {
      id: "closed_loop",
      title: "Kapalı döngü partner ekonomisi",
      summary:
        "Skorlu lead, imzalı webhook, retry ve partner outcome geri beslemesi tek OS içinde.",
    },
    {
      id: "outcome_graph",
      title: "Outcome graph (anonim)",
      summary:
        "Kapanış sinyalleri segment bazında kalibre eder — rakip UI kopyalayamaz, veri birikir.",
    },
    {
      id: "neutral_layer",
      title: "Tarafsız karar katmanı",
      summary:
        "Sahibinden/Arabam envanter değil; Booking rezervasyon değil — yüksek düşünme maliyetli karar.",
    },
  ],
  competitorFrames: [
    { id: "classifieds", label: "İlan marketplaces", stance: "Arama değil — fit + TCO + finansman" },
    { id: "fintech", label: "Oran karşılaştırma", stance: "Faiz tablosu değil — varlık bağlamında yük" },
    { id: "generic_ai", label: "Genel AI sohbet", stance: "Sayıları motor verir; AI anlatır" },
  ],
};

async function handleGet(
  admin: SupabaseClient,
  url: URL,
  origin: string | null,
  requestId: string
): Promise<Response> {
  const action = url.searchParams.get("action") || "benchmarks";

  if (action === "positioning") {
    return jsonOkFlat({ positioning: COMPETITIVE_POSITIONING }, 200, origin, requestId);
  }

  const segmentKey = url.searchParams.get("segment") || "";

  const { data: viewRows, error: viewError } = await admin
    .from("moat_segment_benchmarks")
    .select(
      "segment_key, sample_size, win_count, win_rate_pct, avg_lead_score, avg_match_score"
    )
    .order("sample_size", { ascending: false })
    .limit(24);

  if (viewError) {
    logApiEvent("warn", `${FN}.benchmarks_view_error`, {
      requestId,
      message: viewError.message,
    });
  }

  if (!viewError && viewRows?.length) {
    const match = segmentKey
      ? viewRows.find((r) => r.segment_key === segmentKey)
      : null;
    return jsonOkFlat(
      {
        source: "outcome_view",
        segment: match || null,
        benchmarks: viewRows,
      },
      200,
      origin,
      requestId
    );
  }

  const { data: leads, error: leadError } = await admin
    .from("auto_leads")
    .select("segment_key, partner_status, lead_score, top_match_score, status")
    .not("segment_key", "is", null)
    .neq("status", "test_spam")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (leadError) {
    logApiEvent("error", `${FN}.benchmarks_leads_error`, {
      requestId,
      message: leadError.message,
    });
    return withCors(
      jsonApiError(
        500,
        API_ERROR_CODES.UPSTREAM_ERROR,
        "Benchmark verisi okunamadı",
        {},
        { requestId, upstream: leadError.message }
      ),
      origin
    );
  }

  const benchmarks = aggregateSegmentBenchmarks(leads || []);
  const match = segmentKey
    ? benchmarks.find((b) => b.segment_key === segmentKey)
    : null;

  return jsonOkFlat(
    {
      source: "computed_fallback",
      segment: match || null,
      benchmarks,
    },
    200,
    origin,
    requestId
  );
}

async function handlePost(
  admin: SupabaseClient,
  req: Request,
  origin: string | null,
  requestId: string
): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return withCors(
      jsonApiError(
        400,
        API_ERROR_CODES.BAD_REQUEST,
        "Geçersiz JSON gövdesi",
        {},
        { requestId }
      ),
      origin
    );
  }

  const action = String(body.action || "feedback");

  if (action === "segment_key") {
    const form = body.form && typeof body.form === "object" ? body.form : {};
    return jsonOkFlat(
      { segment_key: buildSegmentKey(form as Record<string, unknown>) },
      200,
      origin,
      requestId
    );
  }

  if (action === "product_feedback") {
    const answers = normalizeProductFeedbackAnswers({
      useful_rating: body.useful_rating,
      outcome_action: body.outcome_action,
      bought_vehicle: body.bought_vehicle,
      chose_alternative: body.chose_alternative,
    });

    if (!hasMinimumProductFeedback(answers)) {
      return withCors(
        jsonApiError(
          400,
          API_ERROR_CODES.BAD_REQUEST,
          "Yetersiz geri bildirim yanıtları",
          {},
          { requestId, code: "insufficient_answers" }
        ),
        origin
      );
    }

    const segmentKey =
      String(body.segment_key || "") ||
      buildSegmentKey(body.form && typeof body.form === "object" ? (body.form as Record<string, unknown>) : {});
    const sessionId = String(body.decision_session_id || "").slice(0, 64) || null;
    const surface = String(body.surface || "auto_results").slice(0, 32);

    const { error: insertError } = await admin.from("product_feedback").insert({
      decision_session_id: sessionId,
      surface,
      useful_rating: answers.useful_rating,
      outcome_action: answers.outcome_action,
      bought_vehicle: answers.bought_vehicle,
      chose_alternative: answers.chose_alternative,
      segment_key: segmentKey || null,
      match_score: Number(body.match_score || 0) || null,
      confidence_tier: String(body.confidence_tier || "").slice(0, 24) || null,
      page_path: String(body.page_path || "").slice(0, 200) || null,
      anonymous_id: String(body.anonymous_id || "").slice(0, 64) || null,
      lead_id: body.lead_id || null,
      properties:
        body.properties && typeof body.properties === "object" ? body.properties : {},
    });

    if (insertError) {
      logApiEvent("error", `${FN}.product_feedback_insert`, {
        requestId,
        message: insertError.message,
      });
      return withCors(
        jsonApiError(
          500,
          API_ERROR_CODES.UPSTREAM_ERROR,
          "Geri bildirim kaydedilemedi",
          {},
          { requestId }
        ),
        origin
      );
    }

    const pfSignals = mapProductFeedbackToSignals(answers);
    if (pfSignals.length) {
      try {
        await recordOutcomeSignals(admin, pfSignals, {
          decision_session_id: sessionId,
          segment_key: segmentKey || null,
          lead_id: body.lead_id || null,
          idempotency_prefix: `pf:${sessionId || "anon"}:${surface}:${Date.now().toString(36).slice(-6)}`,
        });
      } catch (err) {
        logApiEvent("warn", `${FN}.product_feedback_outcome_signals`, {
          requestId,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    for (const eventName of deriveProductIntelligenceEvents(answers)) {
      try {
        await recordPlatformEvent(admin, {
          event_name: eventName,
          funnel: "product_intelligence",
          funnel_step: surface,
          properties: {
            segment_key: segmentKey,
            decision_session_id: sessionId,
            useful_rating: answers.useful_rating,
            outcome_action: answers.outcome_action,
          },
        });
      } catch (err) {
        logApiEvent("warn", `${FN}.product_feedback_platform_event`, {
          requestId,
          eventName,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return jsonOkFlat({}, 200, origin, requestId);
  }

  if (action !== "feedback") {
    return withCors(
      jsonApiError(
        400,
        API_ERROR_CODES.BAD_REQUEST,
        "Bilinmeyen action",
        {},
        { requestId, action }
      ),
      origin
    );
  }

  const feedbackType = String(body.feedback_type || "");
  if (!["helpful", "unclear", "contact"].includes(feedbackType)) {
    return withCors(
      jsonApiError(
        400,
        API_ERROR_CODES.BAD_REQUEST,
        "Geçersiz feedback_type",
        {},
        { requestId, feedbackType }
      ),
      origin
    );
  }

  const eventName = `decision_feedback_${feedbackType}`;
  const segmentKey =
    String(body.segment_key || "") ||
    buildSegmentKey(body.form && typeof body.form === "object" ? (body.form as Record<string, unknown>) : {});

  const { error: feedbackError } = await admin.from("decision_feedback").insert({
    decision_session_id: String(body.decision_session_id || "").slice(0, 64) || null,
    feedback_type: feedbackType,
    surface: String(body.surface || "auto").slice(0, 32),
    segment_key: segmentKey || null,
    match_score: Number(body.match_score || 0) || null,
    confidence_tier: String(body.confidence_tier || "").slice(0, 24) || null,
    page_path: String(body.page_path || "").slice(0, 200) || null,
    anonymous_id: String(body.anonymous_id || "").slice(0, 64) || null,
    properties: body.properties && typeof body.properties === "object" ? body.properties : {},
  });

  if (feedbackError) {
    logApiEvent("error", `${FN}.decision_feedback_insert`, {
      requestId,
      message: feedbackError.message,
    });
    return withCors(
      jsonApiError(
        500,
        API_ERROR_CODES.UPSTREAM_ERROR,
        "Geri bildirim kaydedilemedi",
        {},
        { requestId }
      ),
      origin
    );
  }

  const feedbackSignals = mapDecisionFeedbackToSignals(feedbackType);
  if (feedbackSignals.length) {
    const sessionId = String(body.decision_session_id || "").slice(0, 64) || null;
    try {
      await recordOutcomeSignals(admin, feedbackSignals, {
        decision_session_id: sessionId,
        segment_key: segmentKey || null,
        idempotency_prefix: `feedback:${sessionId || "anon"}:${feedbackType}:${Date.now().toString(36).slice(-6)}`,
      });
      if (Number(body.match_score || 0) > 0) {
        await recordOutcomeSignals(
          admin,
          [
            {
              signal_type: "confidence_accuracy",
              signal_source: "feedback",
              properties: {
                match_score: Number(body.match_score || 0),
                confidence_tier: String(body.confidence_tier || "").slice(0, 24) || null,
                feedback_type: feedbackType,
              },
            },
          ],
          {
            decision_session_id: sessionId,
            segment_key: segmentKey || null,
            idempotency_prefix: `confidence:${sessionId || "anon"}:${feedbackType}`,
          }
        );
      }
    } catch (err) {
      logApiEvent("warn", `${FN}.decision_feedback_outcome_signals`, {
        requestId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  try {
    await recordPlatformEvent(admin, {
      event_name: eventName,
      funnel: "decision",
      funnel_step: feedbackType,
      properties: {
        segment_key: segmentKey,
        decision_session_id: body.decision_session_id,
        match_score: body.match_score,
      },
    });
  } catch (err) {
    logApiEvent("warn", `${FN}.decision_feedback_platform_event`, {
      requestId,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return jsonOkFlat({}, 200, origin, requestId);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  logApiEvent("info", `${FN}.request`, {
    requestId,
    method: req.method,
    origin: origin || null,
  });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    logApiEvent("error", `${FN}.misconfigured`, { requestId });
    return withCors(
      jsonApiError(
        500,
        API_ERROR_CODES.SERVER_MISCONFIGURED,
        "Sunucu yapılandırması eksik",
        {},
        { requestId }
      ),
      origin
    );
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    if (req.method === "GET") {
      return await handleGet(admin, new URL(req.url), origin, requestId);
    }

    if (req.method === "POST") {
      return await handlePost(admin, req, origin, requestId);
    }

    return withCors(
      jsonApiError(
        405,
        API_ERROR_CODES.METHOD_NOT_ALLOWED,
        "Yalnızca GET ve POST desteklenir",
        {},
        { requestId }
      ),
      origin
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "request_failed";
    logApiEvent("error", `${FN}.unhandled`, { requestId, message });
    return withCors(
      jsonApiError(
        500,
        API_ERROR_CODES.INTERNAL_ERROR,
        "İstek işlenemedi",
        {},
        { requestId, message }
      ),
      origin
    );
  }
});
