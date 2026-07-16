import { AIAuditLogger } from '../../ai-core/services/AIAuditLogger.ts';
import type { KnowledgeService } from '../../restaurant-knowledge/index.ts';
import { ActionHintsAdapter } from '../adapters/ActionHintsAdapter.ts';
import { ConciergeAdapter } from '../adapters/ConciergeAdapter.ts';
import { CoreProviderAdapter } from '../adapters/CoreProviderAdapter.ts';
import { KnowledgeAdapter } from '../adapters/KnowledgeAdapter.ts';
import { DecisionContext } from '../context/DecisionContext.ts';
import { DecisionAudit } from '../services/DecisionAudit.ts';
import type {
  ConciergeTurnLike,
  DecisionInput,
  DecisionKind,
  DecisionProviderCode,
  DecisionResult,
} from '../types.ts';
import { CampaignEngine } from './CampaignEngine.ts';
import { GuaranteeEngine } from './GuaranteeEngine.ts';
import { PredictionEngine } from './PredictionEngine.ts';
import { RecommendationEngine } from './RecommendationEngine.ts';

export interface CreateAIDecisionEngineOptions {
  restaurantId?: string;
  provider?: DecisionProviderCode;
  knowledge?: KnowledgeService;
  audit?: AIAuditLogger;
  seedDemo?: boolean;
}

export interface AIDecisionEngine {
  decide(input: DecisionInput): Promise<DecisionResult>;
  decideFromConciergeTurn(
    turn: ConciergeTurnLike,
    kind?: DecisionKind,
  ): Promise<DecisionResult>;
  readonly recommendations: RecommendationEngine;
  readonly predictions: PredictionEngine;
  readonly guarantee: GuaranteeEngine;
  readonly campaigns: CampaignEngine;
  readonly audit: DecisionAudit;
}

class AIDecisionEngineImpl implements AIDecisionEngine {
  readonly recommendations = new RecommendationEngine();
  readonly predictions = new PredictionEngine();
  readonly guarantee = new GuaranteeEngine();
  readonly campaigns = new CampaignEngine();
  readonly audit: DecisionAudit;

  private readonly knowledge: KnowledgeAdapter;
  private readonly concierge = new ConciergeAdapter();
  private readonly actions = new ActionHintsAdapter();
  private readonly providers = new CoreProviderAdapter();
  private readonly providerCode: DecisionProviderCode;

  constructor(options: CreateAIDecisionEngineOptions = {}) {
    const restaurantId = options.restaurantId || 'demo-cafe';
    this.providerCode = options.provider || 'mock';
    this.knowledge = new KnowledgeAdapter(options.knowledge, restaurantId);
    const coreAudit = options.audit || new AIAuditLogger({ defaultProvider: 'mock' });
    this.audit = new DecisionAudit(coreAudit);
  }

