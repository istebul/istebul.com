import { onRequestGet as __garson_api_ai_health_js_onRequestGet } from "/Users/nadigurel/isteBu-v2-src/functions/garson/api/ai/health.js"
import { onRequestOptions as __garson_api_ai_health_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/garson/api/ai/health.js"
import { onRequestGet as __garson_api_whatsapp_health_js_onRequestGet } from "/Users/nadigurel/isteBu-v2-src/functions/garson/api/whatsapp/health.js"
import { onRequestOptions as __garson_api_whatsapp_health_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/garson/api/whatsapp/health.js"
import { onRequestOptions as __garson_api_whatsapp_webhook_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/garson/api/whatsapp/webhook.js"
import { onRequest as __garson_api_whatsapp_webhook_js_onRequest } from "/Users/nadigurel/isteBu-v2-src/functions/garson/api/whatsapp/webhook.js"
import { onRequestGet as __api_whatsapp_health_js_onRequestGet } from "/Users/nadigurel/isteBu-v2-src/functions/api/whatsapp/health.js"
import { onRequestOptions as __api_whatsapp_health_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/api/whatsapp/health.js"
import { onRequestOptions as __api_whatsapp_webhook_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/api/whatsapp/webhook.js"
import { onRequest as __api_whatsapp_webhook_js_onRequest } from "/Users/nadigurel/isteBu-v2-src/functions/api/whatsapp/webhook.js"
import { onRequestGet as __api_afad_earthquake_snapshot_js_onRequestGet } from "/Users/nadigurel/isteBu-v2-src/functions/api/afad-earthquake-snapshot.js"
import { onRequestHead as __api_afad_earthquake_snapshot_js_onRequestHead } from "/Users/nadigurel/isteBu-v2-src/functions/api/afad-earthquake-snapshot.js"
import { onRequestOptions as __api_afad_earthquake_snapshot_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/api/afad-earthquake-snapshot.js"
import { onRequestGet as __api_analytics_ingest_js_onRequestGet } from "/Users/nadigurel/isteBu-v2-src/functions/api/analytics-ingest.js"
import { onRequestOptions as __api_analytics_ingest_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/api/analytics-ingest.js"
import { onRequestPost as __api_analytics_ingest_js_onRequestPost } from "/Users/nadigurel/isteBu-v2-src/functions/api/analytics-ingest.js"
import { onRequestOptions as __api_create_billing_portal_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/api/create-billing-portal.js"
import { onRequestPost as __api_create_billing_portal_js_onRequestPost } from "/Users/nadigurel/isteBu-v2-src/functions/api/create-billing-portal.js"
import { onRequestOptions as __api_create_checkout_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/api/create-checkout.js"
import { onRequestPost as __api_create_checkout_js_onRequestPost } from "/Users/nadigurel/isteBu-v2-src/functions/api/create-checkout.js"
import { onRequestGet as __api_evds_snapshot_js_onRequestGet } from "/Users/nadigurel/isteBu-v2-src/functions/api/evds-snapshot.js"
import { onRequestHead as __api_evds_snapshot_js_onRequestHead } from "/Users/nadigurel/isteBu-v2-src/functions/api/evds-snapshot.js"
import { onRequestOptions as __api_evds_snapshot_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/api/evds-snapshot.js"
import { onRequestGet as __api_health_js_onRequestGet } from "/Users/nadigurel/isteBu-v2-src/functions/api/health.js"
import { onRequestOptions as __api_health_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/api/health.js"
import { onRequestOptions as __api_paid_conversion_ingest_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/api/paid-conversion-ingest.js"
import { onRequestPost as __api_paid_conversion_ingest_js_onRequestPost } from "/Users/nadigurel/isteBu-v2-src/functions/api/paid-conversion-ingest.js"
import { onRequestGet as __api_public_stats_js_onRequestGet } from "/Users/nadigurel/isteBu-v2-src/functions/api/public-stats.js"
import { onRequestOptions as __api_public_stats_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/api/public-stats.js"
import { onRequestOptions as __api_stripe_webhook_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/api/stripe-webhook.js"
import { onRequestPost as __api_stripe_webhook_js_onRequestPost } from "/Users/nadigurel/isteBu-v2-src/functions/api/stripe-webhook.js"
import { onRequestGet as __api_tuik_snapshot_js_onRequestGet } from "/Users/nadigurel/isteBu-v2-src/functions/api/tuik-snapshot.js"
import { onRequestHead as __api_tuik_snapshot_js_onRequestHead } from "/Users/nadigurel/isteBu-v2-src/functions/api/tuik-snapshot.js"
import { onRequestOptions as __api_tuik_snapshot_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/api/tuik-snapshot.js"
import { onRequestOptions as __ai_proxy_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/ai-proxy.js"
import { onRequestPost as __ai_proxy_js_onRequestPost } from "/Users/nadigurel/isteBu-v2-src/functions/ai-proxy.js"
import { onRequestGet as __analytics_ingest_js_onRequestGet } from "/Users/nadigurel/isteBu-v2-src/functions/analytics-ingest.js"
import { onRequestOptions as __analytics_ingest_js_onRequestOptions } from "/Users/nadigurel/isteBu-v2-src/functions/analytics-ingest.js"
import { onRequestPost as __analytics_ingest_js_onRequestPost } from "/Users/nadigurel/isteBu-v2-src/functions/analytics-ingest.js"
import { onRequest as __env_js_onRequest } from "/Users/nadigurel/isteBu-v2-src/functions/env.js"

export const routes = [
    {
      routePath: "/garson/api/ai/health",
      mountPath: "/garson/api/ai",
      method: "GET",
      middlewares: [],
      modules: [__garson_api_ai_health_js_onRequestGet],
    },
  {
      routePath: "/garson/api/ai/health",
      mountPath: "/garson/api/ai",
      method: "OPTIONS",
      middlewares: [],
      modules: [__garson_api_ai_health_js_onRequestOptions],
    },
  {
      routePath: "/garson/api/whatsapp/health",
      mountPath: "/garson/api/whatsapp",
      method: "GET",
      middlewares: [],
      modules: [__garson_api_whatsapp_health_js_onRequestGet],
    },
  {
      routePath: "/garson/api/whatsapp/health",
      mountPath: "/garson/api/whatsapp",
      method: "OPTIONS",
      middlewares: [],
      modules: [__garson_api_whatsapp_health_js_onRequestOptions],
    },
  {
      routePath: "/garson/api/whatsapp/webhook",
      mountPath: "/garson/api/whatsapp",
      method: "OPTIONS",
      middlewares: [],
      modules: [__garson_api_whatsapp_webhook_js_onRequestOptions],
    },
  {
      routePath: "/garson/api/whatsapp/webhook",
      mountPath: "/garson/api/whatsapp",
      method: "",
      middlewares: [],
      modules: [__garson_api_whatsapp_webhook_js_onRequest],
    },
  {
      routePath: "/api/whatsapp/health",
      mountPath: "/api/whatsapp",
      method: "GET",
      middlewares: [],
      modules: [__api_whatsapp_health_js_onRequestGet],
    },
  {
      routePath: "/api/whatsapp/health",
      mountPath: "/api/whatsapp",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_whatsapp_health_js_onRequestOptions],
    },
  {
      routePath: "/api/whatsapp/webhook",
      mountPath: "/api/whatsapp",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_whatsapp_webhook_js_onRequestOptions],
    },
  {
      routePath: "/api/whatsapp/webhook",
      mountPath: "/api/whatsapp",
      method: "",
      middlewares: [],
      modules: [__api_whatsapp_webhook_js_onRequest],
    },
  {
      routePath: "/api/afad-earthquake-snapshot",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_afad_earthquake_snapshot_js_onRequestGet],
    },
  {
      routePath: "/api/afad-earthquake-snapshot",
      mountPath: "/api",
      method: "HEAD",
      middlewares: [],
      modules: [__api_afad_earthquake_snapshot_js_onRequestHead],
    },
  {
      routePath: "/api/afad-earthquake-snapshot",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_afad_earthquake_snapshot_js_onRequestOptions],
    },
  {
      routePath: "/api/analytics-ingest",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_analytics_ingest_js_onRequestGet],
    },
  {
      routePath: "/api/analytics-ingest",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_analytics_ingest_js_onRequestOptions],
    },
  {
      routePath: "/api/analytics-ingest",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_analytics_ingest_js_onRequestPost],
    },
  {
      routePath: "/api/create-billing-portal",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_create_billing_portal_js_onRequestOptions],
    },
  {
      routePath: "/api/create-billing-portal",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_create_billing_portal_js_onRequestPost],
    },
  {
      routePath: "/api/create-checkout",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_create_checkout_js_onRequestOptions],
    },
  {
      routePath: "/api/create-checkout",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_create_checkout_js_onRequestPost],
    },
  {
      routePath: "/api/evds-snapshot",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_evds_snapshot_js_onRequestGet],
    },
  {
      routePath: "/api/evds-snapshot",
      mountPath: "/api",
      method: "HEAD",
      middlewares: [],
      modules: [__api_evds_snapshot_js_onRequestHead],
    },
  {
      routePath: "/api/evds-snapshot",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_evds_snapshot_js_onRequestOptions],
    },
  {
      routePath: "/api/health",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_health_js_onRequestGet],
    },
  {
      routePath: "/api/health",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_health_js_onRequestOptions],
    },
  {
      routePath: "/api/paid-conversion-ingest",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_paid_conversion_ingest_js_onRequestOptions],
    },
  {
      routePath: "/api/paid-conversion-ingest",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_paid_conversion_ingest_js_onRequestPost],
    },
  {
      routePath: "/api/public-stats",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_public_stats_js_onRequestGet],
    },
  {
      routePath: "/api/public-stats",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_public_stats_js_onRequestOptions],
    },
  {
      routePath: "/api/stripe-webhook",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_stripe_webhook_js_onRequestOptions],
    },
  {
      routePath: "/api/stripe-webhook",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_stripe_webhook_js_onRequestPost],
    },
  {
      routePath: "/api/tuik-snapshot",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_tuik_snapshot_js_onRequestGet],
    },
  {
      routePath: "/api/tuik-snapshot",
      mountPath: "/api",
      method: "HEAD",
      middlewares: [],
      modules: [__api_tuik_snapshot_js_onRequestHead],
    },
  {
      routePath: "/api/tuik-snapshot",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_tuik_snapshot_js_onRequestOptions],
    },
  {
      routePath: "/ai-proxy",
      mountPath: "/",
      method: "OPTIONS",
      middlewares: [],
      modules: [__ai_proxy_js_onRequestOptions],
    },
  {
      routePath: "/ai-proxy",
      mountPath: "/",
      method: "POST",
      middlewares: [],
      modules: [__ai_proxy_js_onRequestPost],
    },
  {
      routePath: "/analytics-ingest",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__analytics_ingest_js_onRequestGet],
    },
  {
      routePath: "/analytics-ingest",
      mountPath: "/",
      method: "OPTIONS",
      middlewares: [],
      modules: [__analytics_ingest_js_onRequestOptions],
    },
  {
      routePath: "/analytics-ingest",
      mountPath: "/",
      method: "POST",
      middlewares: [],
      modules: [__analytics_ingest_js_onRequestPost],
    },
  {
      routePath: "/env",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__env_js_onRequest],
    },
  ]