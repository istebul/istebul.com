/**
 * İSTEBUL PlatformHero — ilk çalışan Platform UI bileşeni.
 *
 * PR-004: Gerçek DOM üreticisi. Hiçbir HTML / route / ürün modülü
 * bu dosyayı henüz import etmemelidir.
 */

import type { PlatformIdentity } from '../../types/platform-product';

/** PlatformHero içerik / erişilebilirlik seçenekleri. */
export interface PlatformHeroProps {
  /**
   * Platform kimliği (PR-002). Verilirse marka adı kimlikten alınabilir;
   * başlık ve açıklama varsayılanları korunur veya `title` / `description` ile override edilir.
   */
  identity?: Pick<PlatformIdentity, 'name' | 'shortName' | 'slogan' | 'shortDescription'>;
  /** Ana başlık (H1). */
  title?: string;
  /** Alt açıklama. */
  description?: string;
  /** Marka / ürün adı (kahraman düzeyinde). */
  brandName?: string;
  /** CTA metni — yönlendirme yok; yer tutucu düğme. */
  ctaLabel?: string;
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
 * CTA tıklanınca gezinmez; gelecekte Platform Landing bağlayacaktır.
 */
export function createPlatformHeroElement(props: PlatformHeroProps = {}): HTMLElement {
  const { brandName, title, description, ctaLabel } = resolveCopy(props);

  const section = document.createElement('section');
  section.className = ['ib-platform-hero', props.className].filter(Boolean).join(' ');
  section.setAttribute('data-platform-component', 'platform-hero');
  section.setAttribute('aria-labelledby', 'ib-platform-hero-title');

  const inner = document.createElement('div');
  inner.className = 'ib-platform-hero__inner';

  const brand = document.createElement('p');
  brand.className = 'ib-platform-hero__brand';
  brand.textContent = brandName;

  const heading = document.createElement('h1');
  heading.className = 'ib-platform-hero__title';
  heading.id = 'ib-platform-hero-title';
  heading.textContent = title;

  const lead = document.createElement('p');
  lead.className = 'ib-platform-hero__description';
  lead.textContent = description;

  const actions = document.createElement('div');
  actions.className = 'ib-platform-hero__actions';
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', 'Platform eylemleri');

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'ib-platform-hero__cta';
  cta.textContent = ctaLabel;
  cta.setAttribute('data-platform-cta', 'discover-products');
  cta.setAttribute(
    'aria-describedby',
    'ib-platform-hero-cta-note'
  );
  /* Yönlendirme yok — PR-004 yerleşimi / cutover ayrı PR. */
  cta.addEventListener('click', (event) => {
    event.preventDefault();
  });

  const ctaNote = document.createElement('span');
  ctaNote.className = 'ib-platform-hero__cta-note';
  ctaNote.id = 'ib-platform-hero-cta-note';
  ctaNote.textContent = 'Yönlendirme henüz etkin değil.';

  actions.append(cta, ctaNote);
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
