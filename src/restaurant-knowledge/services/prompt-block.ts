import type { KnowledgeResolveResult } from '../types/resolve.ts';
import type { RestaurantSnapshot } from '../types/snapshot.ts';
import { summarizePaymentPolicies } from '../queries/payments.ts';

/** Compact snapshot overview for system prompts (token-budget aware). */
export function restaurantSnapshotToPromptBlock(
  snapshot: RestaurantSnapshot,
  options: { maxTables?: number; maxMenuItems?: number } = {},
): string {
  const maxTables = options.maxTables ?? 8;
  const maxMenu = options.maxMenuItems ?? 10;
  const lines: string[] = [
    '### Restaurant Knowledge Snapshot',
    `Restaurant: ${snapshot.restaurant.name} (id=${snapshot.restaurantId})`,
  ];
  if (snapshot.restaurant.city) lines.push(`City: ${snapshot.restaurant.city}`);
  if (snapshot.restaurant.cuisine?.length) {
    lines.push(`Cuisine: ${snapshot.restaurant.cuisine.join(', ')}`);
  }

  lines.push(`Dining rooms: ${snapshot.diningRooms.length}`);
  const tableLines = snapshot.tables.slice(0, maxTables).map((t) => {
    const flags = [
      t.quiet ? 'quiet' : null,
      t.outdoor ? 'outdoor' : null,
      t.windowSeat ? 'window' : null,
      t.vip ? 'vip' : null,
      t.status,
    ]
      .filter(Boolean)
      .join(',');
    return `- ${t.name}: cap=${t.capacity} salon=${t.salon || '-'} [${flags}]`;
  });
  if (tableLines.length) {
    lines.push('Tables:');
    lines.push(...tableLines);
  }

  const menuLines = snapshot.menu.items
    .filter((i) => i.active !== false)
    .slice(0, maxMenu)
    .map(
      (i) =>
        `- ${i.name}: ${i.price ?? '?'}${i.currency || 'TRY'}${
          i.dietaryTags?.length ? ` (${i.dietaryTags.join(',')})` : ''
        }`,
    );
  if (menuLines.length) {
    lines.push('Menu sample:');
    lines.push(...menuLines);
  }

  if (snapshot.campaigns.length) {
    lines.push(
      `Campaigns: ${snapshot.campaigns
        .filter((c) => c.active !== false)
        .map((c) => c.name)
        .join(', ')}`,
    );
  }

  if (snapshot.businessHours.length) {
    const today = new Date(`${snapshot.asOfDate}T12:00:00`).getDay();
    const hours = snapshot.businessHours.find((h) => h.day === today);
    if (hours) {
      lines.push(
        hours.closed
          ? 'Hours today: closed'
          : `Hours today: ${hours.open}-${hours.close}`,
      );
    }
  }

  lines.push(`Payments: ${summarizePaymentPolicies(snapshot)}`);

  if (snapshot.loyaltyRules.length) {
    lines.push(
      `Loyalty: ${snapshot.loyaltyRules
        .filter((r) => r.active !== false)
        .map((r) => r.name)
        .join(', ')}`,
    );
  }

  if (snapshot.occupancy) {
    const o = snapshot.occupancy;
    lines.push(
      `Occupancy (${o.date}): availableTables=${o.availableTables}, occupied=${o.occupiedTables}, reservations=${o.openReservations}, load=${o.estimatedLoadPercent ?? '?'}%`,
    );
  }

  return lines.join('\n');
}

export function knowledgeResolveResultToPromptBlock(
  result: KnowledgeResolveResult,
): string {
  const base = restaurantSnapshotToPromptBlock(result.snapshot);
  const candidateLines: string[] = ['', '### Knowledge Resolver Candidates'];
  candidateLines.push(`Query: ${result.query}`);

  if (result.constraints.partySize) {
    candidateLines.push(`Party size: ${result.constraints.partySize}`);
  }
  if (result.constraints.quietPreferred) candidateLines.push('Preference: quiet');
  if (result.constraints.outdoorPreferred) candidateLines.push('Preference: outdoor');

  if (result.candidates.tables.length) {
    candidateLines.push('Table candidates:');
    for (const c of result.candidates.tables) {
      candidateLines.push(
        `- ${c.table.name} (cap=${c.table.capacity}, score=${c.score}): ${c.reasons.join(', ') || 'uygun'}`,
      );
    }
  } else {
    candidateLines.push('Table candidates: none');
  }

  if (result.candidates.menuItems.length) {
    candidateLines.push('Menu candidates:');
    for (const c of result.candidates.menuItems) {
      candidateLines.push(
        `- ${c.item.name} (score=${c.score}): ${c.reasons.join(', ') || 'uygun'}`,
      );
    }
  }

  if (result.candidates.campaigns.length) {
    candidateLines.push(
      `Campaigns: ${result.candidates.campaigns.map((c) => c.campaign.name).join(', ')}`,
    );
  }

  return `${base}\n${candidateLines.join('\n')}`;
}
