import { recommendVehicles } from './auto-ai.js';
import { getVehicleCatalog } from './auto-catalog.js?v=truth3';
import { getDealerOffers } from './auto-offers.js?v=offers2';

const formatter = new Intl.NumberFormat('tr-TR');

function getBestFinanceOffer(financeOffers, budget) {
  if (!Array.isArray(financeOffers) || !financeOffers.length) return null;

  const eligible = financeOffers.filter((offer) => {
    const min = Number(offer.min_amount || 0);
    const max = Number(offer.max_amount || 999999999);
    return budget >= min && budget <= max;
  });

  return (eligible.length ? eligible : financeOffers)[0];
}


const autoRuntimeConfig = {
  whatsappPhone: '905456786420'
};

async function loadAutoRuntimeConfig() {
  const supabaseUrl = window.__env?.SUPABASE_URL;
  const supabaseKey = window.__env?.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/site_settings?select=key,value&key=in.(auto_whatsapp_phone)`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) return;

    const rows = await response.json();
    const phoneSetting = rows.find(row => row.key === 'auto_whatsapp_phone')?.value;
    const cleanPhone = String(phoneSetting || '').replace(/\D/g, '');

    if (cleanPhone.length >= 10) {
      autoRuntimeConfig.whatsappPhone = cleanPhone;
    }
  } catch {}
}


function safeJsonParse(value, fallback = {}) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}


function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSessionId() {
  let id = sessionStorage.getItem('istebul_auto_session');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('istebul_auto_session', id);
  }
  return id;
}

function shouldTrackUnique(eventName, key = '') {
  const token = `tracked:${eventName}:${key}`;
  if (sessionStorage.getItem(token)) return false;
  sessionStorage.setItem(token, '1');
  return true;
}

function readForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function callAutoIntake(payload) {
  const supabaseUrl = window.__env?.SUPABASE_URL;
  const supabaseKey = window.__env?.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/auto-intake`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Auto intake failed: ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function trackAutoEvent(eventName, metadata = {}) {
  try {
    await callAutoIntake({
      type: 'event',
      event_name: eventName,
      email: localStorage.getItem('istebul_auto_lead_email') || metadata.email || null,
      phone: metadata.phone || null,
      metadata: {
        session_id: getSessionId(),
        ...metadata
      }
    });
  } catch {}
}

function trackUniqueAutoEvent(eventName, metadata = {}, key = '') {
  if (!shouldTrackUnique(eventName, key)) return;
  trackAutoEvent(eventName, metadata);
}

function fuelLabel(fuel) {
  return {
    hybrid: 'Hibrit',
    electric: 'Elektrikli',
    gasoline: 'Benzinli',
    diesel: 'Dizel'
  }[fuel] || fuel;
}

function renderLoading() {
  document.getElementById('auto-results').innerHTML = `
    <div class="ai-loading premium-loading">
      <div class="spinner"></div>
      <p class="kicker">Karar analizi hazırlanıyor</p>
      <h3>İhtiyaç profiliniz ve toplam maliyet etkisi değerlendiriliyor...</h3>
      <p class="loading-copy">Bütçe, kullanım, yakıt tercihi, yıllık kilometre ve finansman durumunuz birlikte değerlendiriliyor.</p>
      <ul class="ai-loading-steps">
        <li>✓ İhtiyaç profiliniz oluşturuluyor</li>
        <li>✓ Uygun araç profili oluşturuluyor</li>
        <li>✓ Toplam sahip olma maliyeti hesaplanıyor</li>
        <li>✓ Finansman ve kullanım riski modelleniyor</li>
        <li>✓ Profilinize en yakın seçenekler hazırlanıyor</li>
      </ul>
    </div>
  `;
}

async function updateLeadInterest(phone, interestType, vehicle = '', options = {}) {
  const email = localStorage.getItem('istebul_auto_lead_email');
  const storedPayload = safeJsonParse(localStorage.getItem('istebul_auto_lead_payload'), {});

  return await callAutoIntake({
    type: 'lead',
    email: email || null,
    phone,
    turnstile_token: options.turnstileToken || '',
    formData: {
      ...storedPayload,
      phone,
      contact_name: options.contactName || '',
      preferred_contact_time: options.preferredContactTime || '',
      interest_type: interestType,
      vehicle
    }
  });
}


const TURNSTILE_SITE_KEY = '0x4AAAAAADRgIOMcaKMMBndc';

async function getTurnstileToken() {
  return new Promise((resolve) => {
    if (!window.turnstile || !TURNSTILE_SITE_KEY) {
      resolve('');
      return;
    }

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    let settled = false;
    const finish = (token = '') => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      container.remove();
      resolve(token || '');
    };

    const timeout = setTimeout(() => finish(''), 6000);

    try {
      const widgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        size: 'invisible',
        callback: (token) => finish(token),
        'error-callback': () => finish(''),
        'timeout-callback': () => finish('')
      });

      window.turnstile.execute(widgetId);
    } catch {
      finish('');
    }
  });
}

