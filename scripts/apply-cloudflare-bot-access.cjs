#!/usr/bin/env node
/**
 * Apply Cloudflare WAF skip rules for verified bots + isteBul production smoke UA.
 * Requires API token with Zone WAF Write (and optionally Bot Management Read).
 *
 * Usage:
 *   node scripts/apply-cloudflare-bot-access.cjs          # dry-run
 *   node scripts/apply-cloudflare-bot-access.cjs --apply  # create missing rules
 */
'use strict';

const DOMAIN = process.env.CLOUDFLARE_ZONE_NAME || 'istebul.com';
const API_BASE = 'https://api.cloudflare.com/client/v4';
const APPLY = process.argv.includes('--apply');

const SKIP_RULES = [
  {
    ref: 'istebul_skip_verified_bots',
    description: 'isteBul: skip WAF/SBFM for verified bots (cf.client.bot)',
    expression: '(cf.client.bot)'
  },
  {
    ref: 'istebul_skip_production_smoke',
    description: 'isteBul: skip WAF/SBFM for production smoke monitor UA',
    expression: '(http.user_agent contains "isteBul-production-smoke")'
  }
];

function skipActionParameters() {
  return {
    ruleset: 'current',
    phases: ['http_ratelimit', 'http_request_sbfm', 'http_request_firewall_managed']
  };
}

async function cfRequest(path, { method = 'GET', body } = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN missing');

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const json = await res.json().catch(() => ({}));
  if (!json.success) {
    const detail = (json.errors || []).map((e) => e.message).join('; ') || res.statusText;
    const err = new Error(`${method} ${path}: ${detail}`);
    err.status = res.status;
    throw err;
  }
  return json.result;
}

async function resolveZoneId() {
  if (process.env.CLOUDFLARE_ZONE_ID) return process.env.CLOUDFLARE_ZONE_ID;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const params = new URLSearchParams({ name: DOMAIN, status: 'active' });
  if (accountId) params.set('account.id', accountId);

  const zones = await cfRequest(`/zones?${params.toString()}`);
  const zone = (zones || []).find((z) => z.name === DOMAIN) || zones?.[0];
  if (!zone) throw new Error(`Cloudflare zone not found for ${DOMAIN}`);
  return zone.id;
}

async function getCustomFirewallEntrypoint(zoneId) {
  try {
    return await cfRequest(`/zones/${zoneId}/rulesets/phases/http_request_firewall_custom/entrypoint`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function createEntrypointWithRule(zoneId, ruleSpec) {
  return cfRequest(`/zones/${zoneId}/rulesets`, {
    method: 'POST',
    body: {
      name: 'isteBul http_request_firewall_custom entry point',
      description: 'isteBul bot/monitor WAF skip rules',
      kind: 'zone',
      phase: 'http_request_firewall_custom',
      rules: [
        {
          action: 'skip',
          action_parameters: skipActionParameters(),
          expression: ruleSpec.expression,
          description: ruleSpec.description,
          ref: ruleSpec.ref,
          enabled: true
        }
      ]
    }
  });
}

async function ensureSkipRule(zoneId, rulesetId, ruleSpec, existingRules) {
  const found = (existingRules || []).find(
    (r) => r.ref === ruleSpec.ref || r.description === ruleSpec.description
  );
  if (found) {
    console.log(`OK  rule exists: ${ruleSpec.ref}`);
    return found;
  }

  if (!APPLY) {
    console.log(`DRY would create rule: ${ruleSpec.ref}`);
    return null;
  }

  const created = await cfRequest(`/zones/${zoneId}/rulesets/${rulesetId}/rules`, {
    method: 'POST',
    body: {
      action: 'skip',
      action_parameters: skipActionParameters(),
      expression: ruleSpec.expression,
      description: ruleSpec.description,
      ref: ruleSpec.ref,
      enabled: true,
      position: { index: 1 }
    }
  });
  console.log(`OK  created rule: ${ruleSpec.ref} (${created.id})`);
  return created;
}

async function reportBotManagement(zoneId) {
  try {
    const bm = await cfRequest(`/zones/${zoneId}/bot_management`);
    const parts = [];
    if (typeof bm.fight_mode === 'boolean') parts.push(`fight_mode=${bm.fight_mode}`);
    if (typeof bm.sbfmDefinitelyEnabled === 'boolean') {
      parts.push(`sbfmDefinitelyEnabled=${bm.sbfmDefinitelyEnabled}`);
    }
    if (typeof bm.sbfmLikelyEnabled === 'boolean') {
      parts.push(`sbfmLikelyEnabled=${bm.sbfmLikelyEnabled}`);
    }
    console.log(`Bot management: ${parts.join(' ') || JSON.stringify(bm)}`);
    if (bm.fight_mode === true) {
      console.warn(
        'WARN Bot Fight Mode is ON — WAF skip rules do not bypass BFM. Consider Super Bot Fight Mode + skip rules (see docs/CLOUDFLARE_BOT_ACCESS.md).'
      );
    }
    return bm;
  } catch (err) {
    console.warn(`WARN bot_management unavailable (${err.message})`);
    return null;
  }
}

async function main() {
  console.log(`\napply-cloudflare-bot-access → ${DOMAIN} (${APPLY ? 'apply' : 'dry-run'})\n`);

  const zoneId = await resolveZoneId();
  console.log(`Zone: ${zoneId}`);

  await reportBotManagement(zoneId);

  let entry = await getCustomFirewallEntrypoint(zoneId);
  if (!entry) {
    if (APPLY) {
      entry = await createEntrypointWithRule(zoneId, SKIP_RULES[0]);
      console.log(`OK  created entrypoint ruleset ${entry.id}`);
    } else {
      console.log('DRY would create http_request_firewall_custom entrypoint ruleset');
      console.log('\nDone (dry-run).\n');
      return;
    }
  }

  const rules = entry.rules || [];
  for (const spec of SKIP_RULES) {
    await ensureSkipRule(zoneId, entry.id, spec, rules);
  }

  console.log('\nDone.\n');
  if (!APPLY) {
    console.log('Re-run with --apply to create rules.');
    console.log('Token permissions: Zone WAF Write (+ Bot Management Read optional).\n');
  }
}

main().catch((err) => {
  console.error(`apply-cloudflare-bot-access: ${err.message}`);
  process.exit(1);
});
