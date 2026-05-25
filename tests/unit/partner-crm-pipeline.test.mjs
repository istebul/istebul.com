import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadPartnerCrmPipelineSync,
  normalizePartnerCrmStatus,
  computePartnerPipelineForecast,
  computePartnerStageConversions,
  recommendCrmStageAction,
  getPartnerCrmWinProbability
} from '../../js/features/sales/partner-crm-pipeline.js';

const pipelineJson = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data/sales/partner-crm-pipeline.json'), 'utf8')
);
loadPartnerCrmPipelineSync(pipelineJson);
const stages = pipelineJson.stages;

describe('P6.2 partner CRM pipeline', () => {
  it('normalizes legacy statuses', () => {
    assert.equal(normalizePartnerCrmStatus('new'), 'lead');
    assert.equal(normalizePartnerCrmStatus('integrating'), 'pilot');
    assert.equal(normalizePartnerCrmStatus('live'), 'won');
  });

  it('has seven stages in order', () => {
    assert.equal(stages.length, 7);
    assert.equal(stages[0].id, 'lead');
    assert.equal(stages[stages.length - 2].id, 'won');
    assert.equal(stages[stages.length - 1].id, 'lost');
  });

  it('win probability increases through funnel', () => {
    assert.ok(getPartnerCrmWinProbability('lead', stages) < getPartnerCrmWinProbability('demo', stages));
    assert.ok(getPartnerCrmWinProbability('negotiation', stages) < getPartnerCrmWinProbability('won', stages));
    assert.equal(getPartnerCrmWinProbability('lost', stages), 0);
  });

  it('computePartnerPipelineForecast weights open deals', () => {
    const forecast = computePartnerPipelineForecast(
      [
        { status: 'lead' },
        { status: 'demo' },
        { status: 'won' },
        { status: 'lost' }
      ],
      stages
    );
    assert.equal(forecast.total, 4);
    assert.equal(forecast.byStage.lead, 1);
    assert.equal(forecast.byStage.won, 1);
    assert.ok(forecast.forecastWinRate > 0 && forecast.forecastWinRate < 1);
  });

  it('recommendCrmStageAction for pilot without webhook', () => {
    const rec = recommendCrmStageAction({ status: 'pilot', webhook_ready: false }, stages);
    assert.match(rec.action, /webhook/i);
    assert.equal(rec.priority, 'high');
  });

  it('follow-up flows use p6.2 statuses', () => {
    const flows = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data/sales/follow-up-flows.json'), 'utf8')
    );
    assert.equal(flows.version, 'p6.2');
    assert.ok(flows.flows.some((f) => f.trigger?.applicationStatus === 'pilot'));
  });
});
