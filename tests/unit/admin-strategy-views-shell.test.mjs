import test from 'node:test';
import assert from 'node:assert/strict';
import { renderStartupOperatingCenter } from '../../js/features/ops/startup-operating-views.js';
import { renderScaleArchitectureCenter } from '../../js/features/ops/scale-architecture-views.js';
import { renderCompanyOperatingSystem } from '../../js/features/ops/company-operating-views.js';
import { renderHiringArchitectureCenter } from '../../js/features/ops/hiring-architecture-views.js';

const esc = (value) => String(value ?? '');

const p18Stub = {
  scaleStage: 'scaling',
  scaleReadinessPct: 42,
  opsHealth: 'healthy',
  executiveSummary: [],
  pillars: [],
  bottlenecks: [],
  decisionCadence: [],
  quickWins: [],
  executiveRoles: [],
  implementationPhases: []
};

const p19Stub = {
  docPath: 'docs/SCALE_ARCHITECTURE.md',
  tierConfidence: { '10k': 80, '100k': 60, '1m': 40 },
  confidenceVerdict: {},
  volumeEstimates: {
    '10k': {},
    '100k': {},
    '1m': {}
  },
  dimensions: [],
  currentGuardrails: {
    analyticsMaxQueue: 100,
    analyticsIngestPerIpPerMin: 10,
    analyticsBatchMax: 50,
    analyticsRetentionDays: 90,
    aiProxyPerIpPerMin: 5,
    aiSessionCallsPerHour: 20,
    lifecycleSendsPerRun: 100,
    adminExecutiveRowLimit: 500
  },
  executiveSummary: []
};

const p20Stub = {
  docPath: 'docs/COMPANY_OPERATING_SYSTEM.md',
  independenceScore: 65,
  executiveSummary: [],
  founderIndependenceChecks: [],
  reviews: [],
  roadmapNow: [],
  decisionRecords: [],
  decisionStats: { proposed: 0, approved: 0 },
  roadmapFramework: { name: 'RICE' }
};

const p21Stub = {
  docPath: 'docs/HIRING_ARCHITECTURE.md',
  nextRecommendedHire: { roleId: 'ops-lead' },
  executiveSummary: [],
  hireSequence: [],
  roles: [
    {
      title: 'Ops Lead',
      urgencyScore: 3,
      reportsTo: 'CEO',
      why: 'Scale ops',
      when: { hireTrigger: 'Q3' },
      kpis: [],
      first90Days: [{ day: 30, goal: 'Onboard' }]
    }
  ],
  scalableTeamDesign: { squads: [] }
};

test('TR-2c-2a P18 startup operating view chrome uses Turkish labels', () => {
  const html = renderStartupOperatingCenter(p18Stub, esc);
  const required = [
    'P18 Startup operasyon modu',
    'Oyun planı',
    'Ölçek aşaması:',
    'hazırlık',
    'Yönetici sorumlulukları (6 rol)',
    'Ölçek sütunları',
    'Darboğaz kaydı (sıralı)',
    'Karar ritmi',
    'Hızlı kazanımlar',
    'Şiddet',
    'Azaltma',
    'Fazlar:',
    'Yol haritaları:'
  ];
  for (const label of required) {
    assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const forbidden = [
    'P18 Startup Operating Mode',
    'Executive accountability',
    'Scale pillars',
    'Bottleneck registry',
    'Decision cadence',
    'Quick wins',
    '>Playbook<',
    'Scale stage:'
  ];
  for (const label of forbidden) {
    assert.doesNotMatch(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('TR-2c-2a P19 scale architecture view chrome uses Turkish labels', () => {
  const html = renderScaleArchitectureCenter(p19Stub, esc);
  const required = [
    'P19 Ölçek mimarisi',
    'Uygulama oyun planı',
    'Teknik ölçek güveni',
    'Senaryo bazlı güven',
    'Hacim tahminleri (planlama)',
    'Mevcut koruma limitleri (repo)',
    'Boyut matrisi',
    'Kademe',
    'Olay/ay',
    'AI çağrı/ay',
    'Lifecycle e-posta/ay',
    'Analitik kuyruk',
    '10K MAU'
  ];
  for (const label of required) {
    assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const forbidden = [
    'P19 Scale Architecture',
    'Technical scale confidence',
    'Confidence by scenario',
    'Volume estimates',
    'Current guardrails',
    'Dimension matrix',
    'Execution playbook',
    '>Tier<',
    'Events/mo'
  ];
  for (const label of forbidden) {
    assert.doesNotMatch(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('TR-2c-2a P20 company operating view chrome uses Turkish labels', () => {
  const html = renderCompanyOperatingSystem(p20Stub, esc);
  const required = [
    'P20 Şirket işletim sistemi',
    'Oyun planı',
    'Karar şablonu',
    'Kurucu bağımsızlığı:',
    'Bağımsızlık kontrolleri',
    'Haftalık KPI skor kartı',
    'İnceleme ritimleri',
    'Yol haritası — şimdi (RICE)',
    'Karar günlüğü',
    'Depolama:',
    'önerilen',
    'onaylı'
  ];
  for (const label of required) {
    assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const forbidden = [
    'P20 Company OS',
    'Founder-independence',
    'Independence checks',
    'Weekly KPI scorecard',
    'Review cadences',
    'Roadmap now',
    'Decision log',
    'Decision template',
    'Storage:',
    ' proposed ·',
    ' approved'
  ];
  for (const label of forbidden) {
    assert.doesNotMatch(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('TR-2c-2a P21 hiring architecture view chrome uses Turkish labels', () => {
  const html = renderHiringArchitectureCenter(p21Stub, esc);
  const required = [
    'P21 İşe alım mimarisi',
    'Oyun planı',
    'Sıradaki işe alım:',
    'İşe alım sırası',
    'Ekipler',
    'Kuzey yıldızı',
    'Roller (8)',
    'bağlı olduğu',
    'Neden:',
    'Ne zaman:',
    'İlk 90 gün'
  ];
  for (const label of required) {
    assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const forbidden = [
    'P21 Hiring Architecture',
    'Next hire',
    'Hire sequence',
    'Squads (scalable team design)',
    'North-star',
    'reports to',
    ' urgency ',
    '>Playbook<'
  ];
  for (const label of forbidden) {
    assert.doesNotMatch(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('TR-2c-2a strategy view renders preserve executiveSummary passthrough for TR-2c-3', () => {
  const summaryLine = 'Dynamic executive summary line from center builder';
  const p18Html = renderStartupOperatingCenter({ ...p18Stub, executiveSummary: [summaryLine] }, esc);
  assert.match(p18Html, new RegExp(summaryLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
