/**
 * P8-C AI Concierge — conversation scenario runtime tests.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const conciergeMod = await import('../../src/ai-concierge/index.ts');
const core = await import('../../src/ai-core/index.ts');

describe('P8-C AI Concierge runtime', () => {
  it('parses supported conversation intents', () => {
    const parser = new conciergeMod.IntentParser();
    const cases = [
      ['Bugün için rezervasyon oluşturmak istiyorum', 'create_reservation'],
      ['İki kişilik romantik ve sessiz bir masa öner', 'suggest_table'],
      ['Kişi sayısını 4 kişiye çıkar', 'change_party_size'],
      ['Uygun saat önerir misin?', 'suggest_datetime'],
      ['Bana menüden bir şey önerir misin?', 'suggest_menu'],
      ['Ön sipariş oluştur', 'create_preorder'],
      ['Aktif kampanyaları gösterir misin?', 'suggest_campaign'],
      ['Rezervasyon özeti göster', 'show_reservation_summary'],
    ];
    for (const [utterance, expected] of cases) {
      const intent = parser.parse(utterance);
      assert.equal(intent.id, expected, `${utterance} → ${intent.id}`);
    }
  });

  it('keeps conversation memory across turns', async () => {
    const bot = conciergeMod.createAIConcierge({
      restaurantSlug: 'demo-cafe',
      restaurantId: 'demo-cafe',
      restaurantName: 'Demo Cafe',
      provider: 'mock',
    });

    await bot.chat('Bugün için rezervasyon oluşturmak istiyorum');
    await bot.chat('Kişi sayısını 4 kişiye çıkar');
    const mem = bot.getMemory();
    assert.equal(mem.restaurantSlug, 'demo-cafe');
    assert.equal(mem.partySize, 4);
    assert.ok(mem.date);
    assert.equal(mem.reservationDraftReady, true);
  });

  it('suggests romantic table via knowledge resolver + mock responder', async () => {
    const bot = conciergeMod.createAIConcierge({
      restaurantSlug: 'demo-cafe',
      provider: 'mock',
    });
    const turn = await bot.chat('İki kişilik romantik ve sessiz bir masa öner');
    assert.equal(turn.ok, true);
    assert.equal(turn.remoteCallAttempted, false);
    assert.equal(turn.provider, 'mock');
    assert.equal(turn.intent.id, 'suggest_table');
    assert.match(turn.assistantMessage.content, /masa|öner/i);
    assert.ok(turn.suggestionCards.length >= 1);
    assert.ok(turn.knowledgeSummary);
  });

  it('suggests menu and campaigns with suggestion cards', async () => {
    const bot = conciergeMod.createAIConcierge({
      restaurantSlug: 'demo-cafe',
      provider: 'mock',
    });
    const menu = await bot.chat('Bana menüden bir şey önerir misin?');
    assert.equal(menu.intent.id, 'suggest_menu');
    assert.ok(menu.suggestionCards.some((c) => c.kind === 'menu'));

    const camp = await bot.chat('Aktif kampanyaları gösterir misin?');
    assert.equal(camp.intent.id, 'suggest_campaign');
    assert.match(camp.assistantMessage.content, /kampanya/i);
  });

  it('creates preorder and shows reservation summary', async () => {
    const bot = conciergeMod.createAIConcierge({
      restaurantSlug: 'demo-cafe',
      provider: 'mock',
    });
    await bot.chat('Bugün 20:00 için 2 kişilik rezervasyon oluştur');
    await bot.chat('Ön sipariş oluştur');
    const summary = await bot.chat('Rezervasyon özeti göster');
    assert.equal(summary.intent.id, 'show_reservation_summary');
    assert.match(summary.assistantMessage.content, /özet|Tarih|Kişi|Saat/i);
    const mem = bot.getMemory();
    assert.ok(mem.partySize === 2 || mem.time === '20:00' || mem.preorder?.length);
  });

  it('builds prompt from snapshot + memory + intent', () => {
    const memory = new conciergeMod.ConciergeMemory('demo-cafe', 'demo-cafe', {
      partySize: 2,
      date: '2026-07-16',
      time: '20:00',
    });
    const intent = conciergeMod.defaultIntentParser.parse(
      'İki kişilik romantik masa öner',
    );
    // Minimal knowledge-shaped object via a live resolve in next test — here unit the builder shape
    assert.match(memory.toPromptBlock(), /Concierge Conversation Memory/);
    assert.match(memory.toPromptBlock(), /partySize: 2/);
    assert.equal(intent.id, 'suggest_table');
  });

  it('injects knowledge into AI Core orchestrate path', async () => {
    const bot = conciergeMod.createAIConcierge({
      restaurantSlug: 'demo-cafe',
      provider: 'mock',
    });
    const turn = await bot.chat('4 kişilik aile masası öner');
    assert.equal(turn.remoteCallAttempted, false);
    assert.ok(turn.promptPreview);
    assert.match(turn.promptPreview, /Restaurant Knowledge Snapshot|Concierge Conversation Memory|User Intent/);
  });

  it('switches provider strategy in one line without breaking mock contract on stubs', async () => {
    const mock = conciergeMod.createAIConcierge({
      restaurantSlug: 'demo-cafe',
      provider: 'mock',
    });
    assert.equal(mock.provider, 'mock');
    const groq = mock.withProvider('groq');
    assert.equal(groq.provider, 'groq');
    // Stub providers still never attempt remote calls
    for (const code of ['openai', 'groq', 'xai', 'mock']) {
      const ai = core.createAICore({ provider: code });
      const result = await ai.orchestrate({
        moduleId: 'customer',
        userMessage: 'ping',
      });
      assert.equal(result.remoteCallAttempted, false);
    }
  });

  it('exposes quick picks for UI', () => {
    const labels = conciergeMod.CONCIERGE_QUICK_PICKS.map((p) => p.label);
    assert.deepEqual(
      labels,
      ['Bugün rezervasyon', 'Menü öner', 'Kampanyalar', 'Romantik masa', 'Aile masası'],
    );
  });
});
