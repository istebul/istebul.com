import test from 'node:test';
import assert from 'node:assert/strict';
import { renderStartupOperatingCenter } from '../../js/features/ops/startup-operating-views.js';
import { renderScaleArchitectureCenter } from '../../js/features/ops/scale-architecture-views.js';
import { renderCompanyOperatingSystem } from '../../js/features/ops/company-operating-views.js';
import { renderHiringArchitectureCenter } from '../../js/features/ops/hiring-architecture-views.js';
import { renderInternationalExpansionCenter } from '../../js/features/ops/international-expansion-views.js';
import { renderCategoryDominanceCenter } from '../../js/features/ops/category-dominance-views.js';
import { renderCompetitorAttackCenter } from '../../js/features/ops/competitor-attack-views.js';
import { renderExpansionPrioritizationCenter } from '../../js/features/ops/expansion-roadmap-prioritization-views.js';
import { renderStrategicPartnershipCenter } from '../../js/features/ops/strategic-partnership-views.js';

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

const p22Stub = {
  docPath: 'docs/INTERNATIONAL_EXPANSION.md',
  globalReadinessPct: 55,
  baselineMarket: { name: 'Turkey', status: 'live' },
  executiveSummary: [],
  dimensions: [],
  priorityMarkets: [],
  domainStrategy: {},
  roadmapPhases: []
};

const p23Stub = {
  docPath: 'docs/CATEGORY_DOMINANCE.md',
  categoryOwnershipPct: 50,
  avgMoatStrengthPct: 42,
  categoryDefinition: {},
  executiveSummary: [],
  moatPlans: [],
  competitorLandscape: [],
  dominancePhases: [],
  flywheel: { steps: [] }
};

const p24Stub = {
  docPath: 'docs/COMPETITOR_ATTACK.md',
  defenseReadinessPct: 48,
  avgDefensePillarPct: 40,
  strategicThesis: 'Dynamic thesis from model',
  executiveSummary: [],
  attackScenarios: [],
  defensePlans: [],
  warGameMatrix: [],
  responsePlaybook: []
};

const p25Stub = {
  docPath: 'docs/EXPANSION_PRIORITIZATION.md',
  firstCategory: {},
  verdict: {},
  beachhead: {},
  executiveSummary: [],
  prioritizationCriteria: [],
  categories: [],
  recommendedSequence: []
};

const p26Stub = {
  docPath: 'docs/STRATEGIC_PARTNERSHIPS.md',
  accelerationVerdict: { wave1Focus: [] },
  mission: 'Dynamic mission from model',
  executiveSummary: [],
  partnerTypes: [],
  roadmapPhases: [],
  scoringDimensions: []
};

