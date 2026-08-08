import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  WAREHOUSE_COPILOT_NARRATION_FORMAT,
  buildDeterministicWarehouseCopilotNarration,
  buildWarehouseCopilotNarrationPrompt,
  fetchWarehouseCopilotNarration,
  parseWarehouseCopilotNarration
} from '../../js/warehouse/operations-copilot-narration.js';

const copilot = Object.freeze({
  generatedAt: '2026-08-08T11:00:00.000Z',
  tenantId: 'tenant-1',
  warehouseId: 'warehouse-1',
  periodStart: '2026-08-08T00:00:00.000Z',
  periodEnd: '2026-08-08T23:59:59.999Z',
  health: {
    score: 64,
    status: 'attention',
    statusLabel: 'Dikkat gerekli'
  },
  dailySummary:
    'Depo sağlık skoru 64/100 (Dikkat gerekli). 1 KPI hedef dışı. 2 açık istisna bulunuyor.',
  topRisk: {
    id: 'exception-risk-RESOLVE_CRITICAL_EXCEPTIONS',
    title: 'Kritik istisnaları hemen çözüm kuyruğuna alın',
    description: '2 kritik istisna henüz çözülmedi.',
    priority: 'immediate',
    source: 'exception_analytics'
  },
  topOpportunity: {
    id: 'comparison-opportunity-inventory_accuracy',
    title: 'Stok doğruluğu iyileşiyor',
    description: 'Stok doğruluğu mevcut değeri 99; önceki değer 97.',
    priority: 'medium',
    source: 'comparison'
  },
  actions: [
    {
      id: 'exception-action-RESOLVE_CRITICAL_EXCEPTIONS',
      title: 'Kritik istisnaları hemen çözüm kuyruğuna alın',
      description: '2 kritik istisna henüz çözülmedi.',
      priority: 'immediate',
      source: 'exception_analytics',
      dueLabel: 'Hemen'
    }
  ],
  confidence: {
    score: 90,
    level: 'high',
    label: 'Yüksek veri güveni',
    reasons: [
      "Güncel operasyon snapshot'ı mevcut.",
      'İstisna ve darboğaz analizi mevcut.'
    ]
  },
  grounding: {
    snapshotId: 'snapshot-1',
    snapshotCalculatedAt: '2026-08-08T10:00:00.000Z'
  },
  disclosure: 'Deterministik kaynak.'
});

test('WarehouseIQ anlatım promptu yeni veri uydurmayı yasaklar', () => {
  const prompt = buildWarehouseCopilotNarrationPrompt(copilot);

  assert.match(prompt, /bulunmayan hiçbir sayı/);
  assert.match(prompt, /actionNarratives/);
  assert.match(prompt, /snapshot-1/);
});

test('Geçerli AI anlatımı kaynak aksiyon kimliğiyle kabul edilir', () => {
  const raw = JSON.stringify({
    executiveSummary:
      'Depo sağlık skoru 64/100 ve dikkat gerekli seviyesinde.',
    riskNarrative:
      '2 kritik istisna henüz çözülmedi.',
    opportunityNarrative:
      'Stok doğruluğu 99 seviyesine yükselirken önceki değer 97.',
    actionNarratives: [
      {
        actionId:
          'exception-action-RESOLVE_CRITICAL_EXCEPTIONS',
        text:
          '2 kritik istisna için mevcut çözüm aksiyonunu önceliklendirin.'
      }
    ]
  });

  const parsed = parseWarehouseCopilotNarration(raw, copilot);

  assert.equal(parsed?.source, 'ai');
  assert.equal(parsed?.actionNarratives.length, 1);
});

test('Kaynakta olmayan yeni sayı AI anlatımını reddeder', () => {
  const raw = JSON.stringify({
    executiveSummary:
      'Depo sağlık skoru 64/100 ve 17 yeni sorun bulunuyor.',
    actionNarratives: []
  });

  assert.equal(
    parseWarehouseCopilotNarration(raw, copilot),
    null
  );
});

test('Bilinmeyen aksiyon kimliği AI anlatımını reddeder', () => {
  const raw = JSON.stringify({
    executiveSummary:
      'Depo sağlık skoru 64/100.',
    actionNarratives: [
      {
        actionId: 'uydurma-aksiyon',
        text: '2 kritik istisnayı yönetin.'
      }
    ]
  });

  assert.equal(
    parseWarehouseCopilotNarration(raw, copilot),
    null
  );
});

test('AI proxy hatasında deterministik fallback döner', async () => {
  const result = await fetchWarehouseCopilotNarration(
    copilot,
    {
      proxyClient: async () => ({
        ok: false,
        status: 500,
        error: 'test'
      })
    }
  );

  assert.equal(result.source, 'deterministic');
  assert.equal(result.executiveSummary, copilot.dailySummary);
});

test('AI proxy doğru WarehouseIQ formatıyla çağrılır', async () => {
  let request;

  const result = await fetchWarehouseCopilotNarration(
    copilot,
    {
      proxyClient: async (input) => {
        request = input;
        return {
          ok: true,
          status: 200,
          data: {
            result: JSON.stringify({
              executiveSummary:
                'Depo sağlık skoru 64/100 ve dikkat gerekli seviyesinde.',
              actionNarratives: []
            })
          }
        };
      }
    }
  );

  assert.equal(
    request.format,
    WAREHOUSE_COPILOT_NARRATION_FORMAT
  );
  assert.equal(request.context.surface, 'warehouseiq');
  assert.equal(result.source, 'ai');
});

test('Deterministik fallback mevcut risk ve aksiyon metinlerini korur', () => {
  const fallback =
    buildDeterministicWarehouseCopilotNarration(copilot);

  assert.equal(fallback.source, 'deterministic');
  assert.equal(
    fallback.riskNarrative,
    copilot.topRisk.description
  );
  assert.equal(
    fallback.actionNarratives[0].actionId,
    copilot.actions[0].id
  );
});

test('AI proxy WarehouseIQ için özel yapılandırılmış sistem mesajı kullanır', async () => {
  const source = await readFile(
    new URL('../../functions/ai-proxy.js', import.meta.url),
    'utf8'
  );

  assert.match(
    source,
    /warehouse_copilot_narration/
  );
  assert.match(
    source,
    /WarehouseIQ depo operasyon karar anlatım asistanısın/
  );
  assert.match(
    source,
    /Kaynak veride olmayan sayı, KPI, risk, fırsat, aksiyon/
  );
});

test('Grounding tarihindeki sayı yeni operasyon sayısını meşrulaştırmaz', () => {
  const raw = JSON.stringify({
    executiveSummary:
      'Depo sağlık skoru 64/100 ve 2026 kritik sorun bulunuyor.',
    actionNarratives: []
  });

  assert.equal(
    parseWarehouseCopilotNarration(raw, copilot),
    null
  );
});
