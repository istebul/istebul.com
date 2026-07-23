/**
 * P8-B Restaurant Knowledge Graph — runtime behavior.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const kg = await import('../../src/restaurant-knowledge/index.ts');
const core = await import('../../src/ai-core/index.ts');

describe('P8-B Restaurant Knowledge Graph runtime', () => {
  it('builds a nested restaurant snapshot from demo seed', async () => {
    const { service } = kg.createRestaurantKnowledge({ restaurantId: 'demo-lokanta' });
    const snap = await service.getSnapshotData('demo-lokanta');

    assert.equal(snap.restaurant.name, 'Demo Lokanta');
    assert.ok(snap.diningRooms.length >= 2);
    assert.ok(snap.tables.length >= 4);
    assert.ok(snap.menu.categories.length >= 2);
    assert.ok(snap.menu.items.length >= 3);
    assert.ok(snap.campaigns.length >= 1);
    assert.ok(snap.businessHours.length >= 7);
    assert.ok(snap.paymentPolicies.length >= 1);
    assert.ok(snap.loyaltyRules.length >= 1);
    assert.ok(snap.occupancy);
    assert.equal(snap.meta?.version, kg.KNOWLEDGE_SNAPSHOT_VERSION);
  });

  it('resolves 4-person quiet table candidates without LLM', async () => {
    const { resolver } = kg.createRestaurantKnowledge({ restaurantId: 'demo-lokanta' });
    const result = await resolver.resolve({
      restaurantId: 'demo-lokanta',
      query: '4 kişilik sessiz masa',
      moduleId: 'reservation',
    });

    assert.equal(result.constraints.partySize, 4);
    assert.equal(result.constraints.quietPreferred, true);
    assert.ok(result.candidates.tables.length >= 1);
    const top = result.candidates.tables[0];
    assert.equal(top.table.capacity >= 4, true);
    assert.equal(top.table.quiet, true);
    assert.ok(result.promptBlock.includes('Knowledge Resolver Candidates'));
    assert.ok(result.promptBlock.includes('M4') || result.promptBlock.includes('Table candidates'));
    assert.match(result.summary, /party=4/);
  });

  it('exposes query helpers via KnowledgeService', async () => {
    const { service } = kg.createRestaurantKnowledge({ restaurantId: 'demo-lokanta' });
    const snap = await service.getSnapshotData('demo-lokanta');
    const available = service.queries.tables.listAvailableTables(snap);
    assert.ok(available.every((t) => t.status === 'available'));
    const low = service.queries.inventory.listLowStock(snap);
    assert.ok(Array.isArray(low));
    const pay = service.queries.payments.summarizePaymentPolicies(snap);
    assert.match(pay, /garanti|depozito|Rezervasyon/i);
  });

  it('wires optionally into AIOrchestrator → PromptBuilder path', async () => {
    const { resolver } = kg.createRestaurantKnowledge({ restaurantId: 'demo-lokanta' });
    const ai = core.createAICore({ provider: 'mock' }, { knowledgeResolver: resolver });

    const result = await ai.orchestrate({
      moduleId: 'reservation',
      restaurantId: 'demo-lokanta',
      userMessage: '4 kişilik sessiz masa istiyorum',
    });

    assert.equal(result.ok, true);
    assert.equal(result.remoteCallAttempted, false);
    const system = result.messages.find((m) => m.role === 'system');
    assert.ok(system);
    assert.match(system.content, /Restaurant Knowledge Snapshot/);
    assert.match(system.content, /Table candidates/);
  });

  it('keeps default createAICore free of knowledge (P8-A compatible)', async () => {
    const ai = core.createAICore({ provider: 'mock' });
    assert.equal(ai.knowledgeResolver, undefined);
    const result = await ai.orchestrate({
      moduleId: 'reservation',
      restaurantId: 'r-plain',
      userMessage: 'Merhaba',
    });
    assert.equal(result.ok, true);
    const system = result.messages.find((m) => m.role === 'system');
    assert.ok(system);
    assert.doesNotMatch(system.content, /Knowledge Resolver Candidates/);
  });
});
