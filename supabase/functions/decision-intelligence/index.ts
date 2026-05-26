import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

function corsHeaders(origin: string | null) {
  const allowedOrigin = resolveCorsOrigin(origin);

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
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

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    return json({ error: "server_misconfigured" }, 500, origin);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const action = url.searchParams.get("action") || "benchmarks";

      if (action === "positioning") {
        return json({ ok: true, positioning: COMPETITIVE_POSITIONING }, 200, origin);
      }

      const segmentKey = url.searchParams.get("segment") || "";

      const { data: viewRows, error: viewError } = await admin
        .from("moat_segment_benchmarks")
        .select(
          "segment_key, sample_size, win_count, win_rate_pct, avg_lead_score, avg_match_score"
        )
        .order("sample_size", { ascending: false })
        .limit(24);

      if (!viewError && viewRows?.length) {
        const match = segmentKey
          ? viewRows.find((r) => r.segment_key === segmentKey)
          : null;
        return json(
          {
            ok: true,
            source: "outcome_view",
            segment: match || null,
            benchmarks: viewRows,
          },
          200,
          origin
        );
      }

      const { data: leads, error: leadError } = await admin
        .from("auto_leads")
        .select(
          "segment_key, partner_status, lead_score, top_match_score, status"
        )
        .not("segment_key", "is", null)
        .neq("status", "test_spam")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (leadError) {
        return json({ error: leadError.message }, 500, origin);
      }

      const benchmarks = aggregateSegmentBenchmarks(leads || []);
      const match = segmentKey
        ? benchmarks.find((b) => b.segment_key === segmentKey)
        : null;

      return json(
        {
          ok: true,
          source: "computed_fallback",
          segment: match || null,
          benchmarks,
        },
        200,
        origin
      );
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const action = String(body.action || "feedback");

      if (action === "segment_key") {
        const form = body.form && typeof body.form === "object" ? body.form : {};
        return json({ ok: true, segment_key: buildSegmentKey(form) }, 200, origin);
      }

      if (action === "product_feedback") {
        const answers = normalizeProductFeedbackAnswers({
          useful_rating: body.useful_rating,
          outcome_action: body.outcome_action,
          bought_vehicle: body.bought_vehicle,
          chose_alternative: body.chose_alternative,
        });

        if (!hasMinimumProductFeedback(answers)) {
          return json({ error: "insufficient_answers" }, 400, origin);
        }

        const segmentKey =
          String(body.segment_key || "") ||
          buildSegmentKey(body.form && typeof body.form === "object" ? body.form : {});
        const sessionId = String(body.decision_session_id || "").slice(0, 64) || null;
        const surface = String(body.surface || "auto_results").slice(0, 32);

        await admin.from("product_feedback").insert({
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

        const pfSignals = mapProductFeedbackToSignals(answers);
        if (pfSignals.length) {
          try {
            await recordOutcomeSignals(admin, pfSignals, {
              decision_session_id: sessionId,
              segment_key: segmentKey || null,
              lead_id: body.lead_id || null,
              idempotency_prefix: `pf:${sessionId || "anon"}:${surface}:${Date.now().toString(36).slice(-6)}`,
            });
          } catch {
            /* non-blocking */
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
          } catch {
            /* non-blocking */
          }
        }

        return json({ ok: true }, 200, origin);
      }

      if (action !== "feedback") {
        return json({ error: "unknown_action" }, 400, origin);
      }

      const feedbackType = String(body.feedback_type || "");
      if (!["helpful", "unclear", "contact"].includes(feedbackType)) {
        return json({ error: "invalid_feedback_type" }, 400, origin);
      }

      const eventName = `decision_feedback_${feedbackType}`;
      const segmentKey =
        String(body.segment_key || "") ||
        buildSegmentKey(body.form && typeof body.form === "object" ? body.form : {});

      await admin.from("decision_feedback").insert({
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
            await recordOutcomeSignals(admin, [
              {
                signal_type: "confidence_accuracy",
                signal_source: "feedback",
                properties: {
                  match_score: Number(body.match_score || 0),
                  confidence_tier: String(body.confidence_tier || "").slice(0, 24) || null,
                  feedback_type: feedbackType,
                },
              },
            ], {
              decision_session_id: sessionId,
              segment_key: segmentKey || null,
              idempotency_prefix: `confidence:${sessionId || "anon"}:${feedbackType}`,
            });
          }
        } catch {
          /* non-blocking */
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
      } catch {
        /* non-blocking */
      }

      return json({ ok: true }, 200, origin);
    }

    return json({ error: "method_not_allowed" }, 405, origin);
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "request_failed" },
      500,
      origin
    );
  }
});
