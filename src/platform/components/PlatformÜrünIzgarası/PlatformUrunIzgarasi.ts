/**
 * İSTEBUL PlatformÜrünIzgarası — ürün kartlarını düzenli yerleştiren ızgara.
 *
 * PR-550: PlatformProduct[] kabul eder; her öğe için PlatformÜrünKartı üretir.
 * Hiçbir HTML / route / ürün modülü bu dosyayı henüz import etmemelidir.
 */

import type { PlatformProduct } from '../../types/platform-product.ts';
import { createPlatformUrunKartiElement } from '../PlatformÜrünKartı/PlatformUrunKarti.ts';

/** Desteklenen maksimum sütun sayısı (responsive üst sınır). */
export type PlatformUrunIzgarasiColumns = 1 | 2 | 3;

export type PlatformUrunIzgarasiViewState = 'ready' | 'loading' | 'empty';

export interface PlatformUrunIzgarasiProps {
  /** Platform Kimliği ürün listesi (PR-002 modeli). */
  products: readonly PlatformProduct[];
  /**
   * Masaüstünde en fazla sütun sayısı.
   * Dar ekranlarda otomatik olarak 1 / 2’ye düşer.
   */
  columns?: PlatformUrunIzgarasiColumns;
  /** true iken iskelet yükleme görünümü (ürün kartı yerine). */
  loading?: boolean;
  /** Yükleme sırasında skeleton adedi (1–6). */
  loadingPlaceholderCount?: number;
  /** Boş durum başlığı. */
  emptyTitle?: string;
  /** Boş durum açıklaması. */
  emptyDescription?: string;
  /** Kart CTA metni. */
  ctaLabel?: string;
  /**
   * true ise kartlar `product.url` ile mevcut girişlere gider.
   * Yeni route oluşturmaz.
   */
  enableNavigation?: boolean;
  /** Bölüm erişilebilir adı. */
  ariaLabel?: string;
  /** Başlık kimliği (harici H2 ile ilişkilendirme). */
  labelledBy?: string;
  /** `order` alanına göre sırala (varsayılan: true). */
  sortByOrder?: boolean;
  /** Kök sınıfa eklenti. */
  className?: string;
}

const DEFAULT_EMPTY_TITLE = 'Henüz ürün bulunmuyor';
const DEFAULT_EMPTY_DESCRIPTION =
  'Platform ürünleri yakında bu listede görünecek.';
const DEFAULT_ARIA_LABEL = 'Platform ürünleri';
const DEFAULT_COLUMNS: PlatformUrunIzgarasiColumns = 3;

