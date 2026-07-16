import type { ConciergeIntent, ConciergeIntentId } from '../types.ts';

const PARTY_RE =
  /(\d+)\s*(?:kişilik|kisi|kişi|kiş|person|pax|people)|(?:biz|we)\s*(\d+)/i;
const TIME_RE = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/;
const DATE_ISO_RE = /\b(20\d{2}-\d{2}-\d{2})\b/;
const TODAY_RE = /\bbugün\b|\btoday\b/i;
const TOMORROW_RE = /\byarın\b|\byarin\b|\btomorrow\b/i;

interface IntentRule {
  id: ConciergeIntentId;
  patterns: RegExp[];
  baseConfidence: number;
}

const RULES: IntentRule[] = [
  {
    id: 'show_reservation_summary',
    patterns: [
      /özet|ozet|summary|rezervasyon.*(göster|goster|özeti|ozeti)/i,
      /ne kararlaştırdık|ne kararlastirdik|hatırla|hatirla/i,
    ],
    baseConfidence: 0.9,
  },
  {
    id: 'suggest_campaign',
    patterns: [/kampanya|indirim|promo|discount|fırsat|firsat/i],
    baseConfidence: 0.88,
  },
  {
    id: 'create_preorder',
    patterns: [
      /ön\s*sipariş|on\s*siparis|preorder|önceden sipariş|onceden siparis/i,
      /sipariş oluştur|siparis olustur|sipariş ver/i,
    ],
    baseConfidence: 0.87,
  },
  {
    id: 'suggest_menu',
    patterns: [/menü|menu|yemek öner|yemek oner|ne yesek|ne içelim|ne icelim/i],
    baseConfidence: 0.86,
  },
  {
    id: 'change_party_size',
    patterns: [
      /kişi sayıs|kisi sayis|kaç kişi|kac kisi|party size|misafir say/i,
      /(\d+)\s*kişiye? (?:çıkar|cikar|düşür|dusur|yap|değiştir|degistir)/i,
    ],
    baseConfidence: 0.85,
  },
  {
    id: 'suggest_datetime',
    patterns: [
      /saat öner|saat oner|ne zaman|hangi saat|tarih öner|tarih oner/i,
      /müsait saat|musait saat|uygun saat|uygun tarih/i,
    ],
    baseConfidence: 0.84,
  },
  {
    id: 'suggest_table',
    patterns: [
      /masa öner|masa oner|hangi masa|romantik masa|aile masası|aile masasi|sessiz masa|teras masa/i,
      /masa bul|masa ister|masa isterim/i,
    ],
    baseConfidence: 0.86,
  },
  {
    id: 'create_reservation',
    patterns: [
      /rezervasyon (oluştur|olustur|yap|aç|ac)|rezerve et|masa ayır|masa ayir/i,
      /bugün için rezervasyon|bugun icin rezervasyon|rezervasyon istiyorum/i,
    ],
    baseConfidence: 0.9,
  },
];

function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function tomorrowIso(now = new Date()): string {
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return todayIso(next);
}

function extractSlots(raw: string, now = new Date()): ConciergeIntent['slots'] {
  const partyMatch = raw.match(PARTY_RE);
  const partySize = partyMatch
    ? Number(partyMatch[1] || partyMatch[2])
    : undefined;
  const timeMatch = raw.match(TIME_RE);
  const time = timeMatch
    ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
    : undefined;

  let date: string | undefined;
  const iso = raw.match(DATE_ISO_RE)?.[1];
  if (iso) date = iso;
  else if (TODAY_RE.test(raw)) date = todayIso(now);
  else if (TOMORROW_RE.test(raw)) date = tomorrowIso(now);

  let salon: string | undefined;
  if (/teras|bahçe|bahce|açık|acik|outdoor/i.test(raw)) salon = 'teras';
  else if (/salon|içeri|icerı|indoor/i.test(raw)) salon = 'salon';

  let tablePreference: string | undefined;
  if (/romantik|sessiz|sakin|huzur/i.test(raw)) tablePreference = 'romantic';
  else if (/aile|family/i.test(raw)) tablePreference = 'family';
  else if (/pencere|window/i.test(raw)) tablePreference = 'window';
  else if (/vip/i.test(raw)) tablePreference = 'vip';

  return {
    partySize: Number.isFinite(partySize) ? partySize : undefined,
    date,
    time,
    salon,
    tablePreference,
    menuNeedle: /menü|menu|yemek|içek|icecek/i.test(raw) ? raw : undefined,
    campaignNeedle: /kampanya|indirim/i.test(raw) ? raw : undefined,
  };
}

/**
 * Heuristic Turkish intent parser for Concierge conversation scenarios.
 * No LLM — deterministic for mock + prompt enrichment.
 */
export class IntentParser {
  parse(raw: string, now = new Date()): ConciergeIntent {
    const text = (raw || '').trim();
    const slots = extractSlots(text, now);

    let best: IntentRule | null = null;
    let bestScore = 0;
    for (const rule of RULES) {
      if (rule.patterns.some((re) => re.test(text))) {
        if (rule.baseConfidence > bestScore) {
          best = rule;
          bestScore = rule.baseConfidence;
        }
      }
    }

    // Soft fallback: party + table-ish words → suggest_table
    if (!best && slots.partySize && /masa/i.test(text)) {
      best = { id: 'suggest_table', patterns: [], baseConfidence: 0.7 };
      bestScore = 0.7;
    }

    // Soft fallback: date/time without other intent → create_reservation
    if (!best && (slots.date || slots.time) && /rezerv|masa/i.test(text)) {
      best = { id: 'create_reservation', patterns: [], baseConfidence: 0.65 };
      bestScore = 0.65;
    }

    return {
      id: best?.id || 'general',
      confidence: best ? bestScore : 0.4,
      slots,
      raw: text,
    };
  }
}

export const defaultIntentParser = new IntentParser();
