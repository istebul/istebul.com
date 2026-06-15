import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildLinkedInCommentPanelHtml,
  buildLinkedInCommentSuggestionsHtml
} from '../../js/features/ops/linkedin-ops-comment-views.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');

const MOCK_RESULT = {
  ok: true,
  category: {
    key: 'generic_ai_llm',
    labelTr: 'Generic AI / LLM',
    confidence: 'high',
    matchedKeywords: ['llm']
  },
  manualWorkflow: {
    required: true,
    disclosureTr:
      "Bu öneriler yalnızca manuel inceleme içindir; sistem LinkedIn'e otomatik yorum göndermez."
  },
  suggestions: [
    {
      id: 'comment-generic-ai-ceo-tr-suggestion-1',
      titleTr: 'Yorum — Generic AI / LLM thread',
      body: 'Sohbet AI\'sı soru çerçevesinde güçlüdür; sayıların denetlenebilir olması kritiktir.',
      accountType: 'ceo',
      language: 'tr',
      sourceTemplateId: 'comment-generic-ai-ceo-tr',
      categoryKey: 'generic_ai_llm',
      lintResult: {
        ok: true,
        severity: 'pass',
        issues: [],
        summaryTr: 'Metin marka lint kontrolünden geçti.'
      }
    }
  ]
};

describe('linkedin-ops-comment-views', () => {
  it('buildLinkedInCommentPanelHtml includes form controls and results container', () => {
    const html = buildLinkedInCommentPanelHtml();
    assert.match(html, /id="linkedin-comment-post-text"/);
    assert.match(html, /id="linkedin-comment-account-type"/);
    assert.match(html, /id="linkedin-comment-language"/);
    assert.match(html, /id="linkedin-comment-generate"/);
    assert.match(html, /id="linkedin-comment-results"/);
    assert.match(html, /Üçüncü taraf LinkedIn gönderisi/);
    assert.match(html, /Yorum önerisi oluştur/);
    assert.match(html, /value="ceo"/);
    assert.match(html, /value="tr"/);
  });

  it('buildLinkedInCommentPanelHtml includes manual workflow disclosure', () => {
    const html = buildLinkedInCommentPanelHtml();
    assert.match(html, /manuel inceleme/);
    assert.match(html, /otomatik yorum göndermez/);
  });

  it('buildLinkedInCommentSuggestionsHtml renders suggestion cards with category and lint badge', () => {
    const html = buildLinkedInCommentSuggestionsHtml(MOCK_RESULT);
    assert.match(html, /Generic AI \/ LLM thread/);
    assert.match(html, /Sohbet AI/);
    assert.match(html, /generic_ai_llm/);
    assert.match(html, /comment-generic-ai-ceo-tr/);
    assert.match(html, /Geçti/);
    assert.match(html, /linkedin-comment-card/);
    assert.match(html, /manuel inceleme/);
  });

  it('buildLinkedInCommentSuggestionsHtml handles empty suggestions safely', () => {
    const emptyHtml = buildLinkedInCommentSuggestionsHtml({
      ...MOCK_RESULT,
      suggestions: []
    });
    assert.match(emptyHtml, /Uygun yorum şablonu bulunamadı/);

    const nullHtml = buildLinkedInCommentSuggestionsHtml(null);
    assert.match(nullHtml, /oluşturulamadı/);
  });

  it('view source has no forbidden runtime patterns', () => {
    const source = readFileSync(
      join(rootDir, 'js/features/ops/linkedin-ops-comment-views.js'),
      'utf8'
    );
    const forbidden = [
      'fetch(',
      'localStorage',
      'fetchOpsJson',
      'postAiProxy',
      'openai',
      'groq',
      'supabase',
      'linkedin.com',
      'navigator.clipboard',
      'document.',
      'window.',
      'clipboard',
      'copyToClipboard',
      'Kopyala'
    ];
    for (const pattern of forbidden) {
      assert.ok(!source.includes(pattern), `forbidden pattern found: ${pattern}`);
    }
  });

  it('view source has no AI proxy integration', () => {
    const source = readFileSync(
      join(rootDir, 'js/features/ops/linkedin-ops-comment-views.js'),
      'utf8'
    );
    assert.ok(!/postAiProxy|ai-proxy|ChatGPT/i.test(source));
    assert.ok(source.includes('suggestLinkedInComments'));
  });
});