function openLeadModal(type, vehicle = '') {
  trackAutoEvent('auto_modal_open', { interest_type: type, vehicle });
  const existing = document.getElementById('lead-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'lead-modal';
  modal.className = 'lead-modal';

  modal.innerHTML = `
    <div class="lead-modal-card">
      <div class="lead-modal-trust">
        <p class="kicker">Uzman değerlendirme</p>
        <h3>Size uygun seçenekleri birlikte değerlendirelim.</h3>
        <p>Analiz sonucunuza göre finansman, sigorta ve satın alma seçeneklerini daha net değerlendirmeniz için uzman ekibimiz sizinle iletişime geçebilir.</p>

        <div class="lead-trust-points">
          <span>✓ En kısa sürede geri dönüş</span>
          <span>✓ Bilgileriniz güvenle işlenir</span>
          <span>✓ Kredi, sigorta ve bayi yönlendirmesi</span>
        </div>
      </div>

      <form id="phone-lead-form">
        <input name="vehicle" type="hidden" value="${escapeHtml(vehicle)}">
        <input name="name" type="text" placeholder="Adınız (opsiyonel)">
        <input name="phone" type="tel" required placeholder="05xx xxx xx xx">
        <select name="best_time">
          <option value="">En iyi aranma zamanı</option>
          <option value="morning">Sabah</option>
          <option value="afternoon">Öğleden sonra</option>
          <option value="evening">Akşam</option>
        </select>
        <button class="btn primary" type="submit">Uzman değerlendirmesi iste</button>
      </form>
      <button class="btn secondary" id="close-lead-modal">Kapat</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('close-lead-modal').onclick = () => modal.remove();

  let leadSubmitting = false;

  document.getElementById('phone-lead-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    if (leadSubmitting) return;
    leadSubmitting = true;

    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Güvenli şekilde kaydediliyor...';
    }

    const leadData = new FormData(event.currentTarget);
    const phone = leadData.get('phone');
    const contactName = leadData.get('name') || '';
    const preferredContactTime = leadData.get('best_time') || '';
    const selectedVehicle = leadData.get('vehicle') || vehicle;
    const turnstileToken = await getTurnstileToken();

    trackAutoEvent('auto_modal_submitted', { phone, interest_type: type, vehicle: selectedVehicle });
    trackAutoEvent('auto_lead_submit', { phone, interest_type: type, vehicle: selectedVehicle });

    try {
      const result = await updateLeadInterest(phone, type, selectedVehicle, {
        turnstileToken,
        contactName,
        preferredContactTime
      });

      if (result?.duplicate) {
        modal.innerHTML = `
          <div class="lead-modal-card">
            <h3>Talebiniz zaten alınmış görünüyor</h3>
            <p>Ekibimiz yakın zamanda sizinle iletişime geçecek. Yeni kayıt oluşturulmadı.</p>
          </div>
        `;
        return;
      }

      modal.innerHTML = `
        <div class="lead-modal-card">
          <h3>Uzman değerlendirme talebiniz alındı</h3>
          <p>Uzman ekibimiz analiz sonucunuza göre uygun seçenekleri değerlendirip sizinle iletişime geçecek.</p>
          <button class="btn primary" id="close-success-lead-modal">Tamam</button>
        </div>
      `;

      document.getElementById('close-success-lead-modal')?.addEventListener('click', () => {
        modal.remove();
      });

      return;
    } catch {
      leadSubmitting = false;

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Uzman değerlendirmesi iste';
      }

      modal.innerHTML = `
        <div class="lead-modal-card">
          <h3>Bağlantı sorunu oluştu</h3>
          <p>Talebiniz kaydedilemedi. Lütfen birkaç saniye sonra tekrar deneyin.</p>
          <button class="btn primary" id="retry-lead-submit">Tekrar dene</button>
        </div>
      `;

      document.getElementById('retry-lead-submit')?.addEventListener('click', () => {
        modal.remove();
        openLeadModal(type, vehicle);
      });
    }
  });
}


async function getAiExplanation(results, formData = {}, refinement = '') {
  try {
    const prompt = [
      'Sen isteBul Auto karar analiz motorusun.',
      'SADECE araç önerisine dair Türkçe uzman değerlendirmesi üret.',
      'Asla soru sorma.',
      'Asla kullanıcıyla sohbet başlatma.',
      'Asla test mesajı üretme.',
      'Satış baskısı yapma.',
      'Kesin finansal vaat verme.',
      '3 kısa cümle yaz.',
      'İlk 3 sonuç: ' + JSON.stringify(
        (results || []).slice(0, 3).map(v => ({
          name: v.name,
          score: v.score,
          confidence: v.confidence,
          totalCost: v.costs?.total,
          reasons: v.reasons,
          risks: v.risks
        }))
      ),
      'Kullanıcı tercihleri: ' + JSON.stringify(formData),
      refinement ? 'Ek kullanıcı rafinesi: ' + refinement : '',
      'Görev: 3 sonucu listeleme. Puanları ve maliyetleri tekrar yazma.',
      'Bir seçeneği satmaya veya zorla öne çıkarmaya çalışma.',
      'Tarafsız otomotiv danışmanı gibi doğal Türkçe paragraf yaz.',
      'Asla markdown, tablo, başlık, liste, pipe karakteri üretme.',
      'Tek paragraf yaz.',
      'Karttaki verileri tekrar listeleme.',
      'Sadece karar yorumu üret.',
      'Kullanıcının en doğru kararı vermesine yardım et: kullanım tipi, bütçe ve öncelik trade-offlarını açıkla.',
      'En fazla 4 kısa cümle.'
    ].join('\\n');

    const res = await fetch('/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) return '';
    const data = await res.json();
    return String(data.result || '')
      .replace(/[#*_`|]/g, '')
      .replace(/^[-•]\s*/gm, '')
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 600);
  } catch {
    return '';
  }
}


const vehicleImages = {
  '2023 Toyota Corolla Cross Hybrid': '/assets/images/auto/toyota-corolla-cross-hybrid.svg',
  '2021 Volkswagen Golf 1.0 TSI': '/assets/images/auto/volkswagen-golf-tsi.svg',
  '2022 Honda Civic Eco': '/assets/images/auto/honda-civic-eco.svg',
  '2023 Renault Clio Icon': '/assets/images/auto/renault-clio-icon.svg',
  '2022 Hyundai Tucson 1.6 T-GDI': '/assets/images/auto/hyundai-tucson-tgdi.svg'
};

function getVehicleImage(name){
  if (vehicleImages[name]) return vehicleImages[name];

  if (name.includes('Toyota')) return '/assets/images/auto/toyota-corolla-cross-hybrid.svg';
  if (name.includes('Honda')) return '/assets/images/auto/honda-civic-eco.svg';
  if (name.includes('Hyundai')) return '/assets/images/auto/hyundai-tucson-tgdi.svg';
  if (name.includes('Renault')) return '/assets/images/auto/renault-clio-icon.svg';
  if (name.includes('Volkswagen')) return '/assets/images/auto/volkswagen-golf-tsi.svg';
  if (name.includes('Togg')) return '/assets/images/auto/togg-t10x.svg';
  if (name.includes('Tesla')) return '/assets/images/auto/tesla-model.svg';
  if (name.includes('BYD')) return '/assets/images/auto/byd-electric.svg';
  if (name.includes('Peugeot')) return '/assets/images/auto/peugeot-suv.svg';
  if (name.includes('Skoda')) return '/assets/images/auto/skoda-family.svg';
  if (name.includes('BMW')) return '/assets/images/auto/bmw-premium.svg';
  if (name.includes('Mercedes')) return '/assets/images/auto/mercedes-premium.svg';

  return '';
}