  async decide(input: DecisionInput): Promise<DecisionResult> {
    const provider = this.providers.resolve(input.extras?.provider as DecisionProviderCode || this.providerCode);
    const snapshot = await this.knowledge.loadSnapshot(input.restaurantId, input.date);
    const ctx = new DecisionContext({
      input,
      snapshot,
      provider: provider.code,
    });

    let result: DecisionResult;

    switch (input.kind) {
      case 'suggest_table': {
        const recommendations = this.recommendations.suggestTables(ctx);
        result = baseResult(ctx, input.kind, provider.code, recommendations, {
          summary:
            recommendations[0]
              ? `Masa önerisi: ${recommendations[0].label} (skor ${recommendations[0].score})`
              : 'Uygun masa bulunamadı',
        });
        break;
      }
      case 'suggest_reservation': {
        const recommendations = this.recommendations.suggestReservationSlots(ctx);
        result = baseResult(ctx, input.kind, provider.code, recommendations, {
          summary:
            recommendations[0]
              ? `Rezervasyon önerisi: ${recommendations[0].label}`
              : 'Uygun slot yok',
        });
        break;
      }
      case 'suggest_menu': {
        const recommendations = this.recommendations.suggestMenu(ctx);
        result = baseResult(ctx, input.kind, provider.code, recommendations, {
          summary:
            recommendations[0]
              ? `Menü önerisi: ${recommendations[0].label}`
              : 'Menü önerisi yok',
        });
        break;
      }
      case 'suggest_campaign': {
        const recommendations = this.campaigns.suggest(ctx);
        result = baseResult(ctx, input.kind, provider.code, recommendations, {
          summary:
            recommendations[0]
              ? `Kampanya önerisi: ${recommendations[0].label}`
              : 'Aktif kampanya yok',
        });
        break;
      }
      case 'suggest_guarantee': {
        const g = this.guarantee.suggest(ctx);
        result = baseResult(ctx, input.kind, provider.code, g.recommendations, {
          summary: g.summary,
          guarantee: {
            amount: g.amount,
            currency: g.currency,
            required: g.required,
            policyId: g.policyId,
          },
        });
        break;
      }
      case 'predict_density': {
        const p = this.predictions.predict(ctx);
        result = baseResult(ctx, input.kind, provider.code, [], {
          summary: `Yoğunluk tahmini: %${p.densityPct} (${p.band})`,
          predictions: {
            densityPct: p.densityPct,
            band: p.band,
            waitMinutes: p.waitMinutes,
            kitchenLoadPct: p.kitchenLoadPct,
          },
        });
        break;
      }
      case 'predict_wait_time': {
        const p = this.predictions.predict(ctx);
        result = baseResult(ctx, input.kind, provider.code, [], {
          summary: `Bekleme süresi tahmini: ~${p.waitMinutes} dk`,
          predictions: {
            densityPct: p.densityPct,
            waitMinutes: p.waitMinutes,
            band: p.band,
            kitchenLoadPct: p.kitchenLoadPct,
          },
        });
        break;
      }
      case 'analyze_kitchen_load': {
        const p = this.predictions.predict(ctx);
        result = baseResult(ctx, input.kind, provider.code, [], {
          summary: `Mutfak yükü analizi: %${p.kitchenLoadPct} (${p.band})`,
          predictions: {
            densityPct: p.densityPct,
            waitMinutes: p.waitMinutes,
            kitchenLoadPct: p.kitchenLoadPct,
            band: p.band,
          },
        });
        break;
      }
      default: {
        result = {
          ok: false,
          kind: input.kind,
          restaurantId: input.restaurantId,
          provider: provider.code,
          remoteCallAttempted: false,
          summary: `Bilinmeyen karar türü: ${input.kind}`,
          recommendations: [],
        };
      }
    }

    result = this.actions.attach(result);
    const auditId = await this.audit.log(result, input.conversationId);
    return { ...result, auditId };
  }

  decideFromConciergeTurn(
    turn: ConciergeTurnLike,
    kind?: DecisionKind,
  ): Promise<DecisionResult> {
    return this.decide(this.concierge.toDecisionInput(turn, kind));
  }
}

function baseResult(
  ctx: DecisionContext,
  kind: DecisionKind,
  provider: DecisionProviderCode,
  recommendations: DecisionResult['recommendations'],
  extra: Partial<DecisionResult>,
): DecisionResult {
  return {
    ok: true,
    kind,
    restaurantId: ctx.restaurantId,
    provider,
    remoteCallAttempted: false,
    summary: extra.summary || kind,
    recommendations,
    predictions: extra.predictions,
    guarantee: extra.guarantee,
    data: {
      asOfDate: ctx.asOfDate,
      partySize: ctx.partySize,
      time: ctx.time,
      tableCount: ctx.snapshot.tables.length,
      availableTables: ctx.availableTables.length,
    },
  };
}

/**
 * One-line bootstrap:
 *   const brain = createAIDecisionEngine({ restaurantId: 'demo-cafe' });
 *   await brain.decide({ kind: 'suggest_table', restaurantId: 'demo-cafe', partySize: 2 });
 */
export function createAIDecisionEngine(
  options: CreateAIDecisionEngineOptions = {},
): AIDecisionEngine {
  return new AIDecisionEngineImpl(options);
}
