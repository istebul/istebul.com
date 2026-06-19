/**
 * Canonical vertical → partner route_type mapping (P0).
 *
 * vertical (UI/funnel)  →  route_type (partner_endpoints)
 * konut                 →  housing
 * finans                →  finance
 * tatil                 →  vacation
 * sigorta               →  insurance
 * kasko                 →  kasko
 */

export const VERTICAL_ROUTE_MAP: Record<string, string> = {
  konut: "housing",
  finans: "finance",
  tatil: "vacation",
  sigorta: "insurance",
  kasko: "kasko",
};

export const ROUTE_TYPE_VERTICALS = Object.freeze(
  Object.fromEntries(Object.entries(VERTICAL_ROUTE_MAP).map(([v, r]) => [r, v]))
);

export const VERTICAL_LEAD_TABLES: Record<string, string> = {
  housing: "housing_leads",
  finance: "vertical_leads",
  vacation: "vacation_leads",
  insurance: "sigorta_leads",
  kasko: "kasko_leads",
};

export const LEAD_TABLE_ROUTE_TYPES: Record<string, string> = {
  housing_leads: "housing",
  vacation_leads: "vacation",
  sigorta_leads: "insurance",
  kasko_leads: "kasko",
  vertical_leads: "finance",
};

export function routeTypeFromVertical(vertical: string): string | null {
  const key = String(vertical || "").trim().toLowerCase();
  return VERTICAL_ROUTE_MAP[key] || null;
}

export function verticalFromRouteType(routeType: string): string | null {
  const key = String(routeType || "").trim().toLowerCase();
  return ROUTE_TYPE_VERTICALS[key] || null;
}

export function leadTableFromRouteType(routeType: string): string | null {
  return VERTICAL_LEAD_TABLES[String(routeType || "").trim().toLowerCase()] || null;
}

export function isVerticalLeadTable(table: string): boolean {
  return table !== "auto_leads" && Boolean(LEAD_TABLE_ROUTE_TYPES[table]);
}