function getFilteredAutoResults(){
  let items = [...allResults];

  if (resultFilters.fuel !== 'all') {
    items = items.filter(vehicle => vehicle.fuel === resultFilters.fuel);
  }

  if (resultFilters.body !== 'all') {
    items = items.filter(vehicle => vehicle.body === resultFilters.body);
  }

  items.sort((a, b) => {
    if (resultFilters.sort === 'price_asc') return Number(a.price || 0) - Number(b.price || 0);
    if (resultFilters.sort === 'family') return Number(b.family || 0) - Number(a.family || 0);
    if (resultFilters.sort === 'city') return Number(b.city || 0) - Number(a.city || 0);
    if (resultFilters.sort === 'long') return Number(b.long || 0) - Number(a.long || 0);
    return Number(b.score || 0) - Number(a.score || 0);
  });

  return items;
}

function renderFilteredAutoResults(){
  const filtered = getFilteredAutoResults();
  lastResults = filtered;
  renderResults(filtered);
}



function renderOfferSkeleton(vehicleName) {
  return `
    <section class="dealer-offer-strip" data-offers-for="${escapeHtml(vehicleName)}">
      <div class="dealer-offer-header">
        <div>
          <strong>Yakındaki gerçek teklifler</strong>
          <span>Uygun satıcı seçenekleri kontrol ediliyor...</span>
        </div>
      </div>
    </section>
  `;
}

