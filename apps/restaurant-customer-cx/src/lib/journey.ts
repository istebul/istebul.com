export const JOURNEY_STEPS = [
  'landing',
  'concierge',
  'date',
  'time',
  'guests',
  'salon',
  'table',
  'menu',
  'preorder',
  'guarantee',
  'summary',
  'confirmation',
] as const;

export type JourneyStep = (typeof JOURNEY_STEPS)[number];

export const JOURNEY_STEP_LABELS: Record<JourneyStep, string> = {
  landing: 'Karşılama',
  concierge: 'AI Concierge',
  date: 'Tarih',
  time: 'Saat',
  guests: 'Kişi',
  salon: 'Salon',
  table: 'Masa',
  menu: 'Menü',
  preorder: 'Ön Sipariş',
  guarantee: 'Provizyon',
  summary: 'Özet',
  confirmation: 'Onay',
};

export function nextStep(step: JourneyStep): JourneyStep | null {
  const index = JOURNEY_STEPS.indexOf(step);
  if (index < 0 || index >= JOURNEY_STEPS.length - 1) return null;
  return JOURNEY_STEPS[index + 1];
}

export function prevStep(step: JourneyStep): JourneyStep | null {
  const index = JOURNEY_STEPS.indexOf(step);
  if (index <= 0) return null;
  return JOURNEY_STEPS[index - 1];
}

export const UNAVAILABLE_TABLE_STATUSES = new Set([
  'occupied',
  'reserved',
  'awaiting_checkin',
  'preparing',
  'serving',
  'awaiting_bill',
  'inactive',
]);

export function isTableAvailableForSelection(status: string | null | undefined, active: boolean): boolean {
  if (!active) return false;
  const key = String(status || 'empty').toLowerCase();
  return !UNAVAILABLE_TABLE_STATUSES.has(key);
}
