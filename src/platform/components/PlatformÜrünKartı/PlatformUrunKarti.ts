/**
 * İSTEBUL PlatformÜrünKartı — üretim kalitesinde ürün kartı.
 *
 * PR-005/551: Herhangi bir PlatformProduct nesnesinden DOM üretir.
 * `enableNavigation: true` ile mevcut ürün URL’sine gider (yeni route yok).
 */

import type { PlatformProduct } from '../../types/platform-product.ts';
import {
  getPlatformProductStatusLabel,
  getPlatformProductStatusTone
} from '../../constants/platform-product-status.ts';

/** Bilinen logo anahtarları → marka varlık yolu (gelecek bağlama için). */
const LOGO_KEY_HREF: Readonly<Record<string, string>> = Object.freeze({
  'istebul-logo-nav': '/assets/brand/istebul-logo-nav.svg',
  'istebul-icon': '/assets/brand/istebul-icon.svg'
});

export interface PlatformUrunKartiProps {
  /** Zorunlu — Platform Kimliği ürün modeli (PR-002). */
  product: PlatformProduct;
  /** Çağrı butonu / bağlantı metni. */
  ctaLabel?: string;
  /**
   * true ise CTA, `product.url` ile mevcut girişi kullanır (yeni route oluşturmaz).
   * false ise yönlendirme yoktur.
   */
  enableNavigation?: boolean;
  /** Logo `src` override; yoksa `logoKey` çözümlenir. */
  logoSrc?: string;
  /** Logo `alt` override. */
  logoAlt?: string;
  /** Kök sınıfa eklenti. */
  className?: string;
}

const DEFAULT_CTA = 'İncele';

function resolveLogoSrc(product: PlatformProduct, logoSrc?: string): string | null {
  if (logoSrc && logoSrc.trim()) return logoSrc.trim();
  return LOGO_KEY_HREF[product.logoKey] ?? null;
}

/**
 * Tek bir platform ürün kartı DOM öğesi oluşturur.
 */
export function createPlatformUrunKartiElement(
  props: PlatformUrunKartiProps
): HTMLElement {
  const { product } = props;
  if (!product || typeof product !== 'object') {
    throw new TypeError('PlatformÜrünKartı: geçerli bir product nesnesi gerekir.');
  }

  const statusTone = getPlatformProductStatusTone(product.status);
  const statusLabel = getPlatformProductStatusLabel(product.status, product.statusLabel);
  const ctaLabel =
    props.ctaLabel?.trim() || product.ctaLabel?.trim() || DEFAULT_CTA;
  const logoSrc = resolveLogoSrc(product, props.logoSrc);
  const logoAlt = props.logoAlt?.trim() || `${product.name} logosu`;

  const article = document.createElement('article');
  article.className = [
    'ib-platform-urun-karti',
    `ib-platform-urun-karti--status-${statusTone}`,
    props.className
  ]
    .filter(Boolean)
    .join(' ');
  article.setAttribute('data-platform-component', 'platform-urun-karti');
  article.setAttribute('data-platform-product-id', product.id);
  article.setAttribute('data-platform-product-status', product.status);
  article.style.setProperty('--ib-puc-accent', product.defaultColor || '#2563eb');

  const accent = document.createElement('span');
  accent.className = 'ib-platform-urun-karti__accent';
  accent.setAttribute('aria-hidden', 'true');

  const header = document.createElement('header');
  header.className = 'ib-platform-urun-karti__header';

  const logoWrap = document.createElement('div');
  logoWrap.className = 'ib-platform-urun-karti__logo';
  logoWrap.setAttribute('data-logo-key', product.logoKey);

  if (logoSrc) {
    const img = document.createElement('img');
    img.className = 'ib-platform-urun-karti__logo-img';
    img.src = logoSrc;
    img.alt = logoAlt;
    img.width = 120;
    img.height = 28;
    img.decoding = 'async';
    img.loading = 'lazy';
    logoWrap.append(img);
  } else {
    const fallback = document.createElement('span');
    fallback.className = 'ib-platform-urun-karti__logo-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.textContent = (product.shortName || product.name).slice(0, 2).toUpperCase();
    logoWrap.append(fallback);
    logoWrap.setAttribute('role', 'img');
    logoWrap.setAttribute('aria-label', logoAlt);
  }

  const badgeRow = document.createElement('div');
  badgeRow.className = 'ib-platform-urun-karti__badges';

  const platformTag = document.createElement('span');
  platformTag.className = 'ib-platform-urun-karti__platform-label';
  platformTag.textContent = product.platformLabel;

  const statusBadge = document.createElement('span');
  statusBadge.className = 'ib-platform-urun-karti__status';
  statusBadge.setAttribute('data-status', statusTone);
  statusBadge.textContent = statusLabel;

  badgeRow.append(platformTag, statusBadge);
  header.append(logoWrap, badgeRow);

  const body = document.createElement('div');
  body.className = 'ib-platform-urun-karti__body';

  const title = document.createElement('h3');
  title.className = 'ib-platform-urun-karti__title';
  title.id = `ib-platform-urun-karti-title-${product.id}`;
  title.textContent = product.name;

  body.append(title);

  if (product.slogan?.trim()) {
    const slogan = document.createElement('p');
    slogan.className = 'ib-platform-urun-karti__slogan';
    slogan.textContent = product.slogan.trim();
    body.append(slogan);
  }

  const description = document.createElement('p');
  description.className = 'ib-platform-urun-karti__description';
  description.textContent = product.shortDescription;
  body.append(description);

  const footer = document.createElement('footer');
  footer.className = 'ib-platform-urun-karti__footer';

  const enableNavigation = Boolean(props.enableNavigation);
  const ctaNoteId = `ib-platform-urun-karti-cta-note-${product.id}`;

  if (enableNavigation) {
    const cta = document.createElement('a');
    cta.className = 'ib-platform-urun-karti__cta';
    cta.href = product.url;
    cta.textContent = ctaLabel;
    cta.setAttribute('data-platform-cta', 'product-inspect');
    cta.setAttribute('data-platform-product-url', product.url);
    /* Tam sayfa ürün girişleri için native gezinme (SPA yakalaması için data-native-route yok). */
    footer.append(cta);
  } else {
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'ib-platform-urun-karti__cta';
    cta.textContent = ctaLabel;
    cta.setAttribute('data-platform-cta', 'product-inspect');
    cta.setAttribute('data-platform-product-url', product.url);
    cta.setAttribute('aria-describedby', ctaNoteId);
    cta.addEventListener('click', (event) => {
      event.preventDefault();
    });

    const ctaNote = document.createElement('span');
    ctaNote.className = 'ib-platform-urun-karti__cta-note';
    ctaNote.id = ctaNoteId;
    ctaNote.textContent = 'Yönlendirme henüz etkin değil.';

    footer.append(cta, ctaNote);
  }

  article.setAttribute('aria-labelledby', title.id);
  article.append(accent, header, body, footer);

  return article;
}

export const PLATFORM_URUN_KARTI_DEFAULTS = Object.freeze({
  ctaLabel: DEFAULT_CTA
});

export default createPlatformUrunKartiElement;