function renderDealerOffers(offers, vehicle, formData) {
  const city = String(formData.city || '').trim();

  if (!offers.length) {
    return `
      <div class="dealer-offer-header">
        <div>
          <strong>isteBul Verified Network</strong>
          <span>${city ? `${escapeHtml(city)} içinde` : 'Seçtiğiniz bölgede'} bu modele uygun doğrulanmış satıcı eşleşmesi hazırlanabilir.</span>
        </div>
        <button class="btn secondary auto-interest-btn" data-interest="dealer_match" data-vehicle="${escapeHtml(vehicle.name)}">
          Size özel teklif iste
        </button>
      </div>
      <div class="dealer-offer-list">
        <article class="dealer-offer-card dealer-offer-placeholder">
          <div>
            <strong>Satıcı eşleşmesi pilot ağı</strong>
            <span>${city ? escapeHtml(city) : 'Seçilen bölge'} ${formData.district ? ` / ${escapeHtml(formData.district)}` : ''}</span>
            <small>Uygun satıcı, fiyat aralığı ve finansman seçenekleri talebiniz sonrası doğrulanır.</small>
          </div>
          <div class="dealer-offer-price">
            <strong>Özel teklif</strong>
            <button class="btn primary auto-interest-btn" data-interest="dealer_match" data-vehicle="${escapeHtml(vehicle.name)}">
              Eşleşme iste
            </button>
          </div>
        </article>
      </div>
    `;
  }

  return `
    <div class="dealer-offer-header">
      <div>
        <strong>Yakındaki gerçek teklifler</strong>
        <span>${offers.length} aktif teklif bulundu${city ? ` • ${escapeHtml(city)}` : ''}</span>
      </div>
    </div>
    <div class="dealer-offer-list">
      ${offers.map((offer) => `
        <article class="dealer-offer-card">
          ${offer.image_url ? `<img src="${escapeHtml(offer.image_url)}" alt="${escapeHtml(offer.title)}" loading="lazy">` : ''}
          <div>
            <strong>${escapeHtml(offer.title || vehicle.name)}</strong>
            <span>${escapeHtml(offer.dealer_name || 'Satıcı')} • ${escapeHtml([offer.dealer_city, offer.dealer_district].filter(Boolean).join(' / '))}</span>
            <small>${offer.km ? `${formatter.format(offer.km)} km • ` : ''}${escapeHtml(offer.color || 'Renk bilgisi yok')}</small>
          </div>
          <div class="dealer-offer-price">
            <strong>${offer.price ? `${formatter.format(offer.price)} ₺` : 'Fiyat sorunuz'}</strong>
            ${offer.listing_url ? `<a href="${escapeHtml(offer.listing_url)}" target="_blank" rel="noopener">İlana git</a>` : ''}
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

async function hydrateDealerOffers(results, formData) {
  await Promise.all(results.map(async (vehicle) => {
    const container = document.querySelector(`[data-offers-for="${CSS.escape(vehicle.name)}"]`);
    if (!container) return;

    const offers = await getDealerOffers(vehicle, formData);
    container.innerHTML = renderDealerOffers(offers, vehicle, formData);
  }));
}

function buildEconomicVerdict(vehicle) {
  const total = Number(vehicle.costs?.total || 0);
  const depreciation = Number(vehicle.costs?.depreciation || 0);

  if (vehicle.score >= 90 && depreciation < total * 0.18) {
    return 'Ekonomik olarak güçlü karar. Kullanım uyumu ve toplam sahip olma maliyeti dengeli.';
  }

  if (depreciation > total * 0.22) {
    return 'Toplam maliyette değer kaybı etkisi yüksek olabilir. Sahiplik süresi önemli.';
  }

  if (vehicle.costs?.fuel > vehicle.costs?.maintenance) {
    return 'Operasyonel maliyet ağırlıklı bir profil. Kullanım yoğunluğunuz kritik.';
  }

  return 'Genel maliyet profili dengeli. Nihai karar için finansman ve teklif karşılaştırması önerilir.';
}

function renderResults(results, financeOffers = []) {
  const root = document.getElementById('auto-results');

  if (!Array.isArray(results) || !results.length) {
    root.innerHTML = '<article class="premium-result-card"><h3>Uygun sonuç bulunamadı</h3><p>Seçimlerinizi değiştirerek yeniden analiz başlatabilirsiniz.</p></article>';
    return;
  }

  const formData = form ? readForm(form) : {};

  root.innerHTML = `
    <section class="auto-results-trust-banner" aria-label="Sonuç açıklaması">
      <div>
        <p class="kicker">Model önerisi</p>
        <h3>Bu sonuçlar canlı ilan değil, ihtiyaç profilinize göre hazırlanmış araç model önerileridir.</h3>
        <p>Size uygun gerçek araç seçenekleri için talep bırakabilir, uygun satıcılarla eşleşme desteği alabilirsiniz.</p>
      </div>
      <button type="button" class="btn primary auto-interest-btn" data-interest="vehicle_offer" data-vehicle="${escapeHtml(results[0]?.name || 'Araç önerisi')}">
        Uygun satıcı eşleşmesi iste
      </button>
    </section>

    <section class="auto-filter-toolbar" aria-label="Auto sonuç filtreleri">
      <div>
        <strong>${results.length} / ${allResults.length || results.length} öneri gösteriliyor</strong>
        <span>Sonuçları kullanım önceliğinize göre düzenleyin.</span>
      </div>

      <label>
        Yakıt
        <select data-auto-filter="fuel">
          <option value="all" ${resultFilters.fuel === 'all' ? 'selected' : ''}>Tümü</option>
          <option value="electric" ${resultFilters.fuel === 'electric' ? 'selected' : ''}>Elektrik</option>
          <option value="hybrid" ${resultFilters.fuel === 'hybrid' ? 'selected' : ''}>Hibrit</option>
          <option value="gasoline" ${resultFilters.fuel === 'gasoline' ? 'selected' : ''}>Benzin</option>
          <option value="diesel" ${resultFilters.fuel === 'diesel' ? 'selected' : ''}>Dizel</option>
        </select>
      </label>

      <label>
        Kasa
        <select data-auto-filter="body">
          <option value="all" ${resultFilters.body === 'all' ? 'selected' : ''}>Tümü</option>
          <option value="suv" ${resultFilters.body === 'suv' ? 'selected' : ''}>SUV</option>
          <option value="sedan" ${resultFilters.body === 'sedan' ? 'selected' : ''}>Sedan</option>
          <option value="hatchback" ${resultFilters.body === 'hatchback' ? 'selected' : ''}>Hatchback</option>
        </select>
      </label>

      <label>
        Sırala
        <select data-auto-filter="sort">
          <option value="score" ${resultFilters.sort === 'score' ? 'selected' : ''}>Karar skoruna göre</option>
          <option value="price_asc" ${resultFilters.sort === 'price_asc' ? 'selected' : ''}>En düşük fiyat</option>
          <option value="family" ${resultFilters.sort === 'family' ? 'selected' : ''}>Aile kullanımına göre</option>
          <option value="city" ${resultFilters.sort === 'city' ? 'selected' : ''}>Şehir kullanımına göre</option>
          <option value="long" ${resultFilters.sort === 'long' ? 'selected' : ''}>Uzun yola göre</option>
        </select>
      </label>
    </section>
  ` + results.map((vehicle, index) => {
    const monthlyImpact = Math.round((Number(vehicle.costs.total || 0) / 12) / 100) * 100;
    const rankLabel = index === 0
      ? 'Genel uyum lideri'
      : index === 1
        ? 'Maliyet odaklı alternatif'
        : 'Alternatif senaryo';

    return `
    <article class="auto-market-card premium-result-card conversion-result-card">
      <div class="auto-market-media">
        <div class="auto-market-rank">${rankLabel}</div>
        <div class="auto-market-image">
          ${vehicle.image_url
            ? `<img src="${escapeHtml(vehicle.image_url)}" alt="${escapeHtml(vehicle.name)}" loading="lazy">`
            : `<div class="vehicle-placeholder"><span>${escapeHtml(vehicle.brand || vehicle.name.split(' ')[1] || 'Araç')}</span></div>`}
        </div>
      </div>

      <div class="auto-market-main">
        <div class="auto-market-title-row">
          <div>
            <h3>${escapeHtml(vehicle.name)}</h3>
            <p class="result-summary">
              ${vehicle.score >= 85
                ? 'Profiliniz için güçlü eşleşme. Toplam maliyet, kullanım uyumu ve finansman açısından öne çıkıyor.'
                : 'Profilinize uygun alternatif. Kullanım ve bütçe dengenize göre değerlendirildi.'}
            </p>
          </div>
          <div class="confidence">Analiz güveni: %${vehicle.confidence}</div>
        </div>

        <div class="auto-market-tags">
          <span>AI analiz</span>
          <span>Toplam maliyet</span>
          <span>Finansman etkisi</span>
        </div>

        <div class="auto-market-insights">
          <div class="analysis-box">
            <strong>Güçlü taraflar</strong>
            <ul>${vehicle.reasons.slice(0, 3).map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
          </div>

          <div class="risk-box">
            <strong>Dikkat noktaları</strong>
            <ul>${vehicle.risks.slice(0, 2).map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
          </div>
        </div>

        <div class="analysis-box">
          <strong>AI uzman yorumu</strong>
          <p>${escapeHtml(buildEconomicVerdict(vehicle))}</p>
        </div>
      </div>

      <aside class="auto-market-decision">
        <div class="auto-market-score">
          <strong>${vehicle.score}</strong>
          <span>/100 karar skoru</span>
        </div>

        <div class="monthly-impact">
          <span>Aylık bütçe etkisi</span>
          <strong>${formatter.format(monthlyImpact)} ₺</strong>
        </div>

        <div class="cost auto-market-cost">
          <p><strong>12 aylık tahmini maliyet</strong></p>
          <p>${formatter.format(vehicle.costs.total)} ₺</p>
          <small>
            Yakıt ${formatter.format(vehicle.costs.fuel)} ₺ •
            Sigorta ${formatter.format(vehicle.costs.insurance)} ₺ •
            Kasko ${formatter.format(vehicle.costs.kasko || 0)} ₺ •
            Bakım ${formatter.format(vehicle.costs.maintenance)} ₺ •
            Vergi ${formatter.format(vehicle.costs.tax || 0)} ₺ •
            Lastik ${formatter.format(vehicle.costs.tires || 0)} ₺ •
            Değer kaybı ${formatter.format(vehicle.costs.depreciation || 0)} ₺
          </small>
        </div>

        ${vehicle.score >= 85 ? `
          <div class="auto-hot-banner">
            ${bestFinance ? `${bestFinance.provider_name} • %${bestFinance.monthly_rate} aylık oran` : 'Güncel teklif ve finansman seçenekleri değerlendirilebilir.'}
          </div>
        ` : ''}
      </aside>

      ${renderOfferSkeleton(vehicle.name)}

      <div class="auto-market-actions">
        <button class="btn primary auto-interest-btn" data-interest="vehicle_offer" data-vehicle="${escapeHtml(vehicle.name)}">
          Teklif sürecini başlat
        </button>

        <button class="btn secondary auto-compare-btn" data-result-index="${index}" data-vehicle="${escapeHtml(vehicle.name)}">
          Karşılaştır
        </button>

        <button class="btn secondary auto-shortlist-btn" data-result-index="${index}" data-vehicle="${escapeHtml(vehicle.name)}">
          Shortlist'e ekle
        </button>

        <button class="btn secondary auto-whatsapp-btn" data-vehicle="${escapeHtml(vehicle.name)}">
          Uzmanla görüş
        </button>

        <button class="btn secondary auto-interest-btn" data-interest="finance" data-vehicle="${escapeHtml(vehicle.name)}">
          Finansman etkisi
        </button>

        <p class="cta-microcopy">Ücretsiz ön değerlendirme • zorunlu satın alma yok</p>
      </div>
    </article>
  `}).join('') + `
    <section class="premium-ai-summary ai-explanation-box" data-ai-explanation>
      <h3>Karşılaştırmalı karar özeti</h3>
      <p>Karar özeti hazırlanıyor...</p>

      <div class="ai-refinement-tools">
        <div class="ai-refinement-chips">
          <button type="button" class="ai-chip" data-ai-refine="Daha ekonomik alternatifleri değerlendir.">
            Daha ekonomik
          </button>

          <button type="button" class="ai-chip" data-ai-refine="SUV yerine sedan odaklı değerlendirme yap.">
            Sedan odaklı
          </button>

          <button type="button" class="ai-chip" data-ai-refine="Hybrid seçenek önceliğiyle yeniden yorumla.">
            Hybrid odaklı
          </button>

          <button type="button" class="ai-chip" data-ai-refine="Aylık bütçe etkisini düşürmeye odaklan.">
            Daha düşük aylık bütçe
          </button>
        </div>

        <div class="ai-refinement-input">
          <input
            type="text"
            id="ai-refinement-input"
            placeholder="Kararı rafine edin (örn: 2 çocuklu aile için yeniden değerlendir)"
          />
          <button type="button" class="btn primary" id="ai-refinement-submit">
            Yorumu güncelle
          </button>
        </div>

        <p class="ai-trust-note">
          Bu değerlendirme tercihlerinize göre senaryo bazlı karar modelidir; canlı bayi fiyatı veya bağlayıcı finansman teklifi değildir.
        </p>
      </div>
    </section>
  `;

  root.querySelectorAll('[data-auto-filter]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const key = event.target.dataset.autoFilter;
      if (!key) return;
      resultFilters[key] = event.target.value;
      renderFilteredAutoResults();
    });
  });

  const aiBox = root.querySelector('[data-ai-explanation]');

  let aiSummaryBusy = false;

  const setAiBusy = (busy) => {
    aiSummaryBusy = busy;
    aiBox?.querySelectorAll('button').forEach((button) => {
      button.disabled = busy;
    });
  };

  const updateAiSummary = async (refinement = '', activeButton = null) => {
    if (!aiBox || !results[0] || aiSummaryBusy) return;

    const paragraph = aiBox.querySelector('p');
    aiBox.querySelectorAll('[data-ai-refine]').forEach((button) => {
      button.classList.toggle('is-active', button === activeButton);
    });

    setAiBusy(true);

    if (paragraph) {
      paragraph.textContent = refinement
        ? 'Karar özeti rafine ediliyor...'
        : 'Karar özeti hazırlanıyor...';
    }

    const text = await getAiExplanation(results, formData, refinement);

    setAiBusy(false);

    if (!text) {
      if (!refinement) aiBox.remove();
      else if (paragraph) paragraph.textContent = 'Yorum şu anda güncellenemedi. Mevcut karşılaştırmayı kullanarak devam edebilirsiniz.';
      return;
    }

    if (paragraph) paragraph.textContent = text;
  };

  hydrateDealerOffers(results, formData);
  updateAiSummary();

  aiBox?.querySelectorAll('[data-ai-refine]').forEach((button) => {
    button.addEventListener('click', () => {
      updateAiSummary(button.dataset.aiRefine || '', button);
    });
  });

  const refinementInput = aiBox?.querySelector('#ai-refinement-input');
  const refinementSubmit = aiBox?.querySelector('#ai-refinement-submit');

  const submitCustomRefinement = () => {
    const value = String(refinementInput?.value || '').trim().slice(0, 240);
    if (!value) return;
    updateAiSummary(value);
  };

  refinementSubmit?.addEventListener('click', submitCustomRefinement);

  refinementInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitCustomRefinement();
    }
  });
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

