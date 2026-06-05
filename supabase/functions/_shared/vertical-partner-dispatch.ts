import {
  applyVerticalDispatchResult,
  dispatchPartnerLead,
  type DispatchResult,
  type DispatchTrigger,
} from "./partner-dispatch.ts";
import { priorityFromScore } from "./scoring-intelligence.ts";
import {
  routeTypeFromVertical,
  type VERTICAL_ROUTE_MAP,
} from "./vertical-partner-routing.ts";

export type VerticalDispatchTrigger = Extract<
  DispatchTrigger,
  | "housing_intake"
  | "vacation_intake"
  | "sigorta_intake"
  | "vertical_intake"
  | "kasko_intake"
  | "partner_retry"
  | "partner_dispatch"
>;

const DISPATCHABLE_STATUSES = new Set(["new"]);

export function shouldDispatchVerticalLead(lead: Record<string, unknown>) {
  const status = String(lead.status || "new");
  const phone = String(lead.phone || "").replace(/\D/g, "");
  return DISPATCHABLE_STATUSES.has(status) && phone.length >= 10;
}

export function extractLeadScore(lead: Record<string, unknown>) {
  if (lead.lead_score != null) return Number(lead.lead_score) || 0;

  const decision = Number(lead.decision_score || 0);
  if (decision > 0) return decision;

  try {
    const notes = lead.notes ? JSON.parse(String(lead.notes)) : null;
    if (notes?.lead_score != null) return Number(notes.lead_score) || 0;
  } catch {
    /* ignore */
  }

  return 0;
}

export function extractPriority(lead: Record<string, unknown>, score: number) {
  if (lead.priority) return String(lead.priority);

  try {
    const notes = lead.notes ? JSON.parse(String(lead.notes)) : null;
    if (notes?.priority) return String(notes.priority);
  } catch {
    /* ignore */
  }

  return priorityFromScore(score);
}

export function buildVerticalDispatchPayload(
  lead: Record<string, unknown>,
  vertical: keyof typeof VERTICAL_ROUTE_MAP | string,
  leadTable: string
) {
  const routeType = routeTypeFromVertical(vertical);
  if (!routeType) {
    throw new Error(`unknown_vertical:${vertical}`);
  }

  const score = extractLeadScore(lead);
  const priority = extractPriority(lead, score);

  return {
    ...lead,
    vertical: String(vertical),
    lead_source: leadTable,
    partner_route: routeType,
    lead_score: score,
    priority,
  };
}

export async function runVerticalPartnerDispatch(
  adminClient: { from: (table: string) => any; rpc: (name: string, args: Record<string, unknown>) => any },
  options: {
    leadTable: string;
    leadId: string;
    vertical: string;
    lead: Record<string, unknown>;
    trigger: VerticalDispatchTrigger;
    attemptNumber?: number;
    manualDispatch?: boolean;
    skipHotCheck?: boolean;
  }
): Promise<DispatchResult | null> {
  if (!shouldDispatchVerticalLead(options.lead)) {
    return null;
  }

  const payload = buildVerticalDispatchPayload(
    { ...options.lead, id: options.leadId },
    options.vertical,
    options.leadTable
  );

  const dispatchResult = await dispatchPartnerLead(adminClient, {
    leadId: options.leadId,
    payload,
    trigger: options.trigger,
    attemptNumber: options.attemptNumber ?? 1,
    manualDispatch: options.manualDispatch,
    skipHotCheck: options.skipHotCheck,
    leadSource: options.leadTable,
  });

  if (
    dispatchResult.status === "dispatch_failed" ||
    dispatchResult.status === "dispatched"
  ) {
    await applyVerticalDispatchResult(
      adminClient,
      options.leadTable,
      options.leadId,
      dispatchResult,
      Number(options.lead.partner_dispatch_retry_count || 0)
    );
  }

  return dispatchResult;
}

export function scheduleVerticalPartnerDispatch(
  adminClient: { from: (table: string) => any; rpc: (name: string, args: Record<string, unknown>) => any },
  options: Parameters<typeof runVerticalPartnerDispatch>[1]
) {
  EdgeRuntime.waitUntil(
    runVerticalPartnerDispatch(adminClient, options).catch(() => null)
  );
}
