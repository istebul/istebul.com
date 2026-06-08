/**
 * P2.4 — Enterprise trust layer (honest claims; no fabricated certifications).
 */

export const PARTNER_TRUST_DISCLAIMER = Object.freeze(
  'isteBul bir SOC 2 veya ISO 27001 sertifikası sunmaz. Aşağıdaki maddeler ürün ve süreçlerimizin mevcut durumunu açıklar; bağlayıcı taahhütler yazılı sözleşmede yer alır.'
);

export const PARTNER_TRUST_PILLARS = Object.freeze([
  {
    id: 'security',
    title: 'Güvenlik yaklaşımı',
    summary: 'Webhook imzası, HTTPS zorunluluğu ve sunucu tarafı gizli anahtar yönetimi.',
    points: [
      'Partner webhook yalnızca HTTPS (TLS) üzerinden kabul edilir; özel ağ ve localhost URL’leri kayıt sırasında reddedilir (SSRF koruması).',
      'Her teslimat HMAC-SHA256 ile imzalanır; partner ham gövde üzerinde doğrulama yapar.',
      'Webhook imza secret’ı ile callback secret’ı ayrıdır; repoda veya istemci loglarında tutulmaması gerekir.',
      'Başvuru ve callback uçlarında hız sınırlama (rate limit) uygulanır.',
      'Veritabanı erişimi sunucu tarafı servis anahtarları ile sınırlandırılır; partner tarayıcısına service role verilmez.'
    ],
    notClaimed: 'SOC 2 Type II, ISO 27001 veya penetrasyon testi sertifikası iddiası yoktur.'
  },
  {
    id: 'privacy',
    title: 'Veri gizliliği',
    summary: 'Lead teslimatında veri minimizasyonu ve amaç sınırlaması.',
    points: [
      'Webhook payload’ı satış süreci için gerekli alanlarla sınırlıdır (iletişim, tercih, skor, route).',
      'Kullanıcı, Auto formunda partner paylaşımına ilişkin bilgilendirme ve onay akışına tabidir.',
      'Partner yalnızca sözleşme kapsamındaki lead işleme amacıyla veri alır; ikincil kullanım partner sorumluluğundadır.',
      'Teslimat denemeleri operasyonel loglarda tutulur; yanıt gövdesi yalnızca kısa önizleme (≈240 karakter) saklanır.'
    ],
    notClaimed: '“Sertifikalı gizlilik mührü” veya üçüncü taraf privacy seal iddiası yoktur.'
  },
  {
    id: 'kvkk',
    title: 'KVKK ve hukuki çerçeve',
    summary: '6698 sayılı Kanun kapsamında aydınlatma ve başvuru hakları.',
    points: [
      'Genel aydınlatma: <a href="/kvkk.html">KVKK aydınlatma metni</a> · <a href="/gizlilik.html">Gizlilik politikası</a>.',
      'Lead formunda KVKK / gizlilik / partner paylaşımı onayı toplanır (ürün akışına bağlı).',
      'Partner lead aktarımı için Veri İşleme Sözleşmesi (DPA) imzalanması zorunludur; şablon talep için <a href="mailto:info@istebul.com?subject=Partner%20DPA%20Talebi">info@istebul.com</a>.',
      'Veri işleyen / iş ortağı rolleri ve aktarım şartları ticari sözleşme ile netleştirilir.',
      'KVKK başvuruları <a href="/iletisim.html">iletişim</a> kanalı üzerinden alınır.'
    ],
    notClaimed: 'Resmi “KVKK uyum sertifikası” veya denetim raporu paylaşımı iddia edilmez; uyum sürekli süreçtir.'
  },
  {
    id: 'sla',
    title: 'SLA yaklaşımı',
    summary: 'Dispatch hedefleri plana göre; kurumsal SLA sözleşmede.',
    points: [
      'Starter: dispatch hedefi ≤ 15 dk (operasyonel hedef, platform genel uptime taahhüdü değildir).',
      'Growth: dispatch hedefi ≤ 10 dk.',
      'Enterprise: süreler ve escalation yazılı SLA ekinde tanımlanır.',
      'Webhook istemci zaman aşımı: 8 saniye; partner endpoint’inin hızlı 2xx dönmesi beklenir.'
    ],
    notClaimed: '%99,9 uptime veya kredi iadesi içeren SLA, standart paketlerde otomatik sunulmaz.'
  },
  {
    id: 'integration',
    title: 'Entegrasyon güvenliği',
    summary: 'Dokümante API, self-serve doğrulama ve kurumsal inceleme opsiyonu.',
    points: [
      'Açık webhook dokümantasyonu: <a href="/partner-docs.html">Partner API</a>.',
      'Self-serve onboarding’de örnek payload HMAC testi (secret sunucuda saklanmaz).',
      'Webhook URL kaydı sırasında güvenli host doğrulaması.',
      'Enterprise pakette güvenlik soru listesi ve entegrasyon incelemesi süreç olarak planlanır (her müşteride otomatik pentest yok).'
    ],
    notClaimed: 'Her partner için otomatik sızma testi veya bug bounty programı iddiası yoktur.'
  },
  {
    id: 'reliability',
    title: 'Webhook güvenilirliği',
    summary: 'Retry, failover ve gözlemlenebilir teslimat — production kodunda mevcut.',
    points: [
      'Başarısız teslimat: 15 dk → 1 sa → 6 sa → 24 sa aralıklarla en fazla 5 deneme.',
      'Route failover (ör. bayi → genel satış) ve endpoint circuit breaker / günlük cap.',
      'Her deneme <code>partner_lead_dispatch_logs</code> ve dispatch-id ile izlenir.',
      'Planlı retry worker (GitHub Actions) + admin manuel yeniden gönderim.'
    ],
    notClaimed: 'Sıfır veri kaybı veya garantili teslimat süresi taahhüdü yoktur; <code>dispatch_dead</code> durumu mümkündür.'
  },
  {
    id: 'support',
    title: 'Destek modeli',
    summary: 'Self-serve öncelikli; operasyon ve kurumsal kanallar net ayrılmış.',
    points: [
      'Self-serve: başvuru, onboarding, API dokümantasyonu ve test konsolu.',
      'Operasyon: iş günü içinde başvuru / endpoint onayı (tipik yanıt süresi; 7/24 iddiası yok).',
      'Growth / Enterprise: sözleşmeye bağlı entegrasyon ve hesap desteği.',
      'Kritik üretim olayları: <a href="/iletisim.html">kurumsal iletişim</a> ve sözleşmeli escalation (Enterprise).'
    ],
    notClaimed: '7/24 Türkçe teknik destek hattı standart paketlere dahil değildir.'
  }
]);