document.querySelectorAll('#gelir .btn.secondary').forEach((btn, index) => {
  const types = ['finance', 'insurance', 'report'];
  btn.dataset.interest = types[index];
  btn.classList.add('auto-interest-btn');
});


const wizard = document.getElementById('auto-wizard');

const wizardSteps = [
  {
    key: 'budget',
    title: 'Toplam araç bütçeniz nedir?',
    description: 'Satın alma ve finansman dengenizi doğru kurmak için yaklaşık bütçenizi seçin.',
    options: [
      { label: '500 bin TL altı', value: '500000', note: 'Ekonomik başlangıç seviyesi' },
      { label: '500 bin – 1 milyon TL', value: '900000', note: 'Ulaşılabilir güçlü seçenekler' },
      { label: '1 – 2 milyon TL', value: '1500000', note: 'Dengeli ve geniş pazar' },
      { label: '2 milyon TL+', value: '2500000', note: 'Premium seçenekler' },
      { label: 'Kendi bütçemi gireceğim', value: 'custom', note: 'Net bütçe ile daha hassas analiz' }
    ],
    custom: {
      type: 'text',
      placeholder: 'Örn. 1350000',
      min: 250000,
      max: 20000000,
      suffix: 'TL'
    }
  },
  {
    key: 'usage',
    title: 'Aracı en çok nasıl kullanacaksınız?',
    description: 'Karar analizi kullanım senaryonuza göre segment ve maliyet dengesini değerlendirir.',
    options: [
      { label: 'Aile', value: 'family', note: 'Geniş iç hacim ve güvenlik' },
      { label: 'Şehir içi', value: 'city', note: 'Yakıt ve park kolaylığı' },
      { label: 'Uzun yol', value: 'long', note: 'Konfor ve düşük tüketim' },
      { label: 'İş', value: 'business', note: 'Prestij ve kullanım verimliliği' }
    ]
  },
  {
    key: 'body',
    title: 'Hangi araç tipi size daha yakın?',
    description: 'Kararsızsanız SUV seçebilirsiniz; AI diğer sinyallerle denge kurar.',
    options: [
      { label: 'SUV', value: 'suv', note: 'Yüksek sürüş ve aile kullanımı' },
      { label: 'Sedan', value: 'sedan', note: 'Konfor ve uzun yol dengesi' },
      { label: 'Hatchback', value: 'hatchback', note: 'Şehir içi pratiklik' }
    ]
  },
  {
    key: 'fuel',
    title: 'Yakıt tercihiniz nedir?',
    description: 'Yakıt tercihi toplam sahip olma maliyetini ciddi şekilde etkiler.',
    options: [
      { label: 'Fark etmez', value: 'any', note: 'AI en dengeli seçeneği bulsun' },
      { label: 'Hibrit', value: 'hybrid', note: 'Şehir içi tasarruf odağı' },
      { label: 'Elektrikli', value: 'electric', note: 'Düşük kullanım maliyeti' },
      { label: 'Benzinli', value: 'gasoline', note: 'Geniş seçenek ve servis ağı' },
      { label: 'Dizel', value: 'diesel', note: 'Uzun yol ve yüksek kilometre' }
    ]
  },
  {
    key: 'km',
    title: 'Yılda yaklaşık kaç km yaparsınız?',
    description: 'Kilometre arttıkça yakıt, bakım ve değer kaybı daha kritik hale gelir.',
    options: [
      { label: '10.000 km altı', value: '8000', note: 'Düşük kullanım' },
      { label: '10.000 – 20.000 km', value: '15000', note: 'Ortalama kullanım' },
      { label: '20.000 – 35.000 km', value: '28000', note: 'Yoğun kullanım' },
      { label: '35.000 km+', value: '40000', note: 'Profesyonel / yüksek kullanım' },
      { label: 'Tam km gireceğim', value: 'custom', note: 'Net kilometre ile daha hassas maliyet' }
    ],
    custom: {
      type: 'text',
      placeholder: 'Örn. 22500',
      min: 1000,
      max: 100000,
      suffix: 'km'
    }
  },
  {
    key: 'location',
    title: 'Aracı hangi şehirde arıyorsunuz?',
    description: 'Gerçek teklif ve satıcı eşleşmesi için şehir bilgisi gereklidir. İlçe opsiyoneldir.',
    options: [
      { label: 'İzmir', value: 'İzmir', note: 'İzmir ve çevresindeki satıcılar' },
      { label: 'İstanbul', value: 'İstanbul', note: 'İstanbul Avrupa / Anadolu' },
      { label: 'Ankara', value: 'Ankara', note: 'Ankara ve çevresi' },
      { label: 'Antalya', value: 'Antalya', note: 'Antalya ve çevresi' },
      { label: 'Başka şehir', value: 'custom', note: 'Şehir adını kendim gireceğim' }
    ],
    custom: {
      type: 'text',
      placeholder: 'Örn. Bursa',
      min: 2,
      max: 40,
      suffix: 'il'
    },
    optionalDistrict: true
  },
  {
    key: 'loan',
    title: 'Finansman kullanacak mısınız?',
    description: 'Kredi tercihi aylık yük ve toplam maliyet analizini etkiler.',
    options: [
      { label: 'Evet', value: 'yes', note: 'Finansman etkisi dahil edilsin' },
      { label: 'Hayır', value: 'no', note: 'Peşin alım dengesiyle analiz edilsin' }
    ]
  }
];

