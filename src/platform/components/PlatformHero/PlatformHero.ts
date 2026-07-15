/**
 * İSTEBUL PlatformHero — çalışan Platform UI bileşeni.
 *
 * SEO notu: entegrasyonda `headingLevel: 2` kullanın; mevcut ana sayfa H1 korunur.
 * PR-553: isteğe bağlı ürün CTA şeridi (`products`) — katalogdan beslenir.
 */

import type {
  PlatformIdentity,
  PlatformProduct,
  PlatformProductStatus
} from '../../types/platform-product.ts';
import {
  getPlatformProductStatusLabel,
  getPlatformProductStatusTone
} from '../../constants/platform-product-status.ts';

/** Hero ürün eylem satırı için minimum ürün alanı. */
export type PlatformHeroProductAction = Pick<
  PlatformProduct,
  'id' | 'name' | 'ctaLabel' | 'url' | 'status' | 'statusLabel'
>;

/** PlatformHero içerik / erişilebilirlik seçenekleri. */
export interface PlatformHeroProps {
  /**
   * Platform kimliği (PR-002). Verilirse marka adı / slogan kimlikten alınabilir.
   */
  identity?: Pick<PlatformIdentity, 'name' | 'shortName' | 'slogan' | 'shortDescription'>;
  /** Başlık metni. */
  title?: string;
  /**
   * Başlık düzeyi. Ana sayfa entegrasyonunda `2` zorunlu (mevcut H1 bozulmasın).
   * @default 1
   */
  headingLevel?: 1 | 2;
  /** Alt açıklama. */
  description?: string;
  /** Marka / ürün adı (kahraman düzeyinde). */
  brandName?: string;
  /** Slogan (kimlikten veya override). */
  slogan?: string;
  /** Tek CTA metni (ürün şeridi yoksa). */
  ctaLabel?: string;
  /**
   * Tek CTA hedefi. Verilirse `<a href>` üretilir (ör. `#platform-products`).
   * Verilmezse yönlendirmesiz düğme.
   */
  ctaHref?: string;
  /**
   * PLATFORM_CATALOG ürünleri — verilirse ürün başına CTA şeridi üretilir
   * (tek keşfet CTA’sının yerine geçer).
   */
  products?: readonly PlatformHeroProductAction[];
  /** Ürün CTA şeridinde durum rozeti (ör. Geliştirme Aşamasında). */
  showProductStatus?: boolean;
  /** CTA açıklama notunu gizle. */
  hideCtaNote?: boolean;
  /** Kök öğeye eklenecek ekstra sınıf. */
  className?: string;
}

const DEFAULT_BRAND = 'İSTEBUL';
const DEFAULT_TITLE = 'Yapay zekâ destekli dijital platform';
const DEFAULT_DESCRIPTION =
  'İSTEBUL; bireyler ve işletmeler için geliştirilen yapay zekâ destekli dijital ürünleri tek çatı altında sunar.';
const DEFAULT_CTA = 'Ürünleri keşfet';

function resolveCopy(props: PlatformHeroProps = {}): {
  brandName: string;
  title: string;
  description: string;
  slogan: string;
  ctaLabel: string;
} {
  const brandName = props.brandName ?? props.identity?.name ?? DEFAULT_BRAND;
  const title = props.title ?? DEFAULT_TITLE;
  const description =
    props.description ?? props.identity?.shortDescription ?? DEFAULT_DESCRIPTION;
  const slogan = (props.slogan ?? props.identity?.slogan ?? '').trim();
  const ctaLabel = props.ctaLabel ?? DEFAULT_CTA;
  return { brandName, title, description, slogan, ctaLabel };
}

function createProductAction(
  product: PlatformHeroProductAction,
  showStatus: boolean
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'ib-platform-hero__product-action';
  wrap.setAttribute('data-platform-product-id', product.id);
  wrap.setAttribute('data-platform-product-status', product.status);

  const link = document.createElement('a');
  link.className = 'ib-platform-hero__cta ib-platform-hero__cta--product';
  link.href = product.url;
  link.textContent = product.ctaLabel?.trim() || product.name;
  link.setAttribute('data-platform-cta', 'product-entry');
  link.setAttribute('data-platform-product-id', product.id);
  link.setAttribute('aria-label', `${product.name}: ${product.ctaLabel || 'İncele'}`);

  if (product.status === 'gelistirme') {
    link.classList.add('ib-platform-hero__cta--gelistirme');
  }

  wrap.append(link);

  if (showStatus && product.status && product.status !== 'canli') {
    const tone = getPlatformProductStatusTone(product.status as PlatformProductStatus);
    const badge = document.createElement('span');
    badge.className = 'ib-platform-hero__status';
    badge.setAttribute('data-status', tone);
    badge.textContent = getPlatformProductStatusLabel(
      product.status as PlatformProductStatus,
      product.statusLabel
    );
    wrap.append(badge);
  }

  return wrap;
}

