import { postAiProxy } from '../core/ai-proxy-client.js';

export const WAREHOUSE_COPILOT_NARRATION_FORMAT =
  'warehouse_copilot_narration';

const MAX_SUMMARY_LENGTH = 900;
const MAX_SECTION_LENGTH = 700;
const MAX_ACTION_TEXT_LENGTH = 500;

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value, maxLength) {
  const text = normalizeWhitespace(value);
  if (!text) return '';
  return text.slice(0, maxLength);
}

function normalizeNumberToken(value) {
  return String(value).replace(',', '.');
}

function extractNumberTokens(value) {
  return String(value ?? '').match(/-?\d+(?:[.,]\d+)?/g) ?? [];
}

function buildAllowedNumberTokens(...values) {
  return new Set(
    extractNumberTokens(values.join(' ')).map(normalizeNumberToken)
  );
}

function hasUnsupportedNumber(value, allowedNumbers) {
  return extractNumberTokens(value).some(
    (token) => !allowedNumbers.has(normalizeNumberToken(token))
  );
}

function buildPromptContext(copilot) {
  return {
    health: copilot.health,
    dailySummary: copilot.dailySummary,
    topRisk: copilot.topRisk ?? null,
    topOpportunity: copilot.topOpportunity ?? null,
    actions: copilot.actions,
    confidence: copilot.confidence,
    grounding: copilot.grounding
  };
}

export function buildWarehouseCopilotNarrationPrompt(copilot) {
  const context = buildPromptContext(copilot);

  return [
    'WarehouseIQ deterministik operasyon karar çıktısını yalnızca daha okunabilir bir yönetici anlatımına dönüştür.',
    '',
    'ZORUNLU KURALLAR:',
    '1. Yalnızca geçerli JSON döndür.',
    '2. Kaynak veride bulunmayan hiçbir sayı, KPI, risk, fırsat, aksiyon, neden veya sonuç ekleme.',
    '3. Var olan sayıları değiştirme veya yeni oran/tahmin hesaplama.',
    '4. actionNarratives yalnızca kaynak verideki action id değerlerini kullanabilir.',
    '5. Kaynakta topRisk yoksa riskNarrative üretme.',
    '6. Kaynakta topOpportunity yoksa opportunityNarrative üretme.',
    '7. Yeni operasyon emri verme; yalnız mevcut aksiyonları açık ve kısa anlat.',
    '8. Türkçe, profesyonel ve temkinli dil kullan.',
    '',
    'JSON ŞEMASI:',
    '{',
    '  "executiveSummary": "string",',
    '  "riskNarrative": "string, opsiyonel",',
    '  "opportunityNarrative": "string, opsiyonel",',
    '  "actionNarratives": [',
    '    { "actionId": "kaynak aksiyon kimliği", "text": "string" }',
    '  ]',
    '}',
    '',
    'KAYNAK VERİ:',
    JSON.stringify(context)
  ].join('\n');
}

export function buildDeterministicWarehouseCopilotNarration(copilot) {
  return Object.freeze({
    source: 'deterministic',
    executiveSummary: cleanText(
      copilot.dailySummary,
      MAX_SUMMARY_LENGTH
    ),
    ...(copilot.topRisk
      ? {
          riskNarrative: cleanText(
            copilot.topRisk.description,
            MAX_SECTION_LENGTH
          )
        }
      : {}),
    ...(copilot.topOpportunity
      ? {
          opportunityNarrative: cleanText(
            copilot.topOpportunity.description,
            MAX_SECTION_LENGTH
          )
        }
      : {}),
    actionNarratives: Object.freeze(
      (copilot.actions ?? []).map((action) =>
        Object.freeze({
          actionId: action.id,
          text: cleanText(action.description, MAX_ACTION_TEXT_LENGTH)
        })
      )
    ),
    disclosure:
      'AI anlatımı kullanılamadığında WarehouseIQ doğrulanmış deterministik Copilot çıktısını gösterir.'
  });
}