test('TR-2c-2b P22 international expansion view chrome uses Turkish labels', () => {
  const html = renderInternationalExpansionCenter(p22Stub, esc);
  const required = [
    'P22 Uluslararası genişleme',
    'Denetim oyun planı',
    'Küresel hazırlık:',
    'temel',
    '10 sütun (Türkiye sonrası)',
    'Öncelikli genişleme pazarları',
    'Alan adı stratejisi',
    'Faz 1:',
    'Yol haritası fazları',
    '>Sütun<',
    '>Durum<',
    '>Skor<',
    '>Boşluk<',
    '>Hızlı kazanım<',
    '>Ülke<',
    '>Yerel ayar<',
    '>Dalga<',
    '>Gerekçe<'
  ];
  for (const label of required) {
    assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const forbidden = [
    'P22 International Expansion',
    'Audit playbook',
    'Global readiness:',
    'baseline ',
    '10 pillars (post-Turkey)',
    'Priority expansion markets',
    'Domain strategy',
    'Phase 1:',
    'Roadmap phases',
    '>Pillar<',
    '>Quick win<',
    '>Country<',
    '>Locale<',
    '>Wave<',
    '>Rationale<'
  ];
  for (const label of forbidden) {
    assert.doesNotMatch(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('TR-2c-2b P23 category dominance view chrome uses Turkish labels', () => {
  const html = renderCategoryDominanceCenter(p23Stub, esc);
  const required = [
    'P23 Kategori hakimiyeti',
    'Strateji oyun planı',
    'Kategori sahipliği:',
    'ort. hendek',
    'Rakip ortamı',
    'Altı hendek planı',
    'Hakimiyet fazları',
    'Uç değirmen:',
    '>Rakip<',
    '>Arketip<',
    '>Tehdit<',
    '>Kama<',
    '>isteBul karşı hamle<',
    '>Hendek<',
    '>Öncelikli hamle<',
    '>Engel<'
  ];
  for (const label of required) {
    assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const forbidden = [
    'P23 Category Dominance',
    'Strategy playbook',
    'Category ownership:',
    'avg moat',
    'Competitor landscape',
    'Six moat plans',
    'Dominance phases',
    'Flywheel:',
    '>Competitor<',
    '>Archetype<',
    '>Threat<',
    '>Wedge<',
    '>isteBul counter<',
    '>Moat<',
    '>Lead play<',
    '>Blocker<'
  ];
  for (const label of forbidden) {
    assert.doesNotMatch(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('TR-2c-2b P24 competitor attack view chrome uses Turkish labels', () => {
  const html = renderCompetitorAttackCenter(p24Stub, esc);
  const required = [
    'P24 Rakip saldırısı',
    'Savunma oyun planı',
    'Savunma hazırlığı:',
    'ort. sütun',
    'Saldırı senaryoları (büyük oyuncular kopyası)',
    'Savunma planı (6 sütun)',
    'Savaş oyunu matrisi',
    'Yanıt oyun planı',
    '>Senaryo<',
    '>Olasılık<',
    '>Kopya derinliği<',
    '>Öncelikli savunma<',
    '>Karşı hamle<',
    '>Yapılmaması gereken<'
  ];
  for (const label of required) {
    assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const forbidden = [
    'P24 Competitor Attack',
    'Defense playbook',
    'Defense readiness:',
    'avg pillar',
    'Attack scenarios (big players copy)',
    'Defense plan (6 pillars)',
    'War-game matrix',
    'Response playbook',
    '>Scenario<',
    '>Likelihood<',
    '>Copy depth<',
    '>Lead defense<',
    '>Counter<',
    '>Do not<'
  ];
  for (const label of forbidden) {
    assert.doesNotMatch(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('TR-2c-2b P25 expansion prioritization view chrome uses Turkish labels', () => {
  const html = renderExpansionPrioritizationCenter(p25Stub, esc);
  const required = [
    'P25 Genişleme önceliklendirme',
    'Tam yol haritası',
    'Önceliklendirme kriterleri',
    'Yedi kategori (puanlı)',
    'Önerilen sıra',
    '>Kriter<',
    '>Ağırlık<',
    '>Açıklama<',
    '>Kategori<',
    '>Dalga<',
    '>Bileşik<',
    '>Gelir<',
    '>Veri<',
    '>Neden<'
  ];
  for (const label of required) {
    assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const forbidden = [
    'P25 Expansion prioritization',
    'Full roadmap',
    'Prioritization criteria',
    'Seven categories (scored)',
    'Recommended sequence',
    '>Criterion<',
    '>Weight<',
    '>Description<',
    '>Category<',
    '>Wave<',
    '>Composite<',
    '>Mon.<',
    '>Why<'
  ];
  for (const label of forbidden) {
    assert.doesNotMatch(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('TR-2c-2b P26 strategic partnership view chrome uses Turkish labels', () => {
  const html = renderStrategicPartnershipCenter(p26Stub, esc);
  const required = [
    'P26 Stratejik ortaklıklar',
    'BD oyun planı',
    'Hızlandırma: Dalga 1 =',
    'Puanlama boyutları',
    'Yedi ortak türü',
    'Yol haritası fazları',
    '>Boyut<',
    '>Ağırlık<',
    '>Tür<',
    '>Olgunluk<',
    '>Skor<',
    '>Şerit<',
    '>Gelirleştirme<',
    '>Dağıtım<'
  ];
  for (const label of required) {
    assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const forbidden = [
    'P26 Strategic Partnerships',
    'BD playbook',
    'Acceleration: Wave 1 =',
    'Scoring dimensions',
    'Seven partner types',
    'Roadmap phases',
    '>Dimension<',
    '>Type<',
    '>Maturity<',
    '>Score<',
    '>Lane<',
    '>Monetization<',
    '>Distribution<'
  ];
  for (const label of forbidden) {
    assert.doesNotMatch(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
