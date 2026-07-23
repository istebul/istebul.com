import type {
  KnowledgeResolveInput,
  KnowledgeResolveResult,
  ResolveConstraints,
  CampaignCandidate,
} from '../types/resolve.ts';
import { scoreTableCandidates } from '../queries/tables.ts';
import { scoreMenuCandidates } from '../queries/menu.ts';
import { KnowledgeService } from './KnowledgeService.ts';
import { knowledgeResolveResultToPromptBlock } from './prompt-block.ts';

const PARTY_RE =
  /(\d+)\s*(?:kişilik|kisi|kişi|kiş|person|pax|people)/i;
const QUIET_RE = /sessiz|sakin|quiet|calm|huzur/i;
const OUTDOOR_RE = /teras|bahçe|bahce|açık|acik|outdoor|patio/i;
const INDOOR_RE = /içeri|icerı|salon|indoor/i;
const WINDOW_RE = /pencere|window/i;
const ACCESSIBLE_RE = /engelli|tekerlekli|accessible|wheelchair/i;
const VIP_RE = /vip|özel|ozel/i;
const PRICE_RE = /(?:max|en fazla|bütçe|butce|under)\s*(\d+)/i;
const TIME_RE = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/;
const DATE_RE = /\b(20\d{2}-\d{2}-\d{2})\b/;
const VEG_RE = /vejetaryen|vegetarian|vegan|gluten/i;

/**
 * Knowledge Resolver
 *
 * AI query ("4 kişilik sessiz masa")
 *   → Restaurant Snapshot
 *   → uygun adaylar
 *   → prompt block (LLM consumes later via AI Core)
 *
 * This class never calls an LLM.
 */
export class KnowledgeResolver {
  readonly knowledge: KnowledgeService;

  constructor(knowledge: KnowledgeService = new KnowledgeService()) {
    this.knowledge = knowledge;
  }

  parseConstraints(
    query: string,
    extras: { partySize?: number; date?: string } = {},
  ): ResolveConstraints {
    const partyMatch = query.match(PARTY_RE);
    const priceMatch = query.match(PRICE_RE);
    const timeMatch = query.match(TIME_RE);
    const dateMatch = query.match(DATE_RE);
    const dietaryTags: string[] = [];
    if (/vejetaryen|vegetarian/i.test(query)) dietaryTags.push('vejetaryen');
    if (/vegan/i.test(query)) dietaryTags.push('vegan');
    if (/gluten/i.test(query)) dietaryTags.push('gluten-free');

    return {
      partySize: extras.partySize ?? (partyMatch ? Number(partyMatch[1]) : undefined),
      quietPreferred: QUIET_RE.test(query) || undefined,
      outdoorPreferred: OUTDOOR_RE.test(query) || undefined,
      indoorPreferred: INDOOR_RE.test(query) && !OUTDOOR_RE.test(query) ? true : undefined,
      windowPreferred: WINDOW_RE.test(query) || undefined,
      accessiblePreferred: ACCESSIBLE_RE.test(query) || undefined,
      vipPreferred: VIP_RE.test(query) || undefined,
      date: extras.date || dateMatch?.[1],
      time: timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : undefined,
      dietaryTags: dietaryTags.length ? dietaryTags : undefined,
      maxPrice: priceMatch ? Number(priceMatch[1]) : undefined,
      menuQuery: VEG_RE.test(query) || /menü|menu|yemek|içek|icecek/i.test(query)
        ? query
        : undefined,
      rawQuery: query,
    };
  }