export function parseWarehouseCopilotNarration(raw, copilot) {
  const normalized = String(raw ?? '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  if (!normalized) return null;

  let parsed;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const executiveSummary = cleanText(
    parsed.executiveSummary,
    MAX_SUMMARY_LENGTH
  );

  if (!executiveSummary) return null;

  const riskNarrative = cleanText(
    parsed.riskNarrative,
    MAX_SECTION_LENGTH
  );
  const opportunityNarrative = cleanText(
    parsed.opportunityNarrative,
    MAX_SECTION_LENGTH
  );

  if (riskNarrative && !copilot.topRisk) return null;
  if (opportunityNarrative && !copilot.topOpportunity) return null;

  if (
    parsed.actionNarratives !== undefined &&
    !Array.isArray(parsed.actionNarratives)
  ) {
    return null;
  }

  const allowedActionIds = new Set(
    (copilot.actions ?? []).map((action) => action.id)
  );
  const seenActionIds = new Set();
  const actionNarratives = [];

  for (const item of parsed.actionNarratives ?? []) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return null;
    }

    const actionId = cleanText(item.actionId, 180);
    const text = cleanText(item.text, MAX_ACTION_TEXT_LENGTH);

    if (
      !actionId ||
      !text ||
      !allowedActionIds.has(actionId) ||
      seenActionIds.has(actionId)
    ) {
      return null;
    }

    const sourceAction = (copilot.actions ?? []).find(
      (action) => action.id === actionId
    );

    if (
      !sourceAction ||
      hasUnsupportedNumber(
        text,
        buildAllowedNumberTokens(
          sourceAction.title,
          sourceAction.description,
          sourceAction.dueLabel
        )
      )
    ) {
      return null;
    }

    seenActionIds.add(actionId);
    actionNarratives.push(
      Object.freeze({
        actionId,
        text
      })
    );
  }

  if (actionNarratives.length > 5) return null;

  if (
    hasUnsupportedNumber(
      executiveSummary,
      buildAllowedNumberTokens(copilot.dailySummary)
    )
  ) {
    return null;
  }

  if (
    riskNarrative &&
    hasUnsupportedNumber(
      riskNarrative,
      buildAllowedNumberTokens(
        copilot.topRisk?.title,
        copilot.topRisk?.description
      )
    )
  ) {
    return null;
  }

  if (
    opportunityNarrative &&
    hasUnsupportedNumber(
      opportunityNarrative,
      buildAllowedNumberTokens(
        copilot.topOpportunity?.title,
        copilot.topOpportunity?.description
      )
    )
  ) {
    return null;
  }

  return Object.freeze({
    source: 'ai',
    executiveSummary,
    ...(riskNarrative ? { riskNarrative } : {}),
    ...(opportunityNarrative
      ? { opportunityNarrative }
      : {}),
    actionNarratives: Object.freeze(actionNarratives),
    disclosure:
      'AI anlatımı yalnızca WarehouseIQ deterministik Copilot sonucunu yeniden ifade eder; operasyon değerleri ve aksiyon kimlikleri kaynak veriden gelir.'
  });
}

export async function fetchWarehouseCopilotNarration(
  copilot,
  options = {}
) {
  const proxyClient = options.proxyClient ?? postAiProxy;
  const fallback = buildDeterministicWarehouseCopilotNarration(copilot);
  const prompt = buildWarehouseCopilotNarrationPrompt(copilot);

  try {
    const response = await proxyClient({
      prompt,
      format: WAREHOUSE_COPILOT_NARRATION_FORMAT,
      context: {
        surface: 'warehouseiq',
        snapshotId: copilot.grounding?.snapshotId ?? null
      }
    });

    if (!response?.ok) {
      return fallback;
    }

    const parsed = parseWarehouseCopilotNarration(
      response.data?.result ?? '',
      copilot
    );

    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
