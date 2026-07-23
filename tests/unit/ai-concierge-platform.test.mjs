/**
 * P8-C AI Concierge — scaffold / additive guards.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PKG = path.join(ROOT, 'src/ai-concierge');
const CX = path.join(ROOT, 'apps/restaurant-customer-cx/src');

function walkTsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkTsFiles(full));
    else if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('P8-C AI Concierge platform scaffold', () => {
  it('creates required package files', () => {
    const required = [
      'index.ts',
      'types.ts',
      'package.json',
      'tsconfig.json',
      'README.md',
      'intents/IntentParser.ts',
      'memory/ConciergeMemory.ts',
      'prompts/ConciergePromptBuilder.ts',
      'services/ConciergeService.ts',
      'services/ConciergeMockResponder.ts',
    ];
    for (const rel of required) {
      assert.ok(statSync(path.join(PKG, rel)).isFile(), `missing ${rel}`);
    }
    assert.ok(statSync(path.join(ROOT, 'docs/P8C_AI_CONCIERGE.md')).isFile());
  });

  it('exposes /r/{slug}/concierge route without rewriting P7 ConciergeStep placeholder', () => {
    const app = readFileSync(path.join(CX, 'App.tsx'), 'utf8');
    const step = readFileSync(path.join(CX, 'components/cx/ConciergeStep.tsx'), 'utf8');
    const page = readFileSync(path.join(CX, 'pages/ConciergePage.tsx'), 'utf8');

    assert.match(app, /:restaurantSlug\/concierge/);
    assert.match(app, /ConciergePage|ConciergeRoute/);
    assert.match(page, /AiConciergeChat/);
    // P7 placeholder contract retained
    assert.match(step, /Placeholder|LLM/i);
    assert.match(step, /Merhaba/);
    assert.doesNotMatch(step, /createAIConcierge|openai|fetch\(/i);
  });

  it('does not import P6 production panel or live LLM SDKs', () => {
    for (const file of walkTsFiles(PKG)) {
      const src = readFileSync(file, 'utf8');
      assert.doesNotMatch(src, /garson\/panel/);
      assert.doesNotMatch(src, /js\/restoran/);
      assert.doesNotMatch(src, /from ['"]openai['"]/);
      assert.doesNotMatch(src, /from ['"]groq-sdk['"]/);
      assert.doesNotMatch(src, /api\.openai\.com/);
      assert.doesNotMatch(src, /api\.groq\.com/);
      assert.doesNotMatch(src, /api\.x\.ai/);
    }
  });

  it('wires provider strategy and mock remoteCallAttempted contract', () => {
    const service = readFileSync(path.join(PKG, 'services/ConciergeService.ts'), 'utf8');
    assert.match(service, /createAICore/);
    assert.match(service, /createRestaurantKnowledge/);
    assert.match(service, /provider\?:\s*AIProviderCode/);
    assert.match(service, /remoteCallAttempted/);
    assert.match(service, /withProvider/);
    const mock = readFileSync(path.join(PKG, 'services/ConciergeMockResponder.ts'), 'utf8');
    assert.match(mock, /KnowledgeResolveResult/);
  });

  it('typechecks via tsc project', () => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(ROOT, 'node_modules/typescript/bin/tsc'),
        '-p',
        path.join(PKG, 'tsconfig.json'),
        '--noEmit',
      ],
      { encoding: 'utf8', cwd: ROOT },
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });
});
