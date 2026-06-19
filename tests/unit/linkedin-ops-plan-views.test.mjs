import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildLinkedInPlanSectionHtml } from '../../js/features/ops/linkedin-ops-plan-views.js';

describe('linkedin-ops-plan-views', () => {
  it('buildLinkedInPlanSectionHtml shows empty state when plan missing', () => {
    const html = buildLinkedInPlanSectionHtml(null);
    assert.match(html, /Haftalık LinkedIn Planı/);
    assert.match(html, /henüz yüklenmedi/);
  });

  it('buildLinkedInPlanSectionHtml renders slot rows and safety notes', () => {
    const html = buildLinkedInPlanSectionHtml({
      timezone: 'Europe/Istanbul',
      automationPolicy: {
        linkedinApi: false,
        autoPost: false,
        autoComment: false,
        manualCopyPasteWorkflow: true,
        manualReviewRequired: true
      },
      manualWorkflow: {
        disclosureTr: 'Manuel paylaşım modeli.'
      },
      slots: [
        {
          dayOfWeek: 'tuesday',
          localTime: '10:00',
          accountType: 'company',
          actionType: 'post',
          themeId: 'methodology_ai_vs_deterministic',
          titleTr: 'Salı — Şirket paylaşımı',
          objectiveTr: 'Metodoloji özeti'
        }
      ]
    });

    assert.match(html, /linkedin-ops-plan-table/);
    assert.match(html, /Salı/);
    assert.match(html, /methodology_ai_vs_deterministic/);
    assert.match(html, /LinkedIn API yok/);
    assert.match(html, /Manuel paylaşım modeli/);
  });
});
