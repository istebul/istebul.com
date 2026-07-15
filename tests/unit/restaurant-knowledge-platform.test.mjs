/**
 * P8-B Restaurant Knowledge Graph — scaffold / contract tests.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const KG = path.join(ROOT, 'src/restaurant-knowledge');

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

describe('P8-B Restaurant Knowledge Graph scaffold', () => {
  it('creates required entities, services, and queries', () => {
    const required = [
      'entities/restaurant.ts',
      'entities/dining-room.ts',
      'entities/table.ts',
      'entities/menu-category.ts',
      'entities/menu-item.ts',
      'entities/reservation.ts',
      'entities/customer.ts',
      'entities/campaign.ts',
      'entities/staff.ts',
      'entities/business-hours.ts',
      'entities/holiday.ts',
      'entities/payment-policy.ts',
      'entities/loyalty-rule.ts',
      'services/KnowledgeService.ts',
      'services/KnowledgeBuilder.ts',
      'services/KnowledgeSnapshot.ts',
      'services/KnowledgeResolver.ts',
      'queries/restaurant.ts',
      'queries/tables.ts',
      'queries/menu.ts',
      'queries/reservation.ts',
      'queries/crm.ts',
      'queries/inventory.ts',
      'queries/payments.ts',
      'sources/existing-tables.ts',
      'sources/in-memory-source.ts',
      'index.ts',
      'README.md',
      'tsconfig.json',
    ];
    for (const rel of required) {
      assert.ok(statSync(path.join(KG, rel)).isFile(), `missing ${rel}`);
    }
  });

  it('documents existing Supabase tables without creating migrations', () => {
    const src = readFileSync(path.join(KG, 'sources/existing-tables.ts'), 'utf8');
    assert.match(src, /restaurants/);
    assert.match(src, /restaurant_tables/);
    assert.match(src, /menu_items/);
    assert.match(src, /payment_policies/);

    const migrations = path.join(ROOT, 'supabase/migrations');
    const names = readdirSync(migrations);
    assert.ok(!names.some((n) => /p8b|knowledge.?graph/i.test(n)));
  });

  it('never performs LLM or network calls', () => {
    for (const file of walkTsFiles(KG)) {
      const src = readFileSync(file, 'utf8');
      assert.doesNotMatch(src, /from ['"]openai['"]/);
      assert.doesNotMatch(src, /from ['"]groq-sdk['"]/);
      assert.doesNotMatch(src, /api\.openai\.com/);
      assert.doesNotMatch(src, /fetch\s*\(/);
      assert.doesNotMatch(src, /\bcomplete\s*\(/);
    }
  });

  it('stays additive to P6 panel and P7 apps', () => {
    // Knowledge package must not import production panel or ERP/CX apps.
    for (const file of walkTsFiles(KG)) {
      const src = readFileSync(file, 'utf8');
      assert.doesNotMatch(src, /garson\/panel/);
      assert.doesNotMatch(src, /restaurant-admin-erp/);
      assert.doesNotMatch(src, /restaurant-customer-cx/);
      assert.doesNotMatch(src, /js\/restoran/);
    }
  });

  it('typechecks via tsc project', () => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(ROOT, 'node_modules/typescript/bin/tsc'),
        '-p',
        path.join(KG, 'tsconfig.json'),
        '--noEmit',
      ],
      { encoding: 'utf8', cwd: ROOT },
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });

  it('exposes optional knowledge port on AI Core without requiring it', () => {
    const orch = readFileSync(
      path.join(ROOT, 'src/ai-core/services/AIOrchestrator.ts'),
      'utf8',
    );
    assert.match(orch, /knowledgeResolver\?/);
    assert.match(orch, /resolveForOrchestrate/);
    const port = readFileSync(
      path.join(ROOT, 'src/ai-core/interfaces/RestaurantKnowledgeResolverPort.ts'),
      'utf8',
    );
    assert.match(port, /RestaurantKnowledgeResolverPort/);
  });
});
