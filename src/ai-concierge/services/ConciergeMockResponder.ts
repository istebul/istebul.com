import type { KnowledgeResolveResult } from '../../restaurant-knowledge/types/resolve.ts';
import type {
  ConciergeIntent,
  ConciergeMemoryState,
  ConciergeSuggestionCard,
} from '../types.ts';
import { ConciergeMemory } from '../memory/ConciergeMemory.ts';

export interface ConciergeMockResponse {
  content: string;
  suggestionCards: ConciergeSuggestionCard[];
  memoryPatch?: Partial<ConciergeMemoryState>;
}

function hoursLine(knowledge: KnowledgeResolveResult): string {
  const hours = knowledge.snapshot.businessHours;
  if (!hours.length) return 'Çalışma saatleri bilgisi yakında.';
  const open = hours.filter((h) => !h.closed);
  if (!open.length) return 'Bugün kapalı görünüyor.';
  const sample = open[0];
  return `Tipik açık saat: ${sample.open || '?'}–${sample.close || '?'}.`;
}

function paymentLine(knowledge: KnowledgeResolveResult): string {
  const policy = knowledge.snapshot.paymentPolicies[0];
  if (!policy) return '';
  const bits: string[] = [];
  if (policy.requiresDeposit) {
    bits.push(
      policy.depositPercent
        ? `Depozito: %${policy.depositPercent}`
        : 'Depozito gerekli',
    );
  }
  if (policy.cancellationHours != null) {
    bits.push(`İptal: ${policy.cancellationHours} saat önce`);
  }
  return bits.length ? bits.join(' · ') : '';
}

function tableCards(
  knowledge: KnowledgeResolveResult,
  limit = 3,
): ConciergeSuggestionCard[] {
  return knowledge.candidates.tables.slice(0, limit).map((c, i) => ({
    id: `table-${c.table.id || i}`,
    title: c.table.name,
    description: `${c.table.capacity} kişilik${c.table.salon ? ` · ${c.table.salon}` : ''}${
      c.reasons.length ? ` · ${c.reasons.slice(0, 2).join(', ')}` : ''
    }`,
    prompt: `${c.table.name} masasını tercih ediyorum`,
    kind: 'table' as const,
  }));
}

function menuCards(
  knowledge: KnowledgeResolveResult,
  limit = 3,
): ConciergeSuggestionCard[] {
  const fromCandidates = knowledge.candidates.menuItems.slice(0, limit).map((c, i) => ({
    id: `menu-${c.item.id || i}`,
    title: c.item.name,
    description: `${c.item.price != null ? `${c.item.price} TL` : 'Fiyat yakında'}${
      c.reasons.length ? ` · ${c.reasons[0]}` : ''
    }`,
    prompt: `${c.item.name} için ön sipariş oluştur`,
    kind: 'menu' as const,
  }));
  if (fromCandidates.length) return fromCandidates;

  // Fallback: resolver needle may not match item names — use snapshot highlights.
  return knowledge.snapshot.menu.items
    .filter((item) => item.active !== false && item.stockStatus !== 'out')
    .slice(0, limit)
    .map((item, i) => ({
      id: `menu-snap-${item.id || i}`,
      title: item.name,
      description: item.price != null ? `${item.price} TL` : 'Fiyat yakında',
      prompt: `${item.name} için ön sipariş oluştur`,
      kind: 'menu' as const,
    }));
}

function campaignCards(
  knowledge: KnowledgeResolveResult,
  limit = 3,
): ConciergeSuggestionCard[] {
  return knowledge.candidates.campaigns.slice(0, limit).map((c, i) => ({
    id: `campaign-${c.campaign.id || i}`,
    title: c.campaign.name,
    description:
      c.campaign.description ||
      (c.campaign.discountPercent ? `%${c.campaign.discountPercent} indirim` : 'Aktif kampanya'),
    prompt: `${c.campaign.name} kampanyasını uygula`,
    kind: 'campaign' as const,
  }));
}

/**
 * Smart mock responses derived from Knowledge Resolver + memory + intent.
 * Used when provider === 'mock' so full Concierge flow works without live LLM keys.
 */
