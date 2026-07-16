/**
 * P8-D AI Action Engine — scaffold / additive guards.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PKG = path.join(ROOT, 'src/ai-actions');

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

describe('P8-D AI Action Engine platform scaffold', () => {
  it('creates required package files', () => {
    const required = [
      'index.ts',
      'types.ts',
      'package.json',
      'tsconfig.json',
      'README.md',
      'ports/reservation-port.ts',
      'engines/ReservationEngine.ts',
      'validation/knowledge-validator.ts',
      'actions/ReservationAction.ts',
      'actions/TableAssignmentAction.ts',
      'actions/PreorderAction.ts',
      'actions/GuaranteeAction.ts',
      'actions/PaymentAction.ts',
      'actions/CampaignAction.ts',
      'actions/SummaryAction.ts',
      'services/ActionRegistry.ts',
      'services/ActionExecutor.ts',
      'services/ActionParser.ts',
      'services/ActionAudit.ts',
      'services/ActionEngine.ts',
    ];
    for (const rel of required) {
      assert.ok(statSync(path.join(PKG, rel)).isFile(), `missing ${rel}`);
    }
    assert.ok(statSync(path.join(ROOT, 'docs/P8D_AI_ACTION_ENGINE.md')).isFile());
  });

  it('registers all action families', () => {
    const src = readFileSync(path.join(PKG, 'services/ActionRegistry.ts'), 'utf8');
    for (const name of [
      'ReservationAction',
      'TableAssignmentAction',
      'PreorderAction',
      'GuaranteeAction',
      'PaymentAction',
      'CampaignAction',
      'SummaryAction',
    ]) {
      assert.match(src, new RegExp(name));
    }
    for (const id of [
      'create_reservation',
      'update_reservation',
      'assign_table',
      'change_table',
      'create_preorder',
      'update_preorder',
      'apply_guarantee',
      'create_reservation_summary',
    ]) {
      assert.match(src, new RegExp(id));
    }
  });

  it('does not import P6 production or mutate P7 apps', () => {
    for (const file of walkTsFiles(PKG)) {
      const src = readFileSync(file, 'utf8');
      assert.doesNotMatch(src, /garson\/panel/);
      assert.doesNotMatch(src, /js\/restoran/);
      assert.doesNotMatch(src, /restaurant-admin-erp/);
      assert.doesNotMatch(src, /restaurant-customer-cx/);
      assert.doesNotMatch(src, /from ['"]openai['"]/);
      assert.doesNotMatch(src, /api\.openai\.com/);
    }
  });

  it('documents no live payment / provision', () => {
    const payment = readFileSync(path.join(PKG, 'actions/PaymentAction.ts'), 'utf8');
    assert.match(payment, /livePayment:\s*false|canlı ödeme|provizyon/i);
    assert.match(payment, /skipped|prepare_payment/);
    const guarantee = readFileSync(path.join(PKG, 'actions/GuaranteeAction.ts'), 'utf8');
    assert.match(guarantee, /provizyon çekilmedi|provisioned:\s*false/i);
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