const wizardState = {};
let wizardIndex = 0;

function syncWizardToForm() {
  Object.entries(wizardState).forEach(([key, value]) => {
    if (key.endsWith('_custom')) return;

    if (key === 'location') {
      const cityInput = form.elements.city;
      const districtInput = form.elements.district;
      const cityValue = value === 'custom' ? wizardState.location_custom : value;
      if (cityInput) cityInput.value = cityValue || '';
      if (districtInput) districtInput.value = wizardState.district || '';
      return;
    }

    const input = form.elements[key];
    if (!input) return;

    if (value === 'custom') {
      const customValue = wizardState[`${key}_custom`];
      if (customValue) input.value = customValue;
      return;
    }

    input.value = value;
  });
}

function renderWizard() {
  if (!wizard) return;

  const step = wizardSteps[wizardIndex];
  const progress = Math.round(((wizardIndex + 1) / wizardSteps.length) * 100);
  const selected = wizardState[step.key];
  const isCustom = selected === 'custom';
  const canProceed = Boolean(selected);
  const customValue = wizardState[`${step.key}_custom`] || '';

  wizard.innerHTML = `
    <div class="wizard-progress">
      <div class="wizard-progress-text">
        <span>Adım ${wizardIndex + 1}/${wizardSteps.length}</span>
        <span>%${progress} tamamlandı</span>
      </div>
      <div class="wizard-progress-bar">
        <div class="wizard-progress-fill" style="width:${progress}%"></div>
      </div>
    </div>

    <div class="wizard-question">
      <p class="kicker">Karar danışmanı</p>
      <h3>${escapeHtml(step.title)}</h3>
      <p>${escapeHtml(step.description)}</p>
    </div>

    <div class="wizard-options">
      ${step.options.map(option => `
        <button type="button" class="wizard-option ${selected === option.value ? 'is-selected' : ''}" data-wizard-value="${escapeHtml(option.value)}">
          ${escapeHtml(option.label)}
          <small>${escapeHtml(option.note)}</small>
        </button>
      `).join('')}
    </div>

    ${step.custom && isCustom ? `
      <label class="wizard-custom-input">
        <span>${step.key === 'budget' ? 'Net bütçenizi girin' : step.key === 'km' ? 'Yıllık net kilometrenizi girin' : 'Şehir adını girin'}</span>
        <div>
          <input
            type="${step.custom.type}"
            ${step.key === 'location' ? '' : 'inputmode="numeric" pattern="[0-9]*"'}
            ${step.key === 'location' ? `minlength="${step.custom.min}" maxlength="${step.custom.max}"` : `min="${step.custom.min}" max="${step.custom.max}"`}
            placeholder="${escapeHtml(step.custom.placeholder)}"
            value="${escapeHtml(customValue)}"
            data-wizard-custom
          >
          <strong>${escapeHtml(step.custom.suffix)}</strong>
        </div>
      </label>
    ` : ''}

    ${step.optionalDistrict ? `
      <label class="wizard-custom-input">
        <span>İlçe (opsiyonel)</span>
        <div>
          <input
            type="text"
            maxlength="60"
            placeholder="Örn. Bornova"
            value="${escapeHtml(wizardState.district || '')}"
            data-wizard-district
          >
          <strong>ilçe</strong>
        </div>
      </label>
    ` : ''}

    <div class="wizard-actions">
      <button type="button" class="btn secondary" data-wizard-back ${wizardIndex === 0 ? 'disabled' : ''}>Geri</button>
      <button type="button" class="btn primary" data-wizard-next ${canProceed ? '' : 'disabled'}>
        ${wizardIndex === wizardSteps.length - 1 ? 'Analizi başlat' : 'Devam et'}
      </button>
    </div>
  `;
}