export class ConciergeMockResponder {
  respond(input: {
    intent: ConciergeIntent;
    memory: ConciergeMemoryState;
    knowledge: KnowledgeResolveResult;
  }): ConciergeMockResponse {
    const { intent, memory, knowledge } = input;
    const name = knowledge.snapshot.restaurant.name;
    const load = knowledge.snapshot.occupancy?.estimatedLoadPercent;
    const loadNote =
      load != null ? `Şu an yaklaşık %${load} doluluk.` : '';

    switch (intent.id) {
      case 'create_reservation': {
        const party = memory.partySize || intent.slots.partySize || 2;
        const date = memory.date || intent.slots.date || 'bugün';
        const time = memory.time || intent.slots.time || '19:00';
        const top = knowledge.candidates.tables[0];
        const cards = tableCards(knowledge);
        const lines = [
          `${name} için rezervasyon taslağı hazırlıyorum.`,
          `• ${date} · ${time} · ${party} kişi`,
          top
            ? `• Önerilen masa: ${top.table.name} (${top.table.capacity} kişilik)`
            : '• Uygun masa adaylarını aşağıya ekledim.',
          loadNote,
          hoursLine(knowledge),
          paymentLine(knowledge),
          'Onaylamak için masa seçebilir veya “rezervasyon özeti göster” diyebilirsiniz.',
        ].filter(Boolean);
        return {
          content: lines.join('\n'),
          suggestionCards: cards.length
            ? cards
            : [
                {
                  id: 'summary',
                  title: 'Rezervasyon özeti',
                  description: 'Seçimleri gözden geçir',
                  prompt: 'Rezervasyon özeti göster',
                  kind: 'summary',
                },
              ],
          memoryPatch: {
            partySize: party,
            date: typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : memory.date,
            time,
            reservationDraftReady: true,
            ...(top
              ? { tableId: top.table.id, tableName: top.table.name, salonPreference: top.table.salon }
              : {}),
          },
        };
      }

      case 'suggest_table': {
        const top = knowledge.candidates.tables[0];
        const pref = memory.tablePreference || intent.slots.tablePreference;
        const cards = tableCards(knowledge);
        const intro =
          pref === 'romantic'
            ? 'Romantik / sessiz masa önerileri:'
            : pref === 'family'
              ? 'Aile masası önerileri:'
              : 'Uygun masa önerileri:';
        const lines = [
          intro,
          top
            ? `1) ${top.table.name} — ${top.table.capacity} kişilik${
                top.reasons.length ? ` (${top.reasons.slice(0, 2).join(', ')})` : ''
              }`
            : 'Şu an net bir masa adayı bulamadım; tercihlerinizi netleştirebilirsiniz.',
          loadNote,
        ].filter(Boolean);
        return {
          content: lines.join('\n'),
          suggestionCards: cards,
          memoryPatch: top
            ? {
                tableId: top.table.id,
                tableName: top.table.name,
                salonPreference: top.table.salon || memory.salonPreference,
              }
            : undefined,
        };
      }

      case 'change_party_size': {
        const party = intent.slots.partySize || memory.partySize || 2;
        const top = knowledge.candidates.tables[0];
        return {
          content: [
            `Kişi sayısını ${party} olarak güncelledim.`,
            top
              ? `Bu sayıya uygun öneri: ${top.table.name} (${top.table.capacity} kişilik).`
              : 'Uygun masa için salon veya saat tercihini de paylaşabilirsiniz.',
          ].join('\n'),
          suggestionCards: tableCards(knowledge),
          memoryPatch: { partySize: party },
        };
      }

      case 'suggest_datetime': {
        const date = memory.date || intent.slots.date;
        const suggestions = ['18:30', '19:00', '20:00', '21:00'];
        const hours = hoursLine(knowledge);
        return {
          content: [
            date ? `${date} için uygun saat önerileri:` : 'Uygun saat önerileri:',
            suggestions.map((t) => `• ${t}`).join('\n'),
            hours,
            loadNote,
            'Bir saat seçin; rezervasyon taslağına ekleyeyim.',
          ]
            .filter(Boolean)
            .join('\n'),
          suggestionCards: suggestions.slice(0, 3).map((t) => ({
            id: `time-${t}`,
            title: t,
            description: date ? `${date} · ${t}` : t,
            prompt: date ? `${date} saat ${t} için rezervasyon oluştur` : `Saat ${t} için rezervasyon oluştur`,
            kind: 'reservation' as const,
          })),
          memoryPatch: date ? { date } : undefined,
        };
      }

      case 'suggest_menu': {
        const items = knowledge.candidates.menuItems;
        const fallback = knowledge.snapshot.menu.items.filter(
          (item) => item.active !== false && item.stockStatus !== 'out',
        );
        const listed = items.length
          ? items.slice(0, 3).map(
              (c, i) =>
                `${i + 1}) ${c.item.name}${
                  c.item.price != null ? ` — ${c.item.price} TL` : ''
                }`,
            )
          : fallback.slice(0, 3).map(
              (item, i) =>
                `${i + 1}) ${item.name}${
                  item.price != null ? ` — ${item.price} TL` : ''
                }`,
            );
        return {
          content: [
            `${name} menüsünden önerilerim:`,
            listed.length
              ? listed.join('\n')
              : 'Menü adayları şu an sınırlı; “vejetaryen” veya bütçe belirtebilirsiniz.',
            'Beğendiğinizi ön siparişe ekleyebilirim.',
          ].join('\n'),
          suggestionCards: menuCards(knowledge),
        };
      }

      case 'create_preorder': {
        const items = knowledge.candidates.menuItems.slice(0, 2);
        const fallbackItems = knowledge.snapshot.menu.items
          .filter((item) => item.active !== false && item.stockStatus !== 'out')
          .slice(0, 2);
        const preorder = (items.length ? items.map((c) => c.item) : fallbackItems).map(
          (item) => ({ name: item.name, quantity: 1 }),
        );
        if (!preorder.length && memory.preorder?.length) {
          return {
            content: `Mevcut ön siparişiniz: ${memory.preorder
              .map((p) => `${p.quantity}x ${p.name}`)
              .join(', ')}`,
            suggestionCards: [
              {
                id: 'summary',
                title: 'Rezervasyon özeti',
                description: 'Ön sipariş dahil özet',
                prompt: 'Rezervasyon özeti göster',
                kind: 'summary',
              },
            ],
          };
        }
        return {
          content: preorder.length
            ? `Ön sipariş taslağı:\n${preorder
                .map((p) => `• ${p.quantity}x ${p.name}`)
                .join('\n')}\nOnaylamak için “rezervasyon özeti göster” diyebilirsiniz.`
            : 'Ön sipariş için önce bir menü önerisi seçelim.',
          suggestionCards: preorder.length
            ? [
                {
                  id: 'summary',
                  title: 'Rezervasyon özeti',
                  description: 'Ön sipariş dahil',
                  prompt: 'Rezervasyon özeti göster',
                  kind: 'summary',
                },
                ...menuCards(knowledge, 2),
              ]
            : menuCards(knowledge),
          memoryPatch: preorder.length ? { preorder } : undefined,
        };
      }

      case 'suggest_campaign': {
        const campaigns = knowledge.candidates.campaigns;
        const top = campaigns[0];
        return {
          content: top
            ? [
                'Aktif kampanyalar:',
                ...campaigns.slice(0, 3).map(
                  (c) =>
                    `• ${c.campaign.name}${
                      c.campaign.discountPercent
                        ? ` (%${c.campaign.discountPercent})`
                        : ''
                    }${c.campaign.description ? ` — ${c.campaign.description}` : ''}`,
                ),
                'Bir kampanya seçerseniz rezervasyonunuza not düşerim.',
              ].join('\n')
            : 'Şu an listelenen aktif kampanya yok.',
          suggestionCards: campaignCards(knowledge),
          memoryPatch: top ? { campaign: top.campaign.name } : undefined,
        };
      }

      case 'show_reservation_summary': {
        const mem = new ConciergeMemory(
          memory.restaurantSlug,
          memory.restaurantId,
          memory,
        );
        const lines = mem.toSummaryLines();
        return {
          content: lines.length
            ? [`${name} — rezervasyon özeti:`, ...lines.map((l) => `• ${l}`)].join(
                '\n',
              )
            : 'Henüz kayıtlı bir seçim yok. “Bugün rezervasyon” veya “masa öner” ile başlayabilirsiniz.',
          suggestionCards: [
            {
              id: 'continue-reservation',
              title: 'Rezervasyona devam',
              description: 'CX sihirbazına geç',
              prompt: 'Bugün için rezervasyon oluşturmak istiyorum',
              kind: 'reservation',
            },
            ...tableCards(knowledge, 2),
          ],
        };
      }

      default: {
        return {
          content: [
            `Buyurun — ${name} için yardımcı olayım.`,
            'Rezervasyon, masa, menü, ön sipariş veya kampanya sorabilirsiniz.',
            loadNote,
            hoursLine(knowledge),
          ]
            .filter(Boolean)
            .join('\n'),
          suggestionCards: [
            {
              id: 'qp-res',
              title: 'Bugün rezervasyon',
              description: 'Hızlı başlangıç',
              prompt: 'Bugün için rezervasyon oluşturmak istiyorum',
              kind: 'reservation',
            },
            ...tableCards(knowledge, 1),
            ...campaignCards(knowledge, 1),
          ],
        };
      }
    }
  }
}

export const defaultConciergeMockResponder = new ConciergeMockResponder();
