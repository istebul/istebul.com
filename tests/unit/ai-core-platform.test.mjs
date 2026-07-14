/**
 * Unit tests for P8-A AI Core (Node test runner).
 * Compiles via dynamic import of TypeScript through node's experimental type stripping
 * is not always available — tests exercise the JS-compatible surface via relative TS
 * converted at assert-time by spawning tsc is heavy. Instead we mirror critical
 * contracts with a small ESM re-check using transpile-free logic duplicated only for
 * smoke assertions where needed.
 *
 * Prefer importing compiled-free TypeScript when the runner supports it.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const AI_CORE = path.join(ROOT, 'src/ai-core');

function walkTsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkTsFiles(full));
    } else if (name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('P8-A AI Core platform scaffold', () => {
  it('creates required directories and entrypoints', () => {
    const required = [
      'interfaces/LLMProvider.ts',
      'interfaces/EmbeddingProvider.ts',
      'interfaces/ModerationProvider.ts',
      'providers/openai-provider.ts',
      'providers/groq-provider.ts',
      'providers/xai-provider.ts',
      'providers/mock-provider.ts',
      'providers/provider-factory.ts',
      'services/AIOrchestrator.ts',
      'services/PromptBuilder.ts',
      'services/PromptRegistry.ts',
      'services/TokenCounter.ts',
      'services/ConversationMemory.ts',
      'services/AIAuditLogger.ts',
      'prompts/reservation.ts',
      'prompts/menu.ts',
      'prompts/crm.ts',
      'prompts/kitchen.ts',
      'prompts/waiter.ts',
      'prompts/payments.ts',
      'prompts/customer.ts',
      'prompts/inventory.ts',
      'memory/conversation.ts',
      'memory/restaurant-context.ts',
      'memory/customer-context.ts',
      'index.ts',
      'README.md',
      'tsconfig.json',
    ];
    for (const rel of required) {
      const full = path.join(AI_CORE, rel);
      assert.ok(statSync(full).isFile(), `missing ${rel}`);
    }
  });

  it('exports Strategy factory helpers in provider-factory', () => {
    const src = readFileSync(path.join(AI_CORE, 'providers/provider-factory.ts'), 'utf8');
    assert.match(src, /export function getAIProvider/);
    assert.match(src, /openai:\s*\(\)\s*=>\s*new OpenAIProvider/);
    assert.match(src, /groq:\s*\(\)\s*=>\s*new GroqProvider/);
    assert.match(src, /xai:\s*\(\)\s*=>\s*new XAIProvider/);
    assert.match(src, /mock:\s*\(\)\s*=>\s*new MockProvider/);
  });

  it('keeps providers as stubs (no live SDK imports)', () => {
    const providerFiles = walkTsFiles(path.join(AI_CORE, 'providers'));
    for (const file of providerFiles) {
      const src = readFileSync(file, 'utf8');
      assert.doesNotMatch(src, /from ['"]openai['"]/);
      assert.doesNotMatch(src, /from ['"]groq-sdk['"]/);
      assert.doesNotMatch(src, /api\.openai\.com/);
      assert.doesNotMatch(src, /api\.groq\.com/);
      assert.doesNotMatch(src, /api\.x\.ai/);
      assert.match(
        readFileSync(path.join(AI_CORE, 'providers/BaseLLMProvider.ts'), 'utf8'),
        /remoteCallAttempted: false/,
      );
    }
  });

  it('seed prompts cover all eight AI modules', () => {
    const src = readFileSync(path.join(AI_CORE, 'prompts/index.ts'), 'utf8');
    for (const mod of [
      'reservation',
      'menu',
      'crm',
      'kitchen',
      'waiter',
      'payments',
      'customer',
      'inventory',
    ]) {
      assert.match(src, new RegExp(`${mod}Prompt`));
    }
    assert.match(src, /BUILTIN_PROMPTS/);
  });

  it('documents one-line provider switching via createAICore', () => {
    const orch = readFileSync(path.join(AI_CORE, 'services/AIOrchestrator.ts'), 'utf8');
    assert.match(orch, /export function createAICore/);
    assert.match(orch, /getAIProvider\(this\.config\.provider\)/);
    assert.match(orch, /withProvider\(/);
  });

  it('typechecks with tsc -p src/ai-core/tsconfig.json', () => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(ROOT, 'node_modules/typescript/bin/tsc'),
        '-p',
        path.join(AI_CORE, 'tsconfig.json'),
        '--noEmit',
      ],
      { encoding: 'utf8', cwd: ROOT },
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });
});