/**
 * PlatformHero DOM ağacını oluşturur.
 */
export function createPlatformHeroElement(props: PlatformHeroProps = {}): HTMLElement {
  const { brandName, title, description, slogan, ctaLabel } = resolveCopy(props);
  const headingLevel = props.headingLevel === 2 ? 2 : 1;
  const titleId = 'ib-platform-hero-title';
  const ctaHref = props.ctaHref?.trim() || '';
  const productActions = Array.isArray(props.products)
    ? props.products.filter((p) => p && p.url && (p.ctaLabel || p.name))
    : [];
  const useProductActions = productActions.length > 0;
  const hideCtaNote = Boolean(props.hideCtaNote) || Boolean(ctaHref) || useProductActions;
  const showProductStatus = props.showProductStatus !== false;

  const section = document.createElement('section');
  section.className = [
    'ib-platform-hero',
    useProductActions ? 'ib-platform-hero--experience' : '',
    props.className
  ]
    .filter(Boolean)
    .join(' ');
  section.setAttribute('data-platform-component', 'platform-hero');
  section.setAttribute('aria-labelledby', titleId);
  if (useProductActions) {
    section.setAttribute('data-platform-hero-experience', '1');
  }

  const inner = document.createElement('div');
  inner.className = 'ib-platform-hero__inner';

  const brand = document.createElement('p');
  brand.className = 'ib-platform-hero__brand';
  brand.textContent = brandName;

  const heading = document.createElement(headingLevel === 2 ? 'h2' : 'h1');
  heading.className = 'ib-platform-hero__title';
  heading.id = titleId;
  heading.textContent = title;

  const nodes: HTMLElement[] = [brand, heading];

  if (slogan) {
    const sloganEl = document.createElement('p');
    sloganEl.className = 'ib-platform-hero__slogan';
    sloganEl.textContent = slogan;
    nodes.push(sloganEl);
  }

  const lead = document.createElement('p');
  lead.className = 'ib-platform-hero__description';
  lead.textContent = description;
  nodes.push(lead);

  const actions = document.createElement('div');
  actions.className = 'ib-platform-hero__actions';
  actions.setAttribute('role', 'group');
  actions.setAttribute(
    'aria-label',
    useProductActions ? 'Ürünlere hızlı geçiş' : 'Platform eylemleri'
  );

  if (useProductActions) {
    const productRow = document.createElement('div');
    productRow.className = 'ib-platform-hero__product-actions';
    productRow.setAttribute('role', 'list');
    for (const product of productActions) {
      const item = document.createElement('div');
      item.className = 'ib-platform-hero__product-action-item';
      item.setAttribute('role', 'listitem');
      item.append(createProductAction(product, showProductStatus));
      productRow.append(item);
    }
    actions.append(productRow);
  } else {
    let cta: HTMLAnchorElement | HTMLButtonElement;
    if (ctaHref) {
      const link = document.createElement('a');
      link.className = 'ib-platform-hero__cta';
      link.href = ctaHref;
      link.textContent = ctaLabel;
      link.setAttribute('data-platform-cta', 'discover-products');
      cta = link;
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ib-platform-hero__cta';
      button.textContent = ctaLabel;
      button.setAttribute('data-platform-cta', 'discover-products');
      button.addEventListener('click', (event) => {
        event.preventDefault();
      });
      cta = button;
    }
    actions.append(cta);

    if (!hideCtaNote) {
      const ctaNote = document.createElement('span');
      ctaNote.className = 'ib-platform-hero__cta-note';
      ctaNote.id = 'ib-platform-hero-cta-note';
      ctaNote.textContent = 'Yönlendirme henüz etkin değil.';
      cta.setAttribute('aria-describedby', ctaNote.id);
      actions.append(ctaNote);
    }
  }

  nodes.push(actions);
  inner.append(...nodes);
  section.append(inner);

  return section;
}

export const PLATFORM_HERO_DEFAULTS = Object.freeze({
  brandName: DEFAULT_BRAND,
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  ctaLabel: DEFAULT_CTA
});

export default createPlatformHeroElement;