function advanceWizard() {
  const step = wizardSteps[wizardIndex];

  if (!wizardState[step.key]) {
    alert('Lütfen devam etmeden önce bir seçenek seçin.');
    return;
  }

  if (wizardState[step.key] === 'custom') {
    const visibleCustomInput = wizard?.querySelector('[data-wizard-custom]');
    const rawCustomValue = String(
      visibleCustomInput?.value ||
      wizardState[`${step.key}_custom`] ||
      ''
    ).trim();

    if (step.key === 'location') {
      const cleanLocation = String(rawCustomValue || '').trim();
      if (cleanLocation.length < step.custom.min || cleanLocation.length > step.custom.max) {
        alert('Lütfen geçerli bir şehir adı girin.');
        return;
      }
      wizardState[`${step.key}_custom`] = cleanLocation;
    } else {
      const numericValue = Number(rawCustomValue);

      if (!rawCustomValue || Number.isNaN(numericValue)) {
        alert('Lütfen geçerli bir değer girin.');
        return;
      }

      if (step.custom) {
        if (numericValue < step.custom.min || numericValue > step.custom.max) {
          alert(`Lütfen ${step.custom.min} - ${step.custom.max} aralığında bir değer girin.`);
          return;
        }
      }

      wizardState[`${step.key}_custom`] = rawCustomValue;
    }
  }

  syncWizardToForm();

  if (wizardIndex < wizardSteps.length - 1) {
    wizardIndex += 1;
    renderWizard();
    trackAutoEvent('auto_wizard_step', {
      step: wizardIndex + 1,
      key: wizardSteps[wizardIndex].key
    });
    return;
  }

  form.requestSubmit();
}

if (wizard) {
  renderWizard();

  wizard.addEventListener('input', (event) => {
    const customInput = event.target.closest('[data-wizard-custom]');
    const districtInput = event.target.closest('[data-wizard-district]');

    const step = wizardSteps[wizardIndex];

    if (districtInput) {
      wizardState.district = String(districtInput.value || '').trim().slice(0, 60);
      syncWizardToForm();
      return;
    }

    if (!customInput) return;

    const rawValue = String(customInput.value || '');
    const cleanValue = step.key === 'location'
      ? rawValue.trim().slice(0, step.custom?.max || 40)
      : rawValue.replace(/\D/g, '');

    wizardState[`${step.key}_custom`] = cleanValue;
    customInput.value = cleanValue;
    syncWizardToForm();

    const nextButton = wizard.querySelector('[data-wizard-next]');
    if (nextButton) {
      nextButton.disabled = false;
    }
  });

  wizard.addEventListener('click', (event) => {
    const option = event.target.closest('.wizard-option');
    const back = event.target.closest('[data-wizard-back]');
    const next = event.target.closest('[data-wizard-next]');

    if (option) {
      const step = wizardSteps[wizardIndex];
      wizardState[step.key] = option.dataset.wizardValue;
      syncWizardToForm();
      renderWizard();

      if (!autoFormStarted) {
        autoFormStarted = true;
        trackAutoEvent('auto_form_started');
      }

      return;
    }

    if (back && wizardIndex > 0) {
      wizardIndex -= 1;
      renderWizard();
      return;
    }

    if (next) {
      if (next.disabled) return;
      advanceWizard();
    }
  });
}


loadAutoRuntimeConfig();
trackAutoEvent('auto_page_view');

const form = document.getElementById('auto-form');
let autoFormStarted = false;
let autoAnalysisRunning = false;
let autoAnalysisTimer = null;
let lastResults = [];
let allResults = [];
let resultFilters = {
  fuel: 'all',
  body: 'all',
  sort: 'score'
};