export const PARTNER_TRUST_NAV = Object.freeze(
  PARTNER_TRUST_PILLARS.map((p) => ({ id: p.id, label: p.title }))
);

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderTrustDisclaimer() {
  return `<p class="ib-partner-trust-disclaimer" role="note">${escapeHtml(PARTNER_TRUST_DISCLAIMER)}</p>`;
}

export function renderTrustPillarCard(pillar) {
  return `
    <article class="ib-partner-trust-pillar" id="${escapeHtml(pillar.id)}">
      <h2>${escapeHtml(pillar.title)}</h2>
      <p class="ib-partner-trust-pillar-summary">${escapeHtml(pillar.summary)}</p>
      <ul>${pillar.points.map((pt) => `<li>${pt}</li>`).join('')}</ul>
      <p class="ib-partner-trust-not-claimed"><strong>Şeffaflık:</strong> ${escapeHtml(pillar.notClaimed)}</p>
    </article>`;
}

export function renderTrustCenterHtml() {
  return `
    ${renderTrustDisclaimer()}
    <div class="ib-partner-trust-pillars">
      ${PARTNER_TRUST_PILLARS.map(renderTrustPillarCard).join('')}
    </div>`;
}

export function renderTrustSummaryGrid() {
  return `
    <div class="ib-partner-trust-grid ib-partner-trust-grid--summary">
      ${PARTNER_TRUST_PILLARS.map((p) => `
        <a class="ib-partner-trust-card ib-partner-trust-card--link" href="/partner-guven.html#${escapeHtml(p.id)}">
          <strong>${escapeHtml(p.title)}</strong>
          <p>${escapeHtml(p.summary)}</p>
        </a>
      `).join('')}
    </div>`;
}
