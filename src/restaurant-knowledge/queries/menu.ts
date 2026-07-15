import type { MenuItem } from '../entities/menu-item.ts';
import type { RestaurantSnapshot } from '../types/snapshot.ts';
import type { MenuCandidate } from '../types/resolve.ts';

export function listActiveMenuItems(snapshot: RestaurantSnapshot): MenuItem[] {
  return snapshot.menu.items.filter(
    (i) => i.active !== false && i.stockStatus !== 'out',
  );
}

export function findMenuItemsByCategory(
  snapshot: RestaurantSnapshot,
  categoryIdOrName: string,
): MenuItem[] {
  const key = categoryIdOrName.toLowerCase();
  return listActiveMenuItems(snapshot).filter(
    (i) =>
      (i.categoryId || '').toLowerCase() === key ||
      (i.categoryName || '').toLowerCase() === key,
  );
}

export function scoreMenuCandidates(
  snapshot: RestaurantSnapshot,
  opts: {
    query?: string;
    dietaryTags?: string[];
    maxPrice?: number;
    limit?: number;
  } = {},
): MenuCandidate[] {
  const limit = opts.limit ?? 8;
  const q = (opts.query || '').trim().toLowerCase();
  const dietary = (opts.dietaryTags || []).map((d) => d.toLowerCase());

  const scored: MenuCandidate[] = [];
  for (const item of listActiveMenuItems(snapshot)) {
    const reasons: string[] = [];
    let score = 5;

    if (opts.maxPrice !== undefined && item.price !== undefined) {
      if (item.price > opts.maxPrice) continue;
      score += 5;
    }

    if (q) {
      const hay = `${item.name} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
      if (hay.includes(q)) {
        score += 30;
        reasons.push(`eşleşme: ${q}`);
      } else if (q.split(/\s+/).some((token) => token.length > 2 && hay.includes(token))) {
        score += 15;
        reasons.push('kısmi eşleşme');
      } else {
        continue;
      }
    }

    if (dietary.length) {
      const tags = (item.dietaryTags || []).map((t) => t.toLowerCase());
      const hit = dietary.filter((d) => tags.includes(d));
      if (hit.length) {
        score += hit.length * 12;
        reasons.push(`diyet: ${hit.join(', ')}`);
      }
    }

    if (item.price !== undefined) {
      reasons.push(`${item.price} ${item.currency || 'TRY'}`);
    }

    scored.push({ item, score, reasons });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