form.addEventListener('input', () => {
  if (!autoFormStarted) {
    autoFormStarted = true;
    trackAutoEvent('auto_form_started');
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (autoAnalysisRunning) return;
  autoAnalysisRunning = true;

  trackAutoEvent('auto_form_submitted');

  const formData = readForm(form);
  const [vehicleCatalog, financeOffers] = await Promise.all([getVehicleCatalog(), getFinanceOffers()]);
  const results = recommendVehicles(formData, vehicleCatalog);
  lastResults = results;
  allResults = [...results];

  trackAutoEvent('auto_analysis_started', formData);

  renderLoading();

  if (autoAnalysisTimer) clearTimeout(autoAnalysisTimer);

  autoAnalysisTimer = setTimeout(() => {
    try {
      document.getElementById('analiz').scrollIntoView({ behavior: 'smooth' });
      trackAutoEvent('auto_results_rendered', { count: results.length });
      renderResults(results, financeOffers);

      try {
        if (window.app?.currentUser?.id && typeof window.app.saveDecisionHistory === 'function' && results.length) {
          window.app.saveDecisionHistory({
            id: `auto-${Date.now()}`,
            categoryId: 'auto',
            categoryName: 'Araç Karar Analizi',
            createdAt: new Date().toISOString(),
            rawAnswers: formData,
            answers: formData,
            summary: `${results[0].name} kullanım ve bütçe profilinize göre en güçlü araç eşleşmesi olarak öne çıktı.`,
            insight: 'isteBul Auto karar analizi',
            dataHealth: 'estimated',
            recommendations: results.map((vehicle) => ({
              name: vehicle.name,
              score: vehicle.score,
              price: vehicle.price || vehicle.costs?.purchase || 0,
              yearlyCost: vehicle.costs?.annual || 0,
              financeComparisons: [{
                monthlyPayment: Math.round((Number(vehicle.costs?.total || 0) / 12) || 0)
              }]
            }))
          });
        }
      } catch (_) {}

      trackUniqueAutoEvent('auto_results_view', formData, 'results');
    } finally {
      autoAnalysisRunning = false;
      autoAnalysisTimer = null;
    }
  }, 2200);
});


function readAutoStorage(key){
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAutoStorage(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function toAutoFavorite(vehicle){
  return {
    id: `auto-${vehicle.name}`,
    title: vehicle.name,
    location: 'isteBul Auto AI analizi',
    price: Number(vehicle.price || vehicle.costs?.purchase || 0),
    category: 'arac',
    external_url: '',
    score: vehicle.score,
    autoGenerated: true
  };
}

function toggleAutoFavoriteFallback(vehicle){
  const key = 'istebu_favorites';
  const items = readAutoStorage(key);
  const id = `auto-${vehicle.name}`;
  const exists = items.some(item => String(item.id) === id);

  if (exists) {
    writeAutoStorage(key, items.filter(item => String(item.id) !== id));
    alert('Araç shortlist listenizden çıkarıldı.');
    return false;
  }

  writeAutoStorage(key, [...items, toAutoFavorite(vehicle)]);
  alert('Araç shortlist listenize eklendi.');
  return true;
}


function getAutoFallbackImage(name){
  name = String(name || '');

  if (name.includes('Toyota')) return '/assets/images/auto/toyota-corolla-cross-hybrid.svg';
  if (name.includes('Honda')) return '/assets/images/auto/honda-civic-eco.svg';
  if (name.includes('Hyundai')) return '/assets/images/auto/hyundai-tucson-tgdi.svg';
  if (name.includes('Renault')) return '/assets/images/auto/renault-clio-icon.svg';
  if (name.includes('Volkswagen')) return '/assets/images/auto/volkswagen-golf-tsi.svg';
  if (name.includes('Togg')) return '/assets/images/auto/togg-t10x.svg';
  if (name.includes('Tesla')) return '/assets/images/auto/tesla-model.svg';
  if (name.includes('BYD')) return '/assets/images/auto/byd-electric.svg';
  if (name.includes('Peugeot')) return '/assets/images/auto/peugeot-suv.svg';
  if (name.includes('Skoda')) return '/assets/images/auto/skoda-family.svg';
  if (name.includes('BMW')) return '/assets/images/auto/bmw-premium.svg';
  if (name.includes('Mercedes')) return '/assets/images/auto/mercedes-premium.svg';

  return '';
}

function goToComparisonPage(){
  window.location.assign('/karsilastir');
}

function addAutoComparisonFallback(vehicle){
  const key = 'istebu_comparison_items';
  const items = readAutoStorage(key);
  const signature = `auto-${vehicle.name}`;

  if (items.some(item => item.signature === signature)) {
    goToComparisonPage();
    return;
  }

  if (items.length >= 4) {
    alert('Karşılaştırma listesine en fazla 4 seçenek eklenebilir.');
    return;
  }

  const score = Number(vehicle.score || 0);

  writeAutoStorage(key, [...items, {
    id: `auto-compare-${vehicle.name}`,
    signature,
    categoryId: 'arac',
    categoryName: 'Araç Karşılaştırma',
    sourceType: 'isteBul Auto',
    title: vehicle.name,
    image: getAutoFallbackImage(vehicle.name),
    score,
    riskLevel: score >= 85 ? 'Düşük risk' : score >= 70 ? 'Dengeli' : 'Kontrol gerekli',
    price: Number(vehicle.price || vehicle.costs?.purchase || 0),
    periodicCost: Number(vehicle.costs?.annual || 0),
    yearlyCost: Number(vehicle.costs?.annual || 0),
    monthlyPayment: Math.round((Number(vehicle.costs?.total || 0) / 12) || 0),
    tags: [vehicle.fuel || 'Araç', vehicle.segment || 'AI analiz'],
    comment: vehicle.reasons?.[0] || 'Araç karar analizi sonucu önerildi.',
    reasons: vehicle.reasons || [],
    risks: vehicle.risks || []
  }]);

  goToComparisonPage();
}

document.addEventListener('click', async (event) => {
  const compareBtn = event.target.closest('.auto-compare-btn');

  if (compareBtn) {
    const vehicleIndex = Number(compareBtn.dataset.resultIndex);
    const vehicleName = compareBtn.dataset.vehicle;
    const vehicle = lastResults[vehicleIndex] || lastResults.find(v => v.name === vehicleName);

    if (vehicle) {
      addAutoComparisonFallback(vehicle);
    }

    return;
  }

  const shortlistBtn = event.target.closest('.auto-shortlist-btn');

  if (shortlistBtn) {
    const vehicleIndex = Number(shortlistBtn.dataset.resultIndex);
    const vehicleName = shortlistBtn.dataset.vehicle;
    const vehicle = lastResults[vehicleIndex] || lastResults.find(v => v.name === vehicleName);

    if (vehicle) {
      const added = window.app?.toggleAutoFavorite
        ? window.app.toggleAutoFavorite(vehicle)
        : toggleAutoFavoriteFallback(vehicle);
      shortlistBtn.textContent = added ? "Shortlist'te" : "Shortlist'e ekle";
    }

    return;
  }

  const whatsappBtn = event.target.closest('.auto-whatsapp-btn');

  if (whatsappBtn) {
    const vehicle = whatsappBtn.dataset.vehicle || 'vehicle';
    const phone = autoRuntimeConfig.whatsappPhone;

    const formData = readForm(document.getElementById('auto-form'));

    const message = `Merhaba, isteBul Auto analizimde şu araç ilgimi çekti:

${vehicle}

Bütçem: ${formData.budget || '-'} TL
Kullanım: ${formData.usage || '-'}
Yakıt: ${formData.fuel || '-'}
Yıllık km: ${formData.km || '-'}
Kredi: ${formData.loan || '-'}

Destek almak istiyorum.`;

    if (!phone) {
      alert('WhatsApp numarası tanımlı değil.');
      return;
    }

    trackUniqueAutoEvent('auto_whatsapp_click', { vehicle }, vehicle);

    try {
      await callAutoIntake({
        type: 'event',
        event_name: 'auto_whatsapp_lead_intent',
        metadata: {
          ...formData,
          interest_type: 'whatsapp',
          vehicle,
          session_id: getSessionId()
        }
      });
    } catch {}

    window.open(
      'https://wa.me/' + phone + '?text=' + encodeURIComponent(message),
      '_blank'
    );
  }

  const interestBtn = event.target.closest('.auto-interest-btn');

  if (interestBtn) {
    const interest = interestBtn.dataset.interest || 'finance';
    const vehicle = interestBtn.dataset.vehicle || '';

    const eventMap = {
      finance: 'auto_finance_click',
      insurance: 'auto_insurance_click',
      vehicle_offer: 'auto_vehicle_offer_click',
      premium_report: 'auto_premium_report_click'
    };

    if (eventMap[interest]) {
      trackAutoEvent(eventMap[interest], { interest_type: interest, vehicle });
    }

    openLeadModal(interest, vehicle);
  }
});
