'use strict';

/** Shared legal footer links — keep in sync via scripts/sync-corporate-footers.cjs */

const KVKK_VISITOR_LABEL = 'Ziyaretçi Aydınlatma Metni';
const KVKK_ABOUT_LABEL = 'KVKK hakkında bilgilendirme';
const KVKK_APPLY_SUBJECT = 'KVKK Başvurusu';
const KVKK_APPLY_EMAIL = 'info@istebul.com';

const LEGAL_INLINE_LINKS_HTML = `<a href="/gizlilik.html">Gizlilik</a> · <a href="/kvkk.html">${KVKK_VISITOR_LABEL}</a> · <a href="/kvkk.html#kvkk-bilgilendirme">${KVKK_ABOUT_LABEL}</a>`;

const CORPORATE_FOOTER_NAV_LINKS_HTML = `
      <a href="/hakkimizda.html">Hakkımızda</a>
      <a href="/metodoloji/">Metodoloji</a>
      <a href="/veri-kaynaklari/">Veri Kaynakları</a>
      <a href="/iletisim.html">İletişim</a>
      <a href="/gizlilik.html">Gizlilik</a>
      <a href="/kvkk.html">${KVKK_VISITOR_LABEL}</a>
      <a href="/kvkk.html#kvkk-bilgilendirme">${KVKK_ABOUT_LABEL}</a>
      <a href="/cerez-politikasi.html">Çerez politikası</a>
      <a href="/kullanim-sartlari.html">Kullanım şartları</a>
      <a href="/partner-olun.html">Partner olun</a>
      <a href="/rehber/arac-kredisi-hesaplama/">Kredi rehberi</a>
      <a href="/rehber/tco-rehberi/">TCO rehberi</a>
      <a href="/auto/">Karar analizi</a>`;

const CORPORATE_FOOTER_NAV_HTML = `<nav class="corporate-footer__nav" aria-label="Site bağlantıları">${CORPORATE_FOOTER_NAV_LINKS_HTML}
    </nav>`;

function renderCorporateFooter(options = {}) {
  const { renderSiteSocialFooterNav } = require('./site-social-footer.cjs');
  const tagline =
    options.tagline ||
    'Karar zekâsı platformu — bilgilendirme amaçlıdır; finansal taahhüt içermez.';
  const legalExtra = options.legalExtra || '';
  const legalLine = legalExtra
    ? `${LEGAL_INLINE_LINKS_HTML} · ${legalExtra}`
    : `${LEGAL_INLINE_LINKS_HTML} · <a href="/cerez-politikasi.html">Çerez politikası</a>`;

  return `<footer class="corporate-footer">
    <div class="corporate-footer__brand">
      <strong>isteBul</strong>
      <p>${tagline}</p>
      ${renderSiteSocialFooterNav()}
      <p class="corporate-footer__legal">${legalLine}</p>
    </div>
    ${CORPORATE_FOOTER_NAV_HTML}
  </footer>`;
}

const MINI_LEGAL_FOOTER_HTML = `<p class="legal-footer-mini">${LEGAL_INLINE_LINKS_HTML}</p>`;

function kvkkApplyMailtoHref() {
  return `mailto:${KVKK_APPLY_EMAIL}?subject=${encodeURIComponent(KVKK_APPLY_SUBJECT)}`;
}

function renderKvkkApplyCta(className = 'btn btn-outline btn-sm') {
  return `<a href="${kvkkApplyMailtoHref()}" class="${className}">KVKK başvurusu gönder</a>`;
}

const LEGAL_KVKK_PAIR_HTML = `<a href="/kvkk.html">${KVKK_VISITOR_LABEL}</a> · <a href="/kvkk.html#kvkk-bilgilendirme">${KVKK_ABOUT_LABEL}</a>`;

/** Replaces legacy single "KVKK" anchor in HTML fragments. */
function replaceLegacyKvkkAnchor(html) {
  return html.replace(/<a href="\/kvkk\.html">KVKK<\/a>/g, LEGAL_KVKK_PAIR_HTML);
}

module.exports = {
  KVKK_VISITOR_LABEL,
  KVKK_ABOUT_LABEL,
  KVKK_APPLY_SUBJECT,
  KVKK_APPLY_EMAIL,
  LEGAL_INLINE_LINKS_HTML,
  CORPORATE_FOOTER_NAV_LINKS_HTML,
  CORPORATE_FOOTER_NAV_HTML,
  MINI_LEGAL_FOOTER_HTML,
  kvkkApplyMailtoHref,
  renderKvkkApplyCta,
  replaceLegacyKvkkAnchor,
  renderCorporateFooter
};
