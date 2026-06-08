/**
 * Premium marketing pages — Karar analizi, Metodoloji, Planlar
 */
import { renderStaticPricingFallback } from '../runtime/pricing-static-fallback.js';
import { BRAND_VOICE } from '../core/brand-voice.js';

function spaText(key, fallback = '') {
  const fullKey = `spaPages.${key}`;
  const translated = typeof window !== 'undefined' ? window.__ibI18n?.t(fullKey) : null;
  if (translated && translated !== fullKey) return translated;
  return fallback;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const FAQ_KARAR = [
  {
    q: 'Karar analizi satın alma zorunluluğu getirir mi?',
    a: 'Hayır. isteBul tarafsız bir karar destek aracıdır; sonuçlar bilgilendirme amaçlıdır ve herhangi bir satıcıya bağlı değildir.'
  },
  {
    q: 'Hangi verileri topluyorsunuz?',
    a: 'Yalnızca analiz için gerekli bütçe, kullanım ve tercih alanları. KVKK uyumlu işleme; veri satışı yapılmaz.'
  },
  {
    q: 'Kredi ve toplam maliyet nasıl hesaplanır?',
    a: 'Standart TCO çerçevesi: satın alma, finansman, sigorta, yakıt/bakım ve 12 aylık toplam yük tek modelde birleştirilir.'
  },
  {
    q: 'Pro plana geçmeden analiz yapabilir miyim?',
    a: 'Evet. Başlangıç planı ücretsizdir; gelişmiş rapor ve sınırsız karşılaştırma Pro ile açılır.'
  }
];

export class PremiumPages {
  constructor() {
    this._mounted = new Set();
  }

  mount(pageId, app) {
    if (this._mounted.has(pageId)) {
      this._afterMount(pageId, app);
      return;
    }

    const root = document.getElementById(`premium-${pageId}-root`);
    if (!root) return;

    if (pageId === 'karar-analizi') {
      root.innerHTML = this.renderKararAnaliziPage();
    } else if (pageId === 'metodoloji') {
      root.innerHTML = this.renderMetodolojiPage();
    } else if (pageId === 'planlar') {
      root.innerHTML = this.renderPlanlarShell();
    }

    this._bindFaq(root);
    this._stripPrerender(pageId);
    this._mounted.add(pageId);
    document.body.classList.add('ib-premium-mounted');
    this._afterMount(pageId, app);
    app?.ui?.loadIcons?.();
  }

  _afterMount(pageId, app) {
    if (pageId === 'karar-analizi') {
      app?.renderDecisionAssistant?.();
    }
    if (pageId === 'planlar') {
      app?.renderPricingSection?.();
    }
  }

  _stripPrerender(pageId) {
    const section = document.getElementById(`page-${pageId}`);
    section?.querySelectorAll('.ib-prerender-seo').forEach((node) => node.remove());
  }

  _bindFaq(root) {
    root.querySelectorAll('[data-faq-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('[data-faq-item]');
        const open = item?.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        const panel = item?.querySelector('.ib-faq-panel');
        if (panel) panel.hidden = !open;
      });
    });
  }

  renderKararAnaliziPage() {
    const faqHtml = FAQ_KARAR.map(
      (item, i) => `
      <article class="ib-faq-item" data-faq-item>
        <button type="button" class="ib-faq-trigger" data-faq-toggle aria-expanded="false" aria-controls="faq-karar-${i}">
          <span>${escapeHtml(item.q)}</span>
          <i data-lucide="chevron-down" aria-hidden="true"></i>
        </button>
        <div class="ib-faq-panel" id="faq-karar-${i}">
          <p>${escapeHtml(item.a)}</p>
        </div>
      </article>`
    ).join('');

    return `
    <div class="ib-premium-page-inner">
      <header class="ib-premium-hero ib-premium-hero--analysis">
        <div class="container ib-premium-hero-grid">
          <div class="ib-premium-hero-copy">
            <span class="ib-premium-eyebrow"><i data-lucide="sparkles"></i> Karar merkezi</span>
            <h1>Hangi kategoride karar vermek istiyorsunuz?</h1>
            <p class="ib-premium-lead">Araba, konut, tatil, finansman, sigorta ve kasko kararlarında skor, TCO, risk ve uygunluk sinyallerini tek merkezden başlatın.</p>
            <div class="ib-premium-hero-actions">
              <a href="#premium-assistant" class="btn btn-primary btn-lg" data-analytics-cta="cta_decision_hub" data-analytics-placement="premium_hero" title="Kategori seçerek karar akışını başlatın">
                <i data-lucide="layout-grid"></i> Kategori seçin
              </a>
              <a href="/metodoloji" class="btn btn-outline btn-lg" data-native-route>
                <i data-lucide="microscope"></i> ${BRAND_VOICE.cta.methodology}
              </a>
            </div>
            <ul class="ib-premium-hero-stats" aria-label="Platform metrikleri">
              <li><strong>6</strong><span>Kategori</span></li>
              <li><strong>12 ay</strong><span>TCO görünümü</span></li>
              <li><strong>Kural</strong><span>Tabanlı skor</span></li>
            </ul>
          </div>
          <div class="ib-premium-hero-visual" aria-hidden="true">
            <div class="ib-score-card">
              <span class="ib-sample-scenario-label">Örnek senaryo</span>
              <span class="ib-score-kicker">Örnek uyum skoru</span>
              <div class="ib-score-ring" style="--score:78" aria-hidden="true">
                <strong>78</strong>
                <small>/ 100</small>
              </div>
              <p class="ib-premium-note">Gösterim amaçlıdır; canlı analizde skor girdilerinize göre hesaplanır — kesin sonuç değildir.</p>
              <p>Hybrid SUV · aile kullanımı · örnek kredi senaryosu</p>
              <div class="ib-score-bars">
                <div><span>Maliyet</span><em style="width:72%"></em></div>
                <div><span>Finansman</span><em style="width:64%"></em></div>
                <div><span>Güven</span><em style="width:81%"></em></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="ib-premium-trust-strip" role="complementary">
        <div class="container ib-premium-trust-strip-inner">
          <span><i data-lucide="shield-check"></i> ${escapeHtml(spaText('premiumKarar.trustKvkk', 'KVKK uyumlu'))}</span>
          <span><i data-lucide="lock"></i> ${escapeHtml(spaText('premiumKarar.trustTls', 'TLS şifreleme'))}</span>
          <span><i data-lucide="eye"></i> ${escapeHtml(spaText('premiumKarar.trustScoring', 'Açık skorlama'))}</span>
          <span><i data-lucide="ban"></i> ${escapeHtml(spaText('premiumKarar.trustNoPressure', 'Satıcı baskısı yok'))}</span>
        </div>
      </div>

      <section id="premium-assistant" class="ib-premium-block ib-premium-assistant" aria-label="Karar asistanı">
        <div class="container">
          <div class="ib-premium-block-head">
            <span class="section-kicker">${BRAND_VOICE.kickers.preview}</span>
            <h2>${escapeHtml(spaText('premiumKarar.previewTitle', 'Karar önizlemesi'))}</h2>
            <p>${escapeHtml(spaText('premiumKarar.previewLead', 'Kısa sorularla maliyet sinyallerini görün. Tam TCO analizi ve sıralama için Auto akışını kullanın.'))}</p>
          </div>
          <div class="assistant-section ib-premium-assistant-shell">
            <div class="assistant-shell">
              <aside class="assistant-category-rail" id="assistant-category-rail" aria-label="Karar kategorileri"></aside>
              <div class="assistant-workspace">
                <div class="assistant-progress" id="assistant-progress"></div>
                <form id="decision-assistant-form" class="assistant-form">
                  <div id="assistant-questions"></div>
                  <div class="assistant-actions"></div>
                </form>
                <div id="assistant-results" class="assistant-results" aria-live="polite"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="ib-premium-block ib-premium-steps ib-premium-steps--compact" aria-label="Süreç">
        <div class="container">
          <p class="text-muted-sm" style="margin:0">Detaylı süreç anasayfada ve <a href="/metodoloji" data-native-route>metodoloji</a> sayfasında. Burada canlı analize geçin.</p>
        </div>
      </section>

      <section class="ib-premium-block ib-premium-compare-preview" aria-label="Karşılaştırma önizlemesi">
        <div class="container">
          <div class="ib-premium-block-head">
            <span class="section-kicker">Karşılaştırma</span>
            <h2>${escapeHtml(spaText('premiumKarar.compareTitle', 'İki seçeneği yan yana görün'))}</h2>
            <p>${escapeHtml(spaText('premiumKarar.compareLead', 'Pro ile 4 modele kadar detaylı karşılaştırma; ücretsiz planda 2 model.'))}</p>
          </div>
          <div class="ib-compare-table-wrap">
            <p class="ib-sample-scenario-label ib-sample-scenario-label--block">Örnek senaryo — canlı analizde değerler girdilerinize göre hesaplanır</p>
            <table class="ib-compare-table">
              <thead>
                <tr>
                  <th>Kriter</th>
                  <th>Model A</th>
                  <th>Model B</th>
                  <th>Fark</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>12 ay TCO</td><td>₺412.000</td><td>₺389.000</td><td class="ib-compare-win">−₺23.000</td></tr>
                <tr><td>Aylık kredi yükü</td><td>₺18.400</td><td>₺17.100</td><td class="ib-compare-win">−₺1.300</td></tr>
                <tr><td>Uyum skoru (örnek)</td><td>78</td><td>82</td><td class="ib-compare-win">+4</td></tr>
                <tr><td>Veri güven bandı (örnek)</td><td>Orta–yüksek</td><td>Orta–yüksek</td><td>—</td></tr>
              </tbody>
            </table>
          </div>
          <p class="ib-premium-note">Örnek veriler gösterim amaçlıdır; canlı analizde gerçek girdilerinize göre hesaplanır.</p>
        </div>
      </section>

      <section class="ib-premium-block ib-premium-faq" aria-label="Sık sorulan sorular">
        <div class="container ib-premium-faq-grid">
          <div class="ib-premium-block-head">
            <span class="section-kicker">SSS</span>
            <h2>Sık sorulan sorular</h2>
          </div>
          <div class="ib-faq-list">${faqHtml}</div>
        </div>
      </section>

      <section class="ib-premium-cta-band" aria-label="Sonraki adım">
        <div class="container ib-premium-cta-band-inner">
          <div>
            <h2>Yanlış araç seçme riskini azaltın</h2>
            <p>Önce ücretsiz TCO analizi; ihtiyaç duyduğunuzda Pro ile derin rapor ve karşılaştırma. Taahhüt yok.</p>
          </div>
          <div class="ib-premium-hero-actions">
            <a href="/auto/" class="btn btn-primary btn-lg" data-native-route data-analytics-cta="cta_primary_auto" data-analytics-placement="premium_footer" title="${BRAND_VOICE.cta.primaryAutoLong}">${BRAND_VOICE.cta.primaryAuto}</a>
            <a href="/planlar" class="btn btn-outline btn-lg" data-native-route data-analytics-cta="cta_secondary_plans" data-analytics-placement="premium_footer">${BRAND_VOICE.cta.plans}</a>
          </div>
        </div>
      </section>
    </div>`;
  }

  renderMetodolojiPage() {
    return `
    <div class="ib-premium-page-inner">
      <header class="ib-premium-hero ib-premium-hero--method">
        <div class="container">
          <span class="ib-premium-eyebrow"><i data-lucide="microscope"></i> Metodoloji</span>
          <h1>Karar altyapısı metodolojisi</h1>
          <p class="ib-premium-lead">isteBul ilan sitesi, sohbet botu veya yalnızca oran karşılaştırması değildir. Maliyet, finansman, kullanım ve risk sinyalleri açık kurallarla birleşir; AI skoru değiştirmez — gerekçeyi anlatır.</p>
        </div>
      </header>

      <section class="ib-premium-block">
        <div class="container ib-premium-split">
          <div>
            <span class="section-kicker">Çerçeve</span>
            <h2>Karar modeli</h2>
            <p>Dört katmanlı çerçeve: <strong>ihtiyaç uyumu</strong>, <strong>toplam maliyet</strong>, <strong>finansman etkisi</strong> ve <strong>risk/güven</strong>. Her katman 0–100 normalize edilir; ağırlıklar kategori bazında tanımlıdır.</p>
            <ul class="ib-check-list">
              <li>Tek satıcıya bağlı olmayan tarafsız skor</li>
              <li>12 aylık TCO ve kredi senaryoları</li>
              <li>Kullanıcı önceliklerine göre yeniden ağırlıklandırma</li>
            </ul>
          </div>
          <div class="ib-framework-diagram" aria-label="Karar çerçevesi diyagramı">
            <div class="ib-arch-node ib-arch-node--center">Uyum skoru</div>
            <div class="ib-arch-row">
              <div class="ib-arch-node">İhtiyaç</div>
              <div class="ib-arch-node">TCO</div>
              <div class="ib-arch-node">Finansman</div>
              <div class="ib-arch-node">Risk</div>
            </div>
            <div class="ib-arch-caption">Girdiler → normalizasyon → ağırlıklı birleşim → güven aralığı</div>
          </div>
        </div>
      </section>

      <section class="ib-premium-block section-bg">
        <div class="container">
          <span class="section-kicker">Skorlama</span>
          <h2>Skorlama metodolojisi</h2>
          <div class="ib-method-grid">
            <article class="ib-method-card">
              <i data-lucide="sliders-horizontal"></i>
              <h3>Normalizasyon</h3>
              <p>Bütçe ve segment içinde min-max ölçekleme; aykırı değerler kırpılır.</p>
            </article>
            <article class="ib-method-card">
              <i data-lucide="layers"></i>
              <h3>Ağırlıklandırma</h3>
              <p>Araç, konut, tatil ve finansman için özelleştirilmiş ağırlık vektörleri; sigorta ve kasko erken erişimde.</p>
            </article>
            <article class="ib-method-card">
              <i data-lucide="git-compare"></i>
              <h3>Karşılaştırma</h3>
              <p>İkili ve çoklu alternatiflerde fark ve kazanan sinyali.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="ib-premium-block">
        <div class="container ib-premium-split">
          <div>
            <span class="section-kicker">AI şeffaflığı</span>
            <h2>AI yorum katmanı (şeffaf)</h2>
            <p>Özet metinler, hesaplanmış skor ve maliyet kartlarından türetilir. AI fiyatı veya sıralamayı değiştirmez; yalnızca gerekçeyi okunur kılar.</p>
            <ul class="ib-check-list">
              <li>Öne çıkan maliyet ve uyum kriterleri listelenir</li>
              <li>Güçlü / zayıf yönler ayrı gösterilir</li>
              <li>Belirsizlik ve uyarılar işaretlenir — bağlayıcı teklif değildir</li>
            </ul>
          </div>
          <div class="ib-confidence-panel">
            <h3>Veri güven bandı <span class="ib-illustrative-label">(örnek senaryo)</span></h3>
            <p class="ib-premium-note ib-premium-note--tight">Güven bandı, girdi kalitesi ve belirsizlik seviyesini gösterir — satın alma garantisi veya kesin doğruluk iddiası değildir.</p>
            <div class="ib-confidence-row">
              <span>Yüksek veri güven bandı (örnek)</span>
              <div class="ib-confidence-bar ib-confidence-bar--high" aria-hidden="true"><em style="width:88%"></em></div>
            </div>
            <div class="ib-confidence-row">
              <span>Orta veri güven bandı (örnek)</span>
              <div class="ib-confidence-bar" aria-hidden="true"><em style="width:62%"></em></div>
            </div>
            <p class="ib-premium-note">Canlı analizde bant; veri tamlığı, segment örneklemesi ve finansman belirsizliğine göre hesaplanır. Yukarıdaki çubuklar yalnızca arayüz örneğidir.</p>
          </div>
        </div>
      </section>

      <section class="ib-premium-block ib-premium-risk">
        <div class="container">
          <span class="section-kicker">Risk</span>
          <h2>Risk açıklaması</h2>
          <div class="ib-risk-grid">
            <article><h3>Piyasa oynaklığı</h3><p>İkinci el değerleri bölgesel verilere dayanır; ani piyasa şokları modele yansımayabilir.</p></article>
            <article><h3>Finansman varsayımları</h3><p>Faiz ve vade kullanıcı girdisine bağlıdır; banka teklifleri değişebilir.</p></article>
            <article><h3>Karar sorumluluğu</h3><p>isteBul bilgilendirme sağlar; nihai satın alma kararı kullanıcıya aittir.</p></article>
          </div>
        </div>
      </section>

      <section class="ib-premium-block">
        <div class="container">
          <span class="section-kicker">Mimari</span>
          <h2>Platform mimarisi</h2>
          <div class="ib-architecture" role="img" aria-label="Edge istemci, API, karar motoru ve veri katmanı">
            <div class="ib-arch-layer"><span>Cloudflare Edge</span><small>Statik SPA · düşük gecikme</small></div>
            <div class="ib-arch-arrow" aria-hidden="true">↓</div>
            <div class="ib-arch-layer"><span>Karar API</span><small>Auth · rate limit · audit log</small></div>
            <div class="ib-arch-arrow" aria-hidden="true">↓</div>
            <div class="ib-arch-layer ib-arch-layer--dual">
              <div><span>Skor motoru</span><small>Deterministik TCO + ağırlık</small></div>
              <div><span>AI yorum</span><small>Şeffaf özet katmanı</small></div>
            </div>
            <div class="ib-arch-arrow" aria-hidden="true">↓</div>
            <div class="ib-arch-layer"><span>Veri &amp; ödeme</span><small>Supabase · iyzico · PayTR</small></div>
          </div>
        </div>
      </section>

      <section class="ib-premium-trust-panel">
        <div class="container">
          <h2>Güven deneyimi</h2>
          <div class="ib-trust-pillars">
            <div><i data-lucide="file-check"></i><strong>Denetlenebilir</strong><p>Metodoloji dokümante</p></div>
            <div><i data-lucide="user-check"></i><strong>Kullanıcı kontrolü</strong><p>Veri minimizasyonu</p></div>
            <div><i data-lucide="badge-check"></i><strong>Kurumsal hazır</strong><p>Enterprise SLA</p></div>
          </div>
          <a href="/auto/" class="btn btn-primary" data-native-route data-analytics-cta="cta_primary_auto" data-analytics-placement="metodoloji_trust">TCO analizini başlat</a>
        </div>
      </section>
    </div>`;
  }

  renderPlanlarShell() {
    return `
    <div class="ib-premium-page-inner">
      <header class="ib-premium-hero ib-premium-hero--pricing">
        <div class="container">
          <span class="ib-premium-eyebrow"><i data-lucide="credit-card"></i> Planlar</span>
          <h1>Karar altyapısı erişimi</h1>
          <p class="ib-premium-lead">Ücretsiz TCO ile başlayın — toplam sahip olma maliyetine göre karar verin. Pro, derin karşılaştırma ve rapor; chat veya ilan aboneliği değil, şeffaf fiyatlandırma.</p>
        </div>
      </header>

      <section class="ib-premium-block ib-premium-block--pricing">
        <div class="container container--pricing">
          <div id="premium-pricing-plans-root" class="ib-premium-pricing-root">
            ${renderStaticPricingFallback()}
          </div>
        </div>
      </section>

      <section class="ib-premium-trust-panel ib-premium-trust-panel--pricing" aria-label="Ödeme güvencesi">
        <div class="container">
          <ul class="ib-pricing-trust-chips">
            <li><i data-lucide="shield"></i><span><strong>iyzico · PayTR</strong> — kart bilgileri sunucularımızda tutulmaz</span></li>
            <li><i data-lucide="rotate-ccw"></i><span><strong>İptal</strong> — panelden istediğiniz zaman</span></li>
            <li><i data-lucide="gift"></i><span><strong>7 gün deneme</strong> — ilk Pro aboneliğinde</span></li>
          </ul>
        </div>
      </section>

      <section class="ib-premium-cta-band">
        <div class="container ib-premium-cta-band-inner">
          <div>
            <h2>Hâlâ kararsız mısınız?</h2>
            <p>Önce toplam maliyeti görün; Pro ile karşılaştırmayı derinleştirin.</p>
          </div>
          <a href="/auto/" class="btn btn-primary btn-lg" data-native-route data-analytics-cta="cta_primary_auto" data-analytics-placement="planlar_footer">TCO analizini başlat</a>
        </div>
      </section>
    </div>`;
  }
}

export const premiumPages = new PremiumPages();
