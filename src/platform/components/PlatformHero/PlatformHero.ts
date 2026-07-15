/**
 * İSTEBUL PlatformHero — çalışan Platform UI bileşeni.
 *
 * SEO notu: entegrasyonda `headingLevel: 2` kullanın; mevcut ana sayfa H1 korunur.
 */

import type { PlatformIdentity } from '../../types/platform-product.ts';

/** PlatformHero içerik / erişilebilirlik seçenekleri. */
export interface PlatformHeroProps {
  /**
   * Platform kimliği (PR-002). Verilirse marka adı kimlikten alınabilir.
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
  /** CTA metni. */
  ctaLabel?: string;
  /**
   * CTA hedefi. Verilirse `<a href>` üretilir (ör. `#platform-products`).
   * Verilmezse yönlendirmesiz düğme.
   */
  ctaHref?: string;
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
  ctaLabel: string;
} {
  const brandName = props.brandName ?? props.identity?.name ?? DEFAULT_BRAND;
  const title = props.title ?? DEFAULT_TITLE;
  const description = props.description ?? DEFAULT_DESCRIPTION;
  const ctaLabel = props.ctaLabel ?? DEFAULT_CTA;
  return { brandName, title, description, ctaLabel };
}

/**
 * PlatformHero DOM ağacını oluşturur.
 */
export function createPlatformHeroElement(props: PlatformHeroProps = {}): HTMLElement {
  const { brandName, title, description, ctaLabel } = resolveCopy(props);
  const headingLevel = props.headingLevel === 2 ? 2 : 1;
  const titleId = 'ib-platform-hero-title';
  const ctaHref = props.ctaHref?.trim() || '';
  const hideCtaNote = Boolean(props.hideCtaNote) || Boolean(ctaHref);

  const section = document.createElement('section');
  section.className = ['ib-platform-hero', props.className].filter(Boolean).join(' ');
  section.setAttribute('data-platform-component', 'platform-hero');
  section.setAttribute('aria-labelledby', titleId);

  const inner = document.createElement('div');
  inner.className = 'ib-platform-hero__inner';

  const brand = document.createElement('p');
  brand.className = 'ib-platform-hero__brand';
  brand.textContent = brandName;

  const heading = document.createElement(headingLevel === 2 ? 'h2' : 'h1');
  heading.className = 'ib-platform-hero__title';
  heading.id = titleId;
  heading.textContent = title;

  const lead = document.createElement('p');
  lead.className = 'ib-platform-hero__description';
  lead.textContent = description;

  const actions = document.createElement('div');
  actions.className = 'ib-platform-hero__actions';
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', 'Platform eylemleri');

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

  inner.append(brand, heading, lead, actions);
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