function normalizeProducts(
  products: readonly PlatformProduct[] | null | undefined,
  sortByOrder: boolean
): PlatformProduct[] {
  const list = Array.isArray(products) ? [...products] : [];
  if (sortByOrder) {
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return list;
}

function resolveViewState(
  loading: boolean,
  products: readonly PlatformProduct[]
): PlatformUrunIzgarasiViewState {
  if (loading) return 'loading';
  if (products.length === 0) return 'empty';
  return 'ready';
}

function createLoadingSkeleton(index: number): HTMLElement {
  const item = document.createElement('div');
  item.className = 'ib-platform-urun-izgarasi__skeleton';
  item.setAttribute('aria-hidden', 'true');
  item.setAttribute('data-skeleton-index', String(index));

  const barTitle = document.createElement('span');
  barTitle.className = 'ib-platform-urun-izgarasi__skeleton-line ib-platform-urun-izgarasi__skeleton-line--title';

  const barBody = document.createElement('span');
  barBody.className = 'ib-platform-urun-izgarasi__skeleton-line ib-platform-urun-izgarasi__skeleton-line--body';

  const barMeta = document.createElement('span');
  barMeta.className = 'ib-platform-urun-izgarasi__skeleton-line ib-platform-urun-izgarasi__skeleton-line--meta';

  item.append(barTitle, barBody, barMeta);
  return item;
}

function createEmptyState(title: string, description: string): HTMLElement {
  const empty = document.createElement('div');
  empty.className = 'ib-platform-urun-izgarasi__empty';
  empty.setAttribute('role', 'status');

  const heading = document.createElement('p');
  heading.className = 'ib-platform-urun-izgarasi__empty-title';
  heading.textContent = title;

  const lead = document.createElement('p');
  lead.className = 'ib-platform-urun-izgarasi__empty-description';
  lead.textContent = description;

  empty.append(heading, lead);
  return empty;
}

/**
 * Platform ürün ızgarası DOM öğesini oluşturur.
 */
export function createPlatformUrunIzgarasiElement(
  props: PlatformUrunIzgarasiProps
): HTMLElement {
  if (!props || typeof props !== 'object') {
    throw new TypeError('PlatformÜrünIzgarası: geçerli props gerekir.');
  }

  const columns = props.columns ?? DEFAULT_COLUMNS;
  const loading = Boolean(props.loading);
  const sortByOrder = props.sortByOrder !== false;
  const products = normalizeProducts(props.products, sortByOrder);
  const viewState = resolveViewState(loading, products);

  const section = document.createElement('section');
  section.className = [
    'ib-platform-urun-izgarasi',
    `ib-platform-urun-izgarasi--cols-${columns}`,
    `ib-platform-urun-izgarasi--state-${viewState}`,
    props.className
  ]
    .filter(Boolean)
    .join(' ');
  section.setAttribute('data-platform-component', 'platform-urun-izgarasi');
  section.setAttribute('data-platform-grid-state', viewState);
  section.setAttribute('data-platform-grid-columns', String(columns));

  if (props.labelledBy) {
    section.setAttribute('aria-labelledby', props.labelledBy);
  } else {
    section.setAttribute('aria-label', props.ariaLabel?.trim() || DEFAULT_ARIA_LABEL);
  }

  if (viewState === 'loading') {
    section.setAttribute('aria-busy', 'true');
    const count = Math.min(6, Math.max(1, props.loadingPlaceholderCount ?? columns));
    const list = document.createElement('div');
    list.className = 'ib-platform-urun-izgarasi__grid';
    list.setAttribute('role', 'presentation');
    for (let i = 0; i < count; i += 1) {
      list.append(createLoadingSkeleton(i));
    }
    const sr = document.createElement('p');
    sr.className = 'ib-platform-urun-izgarasi__sr-only';
    sr.setAttribute('role', 'status');
    sr.textContent = 'Ürünler yükleniyor.';
    section.append(sr, list);
    return section;
  }

  if (viewState === 'empty') {
    section.append(
      createEmptyState(
        props.emptyTitle?.trim() || DEFAULT_EMPTY_TITLE,
        props.emptyDescription?.trim() || DEFAULT_EMPTY_DESCRIPTION
      )
    );
    return section;
  }

  const list = document.createElement('ul');
  list.className = 'ib-platform-urun-izgarasi__grid';
  list.setAttribute('role', 'list');

  for (const product of products) {
    const item = document.createElement('li');
    item.className = 'ib-platform-urun-izgarasi__item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('data-platform-product-id', product.id);

    const card = createPlatformUrunKartiElement({
      product,
      // Grid override yoksa kart ürünün `ctaLabel` değerini (katalog) kullanır.
      ctaLabel: props.ctaLabel?.trim() || undefined,
      enableNavigation: props.enableNavigation
    });
    item.append(card);
    list.append(item);
  }

  section.append(list);
  return section;
}

export function getPlatformUrunIzgarasiViewState(
  props: Pick<PlatformUrunIzgarasiProps, 'products' | 'loading'>
): PlatformUrunIzgarasiViewState {
  const products = Array.isArray(props.products) ? props.products : [];
  return resolveViewState(Boolean(props.loading), products);
}

export const PLATFORM_URUN_IZGARASI_DEFAULTS = Object.freeze({
  columns: DEFAULT_COLUMNS,
  emptyTitle: DEFAULT_EMPTY_TITLE,
  emptyDescription: DEFAULT_EMPTY_DESCRIPTION,
  ariaLabel: DEFAULT_ARIA_LABEL
});

export default createPlatformUrunIzgarasiElement;
