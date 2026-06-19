/**
 * Canonical vertical → partner route_type mapping (mirrors edge _shared module).
 */

export const VERTICAL_ROUTE_MAP = Object.freeze({
  konut: 'housing',
  finans: 'finance',
  tatil: 'vacation',
  sigorta: 'insurance',
  kasko: 'kasko'
});

export const ROUTE_TYPE_VERTICALS = Object.freeze(
  Object.fromEntries(Object.entries(VERTICAL_ROUTE_MAP).map(([v, r]) => [r, v]))
);

export const VERTICAL_LEAD_TABLES = Object.freeze({
  housing: 'housing_leads',
  finance: 'vertical_leads',
  vacation: 'vacation_leads',
  insurance: 'sigorta_leads',
  kasko: 'kasko_leads'
});

export const LEAD_TABLE_ROUTE_TYPES = Object.freeze({
  housing_leads: 'housing',
  vacation_leads: 'vacation',
  sigorta_leads: 'insurance',
  kasko_leads: 'kasko',
  vertical_leads: 'finance'
});

export function routeTypeFromVertical(vertical) {
  const key = String(vertical || '').trim().toLowerCase();
  return VERTICAL_ROUTE_MAP[key] || null;
}

export function verticalFromRouteType(routeType) {
  const key = String(routeType || '').trim().toLowerCase();
  return ROUTE_TYPE_VERTICALS[key] || null;
}

export function leadTableFromRouteType(routeType) {
  return VERTICAL_LEAD_TABLES[String(routeType || '').trim().toLowerCase()] || null;
}

export function isVerticalLeadTable(table) {
  return table !== 'auto_leads' && Boolean(LEAD_TABLE_ROUTE_TYPES[table]);
}
