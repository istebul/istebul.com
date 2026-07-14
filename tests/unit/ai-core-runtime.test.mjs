/**
 * Behavioral smoke for P8-A AI Core using Node type stripping.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const core = await import('../../src/ai-core/index.ts');

describe('P8-A AI Core runtime (stubs)', () => {
  it('switches provider in one line via createAICore', async () => {
    const mock = core.createAICore({ provider: 'mock' });
    const groq = core.createAICore({ provider: 'groq' });
    assert.equal(mock.provider.code, 'mock');
    assert.equal(groq.provider.code, 'groq');
    assert.equal(mock.withProvider('openai').provider.code, 'openai');
  });

  it('resolves prompts for all eight modules', () => {
    const registry = new core.PromptRegistry();
    for (const mod of core.BUILTIN_PROMPTS.map((p) => p.moduleId)) {
      const template = registry.getForModule(mod);
      assert.ok(template, `missing prompt for ${mod}`);
      assert.equal(template.moduleId, mod);
    }
  });

  it('keeps conversation memory turns', async () => {
    const memory = new core.ConversationMemory();
    await memory.append('c1', { role: 'user', content: 'Merhaba' });
    await memory.append('c1', { role: 'assistant', content: 'Buyurun' });
    const messages = await memory.getPromptMessages('c1');
    assert.equal(messages.length, 2);
    assert.equal(messages[0].content, 'Merhaba');
  });

  it('orchestrates reservation without remote LLM calls', async () => {
    const ai = core.createAICore({ provider: 'mock' });
    await ai.upsertRestaurantContext('r1', {
      name: 'Demo Lokanta',
      city: 'İstanbul',
      cuisine: ['Türk'],
    });
    await ai.upsertCustomerContext('u1', {
      displayName: 'Ayşe',
      allergies: ['fındık'],
    });

    const result = await ai.orchestrate({
      moduleId: 'reservation',
      conversationId: 'conv-r1',
      restaurantId: 'r1',
      customerId: 'u1',
      userMessage: 'Bu akşam 4 kişilik masa?',
      variables: { party_size: 4, date: '2026-07-14', time: '20:00' },
    });

    assert.equal(result.ok, true);
    assert.equal(result.remoteCallAttempted, false);
    assert.equal(result.provider, 'mock');
    assert.ok(result.assistantMessage.content.includes('[mock]'));
    assert.ok(result.usage.estimated);
    assert.ok(result.auditId);

    const audits = await ai.audit.list({ conversationId: 'conv-r1' });
    assert.equal(audits.length, 1);
    assert.equal(audits[0].moduleId, 'reservation');

    const tokens = await ai.tokenUsage.list({ restaurantId: 'r1' });
    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].operation, 'orchestrate');
  });

  it('lists all strategy providers as stubs', async () => {
    for (const provider of core.listAIProviders()) {
      const completion = await provider.complete({
        messages: [{ role: 'user', content: 'ping' }],
      });
      assert.equal(completion.remoteCallAttempted, false);
      assert.equal(completion.provider, provider.code);
    }
  });
});