  async resolve(input: KnowledgeResolveInput): Promise<KnowledgeResolveResult> {
    const limit = input.limit ?? 5;
    const constraints = this.parseConstraints(input.query, {
      partySize: input.partySize,
      date: input.date,
    });

    const snapshotData =
      input.snapshot ||
      (await this.knowledge.getSnapshotData(input.restaurantId, {
        date: constraints.date || input.date,
      }));

    const tables = scoreTableCandidates(snapshotData, {
      partySize: constraints.partySize,
      quietPreferred: constraints.quietPreferred,
      outdoorPreferred: constraints.outdoorPreferred,
      indoorPreferred: constraints.indoorPreferred,
      windowPreferred: constraints.windowPreferred,
      accessiblePreferred: constraints.accessiblePreferred,
      vipPreferred: constraints.vipPreferred,
      salon: constraints.salon,
      limit,
    });

    const menuItems = scoreMenuCandidates(snapshotData, {
      query: constraints.menuQuery ? this.extractMenuNeedle(input.query) : undefined,
      dietaryTags: constraints.dietaryTags,
      maxPrice: constraints.maxPrice,
      limit,
    });

    const campaigns = this.scoreCampaigns(snapshotData.campaigns, input.query, limit);

    const result: KnowledgeResolveResult = {
      restaurantId: input.restaurantId,
      query: input.query,
      constraints,
      snapshot: snapshotData,
      candidates: { tables, menuItems, campaigns },
      promptBlock: '',
      summary: '',
    };
    result.promptBlock = knowledgeResolveResultToPromptBlock(result);
    result.summary = this.buildSummary(result);
    return result;
  }

  /**
   * AI Core port: returns only the prompt injection block (or null).
   */
  async resolveForOrchestrate(input: {
    restaurantId: string;
    userMessage: string;
    moduleId?: string;
    tags?: string[];
  }): Promise<{ promptBlock: string; summary: string } | null> {
    const resolved = await this.resolve({
      restaurantId: input.restaurantId,
      query: input.userMessage,
      moduleId: input.moduleId,
      tags: input.tags,
    });
    if (!resolved.promptBlock.trim()) return null;
    return {
      promptBlock: resolved.promptBlock,
      summary: resolved.summary,
    };
  }

  private extractMenuNeedle(query: string): string | undefined {
    if (VEG_RE.test(query)) return undefined;
    const cleaned = query
      .replace(PARTY_RE, ' ')
      .replace(QUIET_RE, ' ')
      .replace(OUTDOOR_RE, ' ')
      .replace(INDOOR_RE, ' ')
      .replace(/masa|rezervasyon|lütfen|lutfen|var mı|var mi/gi, ' ')
      .trim();
    return cleaned.length > 2 ? cleaned : undefined;
  }

  private scoreCampaigns(
    campaigns: KnowledgeResolveResult['snapshot']['campaigns'],
    query: string,
    limit: number,
  ): CampaignCandidate[] {
    const q = query.toLowerCase();
    return campaigns
      .filter((c) => c.active !== false)
      .map((campaign) => {
        const reasons: string[] = [];
        let score = 5;
        const hay = `${campaign.name} ${campaign.description || ''} ${(campaign.tags || []).join(' ')}`.toLowerCase();
        if (/indirim|kampanya|discount|promo/i.test(q) || /indirim|kampanya/.test(hay)) {
          score += 20;
          reasons.push('aktif kampanya');
        }
        if (campaign.discountPercent) {
          reasons.push(`%${campaign.discountPercent}`);
        }
        return { campaign, score, reasons };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private buildSummary(result: KnowledgeResolveResult): string {
    const top = result.candidates.tables[0];
    const bits = [
      `restaurant=${result.snapshot.restaurant.name}`,
      result.constraints.partySize
        ? `party=${result.constraints.partySize}`
        : null,
      top
        ? `topTable=${top.table.name}(${top.table.capacity}) score=${top.score}`
        : 'topTable=none',
      result.snapshot.occupancy
        ? `load=${result.snapshot.occupancy.estimatedLoadPercent ?? '?'}%`
        : null,
      `tables=${result.candidates.tables.length}`,
      `menu=${result.candidates.menuItems.length}`,
    ].filter(Boolean);
    return bits.join(' | ');
  }
}
