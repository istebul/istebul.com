import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  suggestLinkedInComments,
  detectLinkedInCommentCategory,
  normalizeLinkedInCommentInput,
  selectLinkedInCommentTemplates
} from '../../js/features/ops/linkedin-ops-comment-suggestions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');

const templatesDoc = JSON.parse(
  readFileSync(join(rootDir, 'data/ops/linkedin-templates.json'), 'utf8')
);
const weeklyPlanDoc = JSON.parse(
  readFileSync(join(rootDir, 'data/ops/linkedin-weekly-plan.json'), 'utf8')
);

const baseInput = {
  templatesDoc,
  weeklyPlanDoc
};

function getCommentTemplates() {
  const catalog = templatesDoc.templateCatalog || {};
  const templates = [];
  for (const group of Object.values(catalog)) {
    for (const template of group?.templates || []) {
      if (template?.actionType === 'comment_opportunity') {
        templates.push(template);
      }
    }
  }
  return templates;
}

describe('linkedin-ops-comment-suggestions', () => {
  it('module imports successfully', () => {
    assert.equal(typeof suggestLinkedInComments, 'function');
    assert.equal(typeof detectLinkedInCommentCategory, 'function');
    assert.equal(typeof normalizeLinkedInCommentInput, 'function');
    assert.equal(typeof selectLinkedInCommentTemplates, 'function');
  });

  it('empty postText returns fallback generic suggestions', () => {
    const result = suggestLinkedInComments({ postText: '', ...baseInput });
    assert.equal(result.ok, true);
    assert.equal(result.category.confidence, 'fallback');
    assert.deepEqual(result.category.matchedKeywords, []);
    assert.equal(result.category.key, 'generic_ai_llm');
    assert.ok(result.suggestions.length > 0);
  });

  it('ChatGPT / LLM / yapay zeka maps to generic_ai_llm', () => {
    const category = detectLinkedInCommentCategory(
      'ChatGPT ve LLM modelleri yapay zeka dünyasında hızla yayılıyor.'
    );
    assert.equal(category.key, 'generic_ai_llm');
    assert.ok(category.matchedKeywords.length > 0);

    const result = suggestLinkedInComments({
      postText: 'ChatGPT ve LLM modelleri yapay zeka dünyasında hızla yayılıyor.',
      ...baseInput
    });
    assert.equal(result.category.key, 'generic_ai_llm');
    assert.notEqual(result.category.confidence, 'fallback');
  });

  it('TCO / araç / filo maps to automotive-related category', () => {
    const category = detectLinkedInCommentCategory(
      'Filo yönetiminde TCO hesabı ve araç seçimi kritik bir karar.'
    );
    assert.equal(category.key, 'otomotiv');
    assert.ok(category.matchedKeywords.some((k) => ['tco', 'araç', 'filo'].includes(k)));

    const result = suggestLinkedInComments({
      postText: 'Filo yönetiminde TCO hesabı ve araç seçimi kritik bir karar.',
      ...baseInput
    });
    assert.equal(result.category.key, 'otomotiv');
  });

  it('KVKK / halüsinasyon / güven maps to kvkk_guven_halusinasyon', () => {
    const category = detectLinkedInCommentCategory(
      'KVKK ve halüsinasyon riski karar destek sistemlerinde güven konusunu öne çıkarıyor.'
    );
    assert.equal(category.key, 'kvkk_guven_halusinasyon');
    assert.ok(category.matchedKeywords.length > 0);

    const result = suggestLinkedInComments({
      postText:
        'KVKK ve halüsinasyon riski karar destek sistemlerinde güven konusunu öne çıkarıyor.',
      accountType: 'company',
      ...baseInput
    });
    assert.equal(result.category.key, 'kvkk_guven_halusinasyon');
  });

  it('each suggestion includes manual workflow, lintResult and non-empty body', () => {
    const result = suggestLinkedInComments({
      postText: 'Yapay zeka ve LLM tartışması devam ediyor.',
      ...baseInput
    });

    assert.ok(result.suggestions.length > 0);
    for (const suggestion of result.suggestions) {
      assert.equal(result.manualWorkflow.required, true);
      assert.equal(typeof result.manualWorkflow.disclosureTr, 'string');
      assert.ok(result.manualWorkflow.disclosureTr.includes('manuel'));
      assert.ok(suggestion.lintResult);
      assert.equal(typeof suggestion.lintResult.severity, 'string');
      assert.equal(typeof suggestion.body, 'string');
      assert.ok(suggestion.body.length > 0);
      const lintWithContext = suggestion.lintResult;
      assert.ok(['pass', 'warning', 'fail'].includes(lintWithContext.severity));
    }
  });

  it('maxSuggestions limits output count', () => {
    const result = suggestLinkedInComments({
      postText: 'ChatGPT ve yapay zeka modelleri hakkında uzun bir tartışma metni.',
      maxSuggestions: 2,
      ...baseInput
    });
    assert.ok(result.suggestions.length <= 2);
    assert.equal(result.suggestions.length, 2);
  });

  it('normalizeLinkedInCommentInput applies defaults', () => {
    const normalized = normalizeLinkedInCommentInput({ postText: '  merhaba  ' });
    assert.equal(normalized.postText, 'merhaba');
    assert.equal(normalized.accountType, 'ceo');
    assert.equal(normalized.language, 'tr');
    assert.equal(normalized.maxSuggestions, 3);
  });

  it('selectLinkedInCommentTemplates prefers language and account type', () => {
    const templates = getCommentTemplates();
    const selected = selectLinkedInCommentTemplates(
      templates,
      'generic_ai_llm',
      'ceo',
      'tr',
      2
    );
    assert.ok(selected.length <= 2);
    assert.ok(selected.every((t) => t.actionType === 'comment_opportunity'));
  });

  it('utility source has no forbidden runtime patterns', () => {
    const source = readFileSync(
      join(rootDir, 'js/features/ops/linkedin-ops-comment-suggestions.js'),
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
      'window.'
    ];
    for (const pattern of forbidden) {
      assert.ok(!source.includes(pattern), `forbidden pattern found: ${pattern}`);
    }
  });
});
