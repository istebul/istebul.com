import test from 'node:test';
import assert from 'node:assert/strict';

const {
  renderKararMahkemesiBetaHtml,
  mountKararMahkemesiBeta,
  KARAR_MAHKEMESI_BETA_DISCLAIMER
} = await import('../../js/features/karar-mahkemesi/karar-mahkemesi-card.js');
const {
  buildKararMahkemesiModel,
  containsForbiddenKararPhrase,
  KARAR_MAHKEMESI_FORBIDDEN_PHRASES
} = await import('../../js/features/karar-mahkemesi/karar-mahkemesi-engine.js');

function baseForm() {
  return {
    budget: 1_500_000,
    usage: 'city',
    body: 'sedan',
    fuel: 'hybrid',
    km: 15_000,
    loan: 'hayir'
  };
}

function baseIntel() {
  return {
    decisionScore: 70,
    confidenceScore: 72,
    recommendationLevel: 'proceed',
    overallRisk: 'Orta',
    riskAnalysis: [{ level: 'orta', title: 'TCO' }],
    warnings: [],
    scoreFactors: [{ label: 'TCO', impact: '+4', reason: '12 ay TCO bütçe ile dengeli modelleniyor.' }]
  };
}

function baseTop() {
  return {
    score: 74,
    costs: { ownership: { totals: { months12: 1_350_000 } } },
    risks: ['Finansman koşulları teklif aşamasında netleşmeli.']
  };
}

function sampleModel(overrides = {}) {
  return buildKararMahkemesiModel({
    intel: baseIntel(),
    formData: baseForm(),
    topResult: baseTop(),
    ...overrides
  });
}

function assertNoForbiddenPhrases(text) {
  for (const phrase of KARAR_MAHKEMESI_FORBIDDEN_PHRASES) {
    assert.equal(containsForbiddenKararPhrase(text), false, `forbidden phrase: ${phrase}`);
    assert.ok(
      !String(text).toLocaleLowerCase('tr-TR').includes(phrase),
      `text contains forbidden phrase: ${phrase}`
    );
  }
}

function createMountNode() {
  return {
    innerHTML: '',
    insertAdjacentHTML(position, html) {
      if (position === 'beforeend') {
        this.innerHTML += html;
        return;
      }
      this.innerHTML = html;
    }
  };
}

test('renderKararMahkemesiBetaHtml includes data-karar-mahkemesi-beta wrapper', () => {
  const html = renderKararMahkemesiBetaHtml(sampleModel());
  assert.match(html, /data-karar-mahkemesi-beta/);
  assert.match(html, /class="karar-mahkemesi-beta"/);
});

test('renderKararMahkemesiBetaHtml shows title, subtitle, score, action and disclaimer', () => {
  const model = sampleModel();
  const html = renderKararMahkemesiBetaHtml(model);

  assert.match(html, /Karar Mahkemesi Beta/);
  assert.match(html, /Pişmanlık Önleme Analizi/);
  assert.match(html, /Bekleme Skoru/);
  assert.match(html, new RegExp(`${model.beklemeSkoru}/100`));
  assert.match(html, new RegExp(escapeRegex(model.aksiyonEtiketi)));
  assert.match(html, /Bu analiz bilgilendirme amaçlıdır; nihai karar kullanıcıya aittir\./);
  assert.match(html, /data-karar-mahkemesi-disclaimer/);
});

test('renderKararMahkemesiBetaHtml renders gerekceler list', () => {
  const model = sampleModel();
  const html = renderKararMahkemesiBetaHtml(model);

  assert.match(html, /karar-mahkemesi-beta__gerekceler/);
  for (const item of model.gerekceler) {
    assert.match(html, new RegExp(escapeRegex(item)));
  }
});

test('renderKararMahkemesiBetaHtml escapes dynamic text and blocks script injection', () => {
  const malicious = `"><script>alert(1)</script><img src=x onerror=alert(1)>`;
  const model = sampleModel();
  model.gerekceler = [malicious, 'Güvenli metin'];
  model.aksiyonEtiketi = malicious;

  const html = renderKararMahkemesiBetaHtml(model);

  assert.ok(!/<script[\s>]/i.test(html), 'script tag must not appear unescaped');
  assert.ok(!/<img[^>]*onerror\s*=/i.test(html), 'event handler must not appear in markup');
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /onerror=alert\(1\)/);
});

test('renderKararMahkemesiBetaHtml avoids forbidden phrases', () => {
  const html = renderKararMahkemesiBetaHtml(sampleModel());
  assertNoForbiddenPhrases(html);
});

test('mountKararMahkemesiBeta returns false when mountNode is missing', () => {
  assert.equal(
    mountKararMahkemesiBeta({
      mountNode: null,
      intel: baseIntel(),
      formData: baseForm(),
      topResult: baseTop()
    }),
    false
  );
});

test('mountKararMahkemesiBeta returns true and writes HTML for valid mountNode', () => {
  const mountNode = createMountNode();
  const ok = mountKararMahkemesiBeta({
    mountNode,
    intel: baseIntel(),
    formData: baseForm(),
    topResult: baseTop()
  });

  assert.equal(ok, true);
  assert.match(mountNode.innerHTML, /data-karar-mahkemesi-beta/);
  assert.match(mountNode.innerHTML, /Karar Mahkemesi Beta/);
  assert.ok(mountNode.innerHTML.includes(KARAR_MAHKEMESI_BETA_DISCLAIMER));
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
