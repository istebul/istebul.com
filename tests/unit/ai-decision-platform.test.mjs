/**
 * P8-F AI Decision Engine — scaffold / additive guards.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PKG = path.join(ROOT, 'src/ai-decision');

function walkTsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkTsFiles(full));
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('P8-F AI Decision Engine platform scaffold', () => {
  it('creates required package files', () => {
    const required = [
      'index.ts',
      'types.ts',
      'package.json',
      'tsconfig.json',
      'README.md',
      'context/DecisionContext.ts',
      'scoring/DecisionScorer.ts',
      'engines/DecisionEngine.ts',
      'engines/RecommendationEngine.ts',
      'engines/PredictionEngine.ts',
      'engines/GuaranteeEngine.ts',
      'engines/CampaignEngine.ts',
      'services/DecisionAudit.ts',
      'adapters/KnowledgeAdapter.ts',
      'adapters/ConciergeAdapter.ts',
      'adapters/ActionHintsAdapter.ts',
      'adapters/CoreProviderAdapter.ts',
    ];
    for (const rel of required) {
      assert.ok(statSync(path.join(PKG, rel)).isFile(), `missing ${rel}`);
    }
    assert.ok(statSync(path.join(ROOT, 'docs/P8F_AI_DECISION_ENGINE.md')).isFile());
  });

  it('does not import P6 production or mutate UI / migrations', () => {
    for (const file of walkTsFiles(PKG)) {
      const src = readFileSync(file, 'utf8');
      assert.doesNotMatch(src, /garson\/panel/);
      assert.doesNotMatch(src, /js\/restoran/);
      assert.doesNotMatch(src, /restaurant-admin-erp/);
      assert.doesNotMatch(src, /restaurant-customer-cx/);
      assert.doesNotMatch(src, /supabase\/migrations/);
      assert.doesNotMatch(src, /api\.openai\.com/);
      assert.doesNotMatch(src, /fetch\(/);
    }
  });

  it('documents mock default and no live LLM', () => {
    const engine = readFileSync(path.join(PKG, 'engines/DecisionEngine.ts'), 'utf8');
    const index = readFileSync(path.join(PKG, 'index.ts'), 'utf8');
    assert.match(engine, /remoteCallAttempted:\s*false/);
    assert.match(index, /Mock default|no live LLM/i);
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
