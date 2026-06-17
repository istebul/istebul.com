import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildLinkedInCommentPanelHtml,
  buildLinkedInCommentSuggestionsHtml,
  bindLinkedInCommentPanel
} from '../../js/features/ops/linkedin-ops-comment-views.js';
import { suggestLinkedInComments } from '../../js/features/ops/linkedin-ops-comment-suggestions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');
const templatesDoc = JSON.parse(
  readFileSync(join(rootDir, 'data/ops/linkedin-templates.json'), 'utf8')
);

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

const COPY_SUCCESS_MESSAGE =
  "Yorum metni kopyalandı. LinkedIn'de manuel olarak yapıştırıp paylaşmadan önce son kez kontrol edin.";

const COPY_FAILURE_MESSAGE =
  'Kopyalama başarısız oldu. Metni manuel olarak seçip kopyalayın.';

/** @type {typeof globalThis.navigator | undefined} */
let savedNavigator;

afterEach(() => {
  if (savedNavigator === undefined) {
    delete global.navigator;
  } else {
    global.navigator = savedNavigator;
  }
  savedNavigator = undefined;
});

function setNavigatorClipboard(mock) {
  savedNavigator = global.navigator;
  global.navigator = { clipboard: mock };
}

function createInteractiveResultsEl() {
  const listeners = new Map();
  const statusEl = { textContent: '', className: '' };
  const copyBtn = {
    attributes: { 'data-comment-copy-index': '0' },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    closest(selector) {
      if (selector === '[data-comment-copy-index]') return this;
      if (selector === '.linkedin-comment-card') return card;
      return null;
    }
  };
  const card = {
    querySelector(selector) {
      if (selector === '.linkedin-comment-copy-status') return statusEl;
      return null;
    }
  };

  return {
    statusEl,
    copyBtn,
    _html: '',
    set innerHTML(value) {
      this._html = value;
    },
    get innerHTML() {
      return this._html;
    },
    contains(node) {
      return node === copyBtn;
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatchEvent(event) {
      for (const fn of listeners.get(event.type) || []) fn(event);
    }
  };
}

function createBindRoot({ resultsEl, generateBtn, postTextarea, accountSelect, languageSelect }) {
  const root = {
    querySelector(selector) {
      const map = {
        '#linkedin-comment-generate': generateBtn,
        '#linkedin-comment-post-text': postTextarea,
        '#linkedin-comment-account-type': accountSelect,
        '#linkedin-comment-language': languageSelect,
        '#linkedin-comment-results': resultsEl
      };
      return map[selector] || null;
    }
  };
  return root;
}

function triggerCopy(resultsEl, copyBtn) {
  resultsEl.dispatchEvent({
    type: 'click',
    target: copyBtn
  });
}

function createGenerateBtn() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatchEvent(event) {
      for (const fn of listeners.get(event.type) || []) fn(event);
    }
  };
}

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

  it('buildLinkedInCommentSuggestionsHtml renders copy button with data-comment-copy-index', () => {
    const html = buildLinkedInCommentSuggestionsHtml(MOCK_RESULT);
    assert.match(html, /Yorumu kopyala/);
    assert.match(html, /class="linkedin-comment-copy-btn"/);
    assert.match(html, /data-comment-copy-index="0"/);
  });

  it('buildLinkedInCommentSuggestionsHtml renders inline copy status region', () => {
    const html = buildLinkedInCommentSuggestionsHtml(MOCK_RESULT);
    assert.match(html, /class="linkedin-comment-copy-status"/);
    assert.match(html, /role="status"/);
    assert.match(html, /aria-live="polite"/);
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

  it('bindLinkedInCommentPanel copies canonical suggestion body on clipboard success', async () => {
    let copiedText = '';
    setNavigatorClipboard({
      writeText: async (text) => {
        copiedText = text;
      }
    });

    const postText =
      'Yapay zeka ve LLM tartışmasında denetlenebilir skor çerçevesi önemli bir konu.';
    const resultsEl = createInteractiveResultsEl();
    const generateBtn = createGenerateBtn();
    const postTextarea = { value: postText };
    const accountSelect = { value: 'ceo' };
    const languageSelect = { value: 'tr' };

    const root = createBindRoot({ resultsEl, generateBtn, postTextarea, accountSelect, languageSelect });
    bindLinkedInCommentPanel(root, { templatesDoc, weeklyPlanDoc: {} });

    generateBtn.dispatchEvent({ type: 'click' });
    assert.ok(resultsEl.innerHTML.includes('Yorumu kopyala'));

    const expected = suggestLinkedInComments({
      postText,
      accountType: 'ceo',
      language: 'tr',
      templatesDoc,
      weeklyPlanDoc: {}
    });

    triggerCopy(resultsEl, resultsEl.copyBtn);
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(copiedText, expected.suggestions[0].body);
    assert.equal(resultsEl.statusEl.textContent, COPY_SUCCESS_MESSAGE);
    assert.equal(resultsEl.statusEl.className, 'linkedin-comment-copy-status is-success');
  });

  it('bindLinkedInCommentPanel shows failure message when clipboard is unavailable', async () => {
    savedNavigator = global.navigator;
    global.navigator = {};

    const resultsEl = createInteractiveResultsEl();
    const generateBtn = createGenerateBtn();
    const postTextarea = {
      value: 'Yapay zeka ve LLM tartışmasında denetlenebilir skor çerçevesi önemli bir konu.'
    };
    const accountSelect = { value: 'ceo' };
    const languageSelect = { value: 'tr' };

    const root = createBindRoot({ resultsEl, generateBtn, postTextarea, accountSelect, languageSelect });
    bindLinkedInCommentPanel(root, { templatesDoc, weeklyPlanDoc: {} });

    generateBtn.dispatchEvent({ type: 'click' });
    triggerCopy(resultsEl, resultsEl.copyBtn);

    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(resultsEl.statusEl.textContent, COPY_FAILURE_MESSAGE);
    assert.equal(resultsEl.statusEl.className, 'linkedin-comment-copy-status is-error');
  });

  it('bindLinkedInCommentPanel shows failure message when clipboard write rejects', async () => {
    setNavigatorClipboard({
      writeText: async () => {
        throw new Error('permission denied');
      }
    });

    const resultsEl = createInteractiveResultsEl();
    const generateBtn = createGenerateBtn();
    const postTextarea = {
      value: 'Yapay zeka ve LLM tartışmasında denetlenebilir skor çerçevesi önemli bir konu.'
    };
    const accountSelect = { value: 'ceo' };
    const languageSelect = { value: 'tr' };

    const root = createBindRoot({ resultsEl, generateBtn, postTextarea, accountSelect, languageSelect });
    bindLinkedInCommentPanel(root, { templatesDoc, weeklyPlanDoc: {} });

    generateBtn.dispatchEvent({ type: 'click' });
    triggerCopy(resultsEl, resultsEl.copyBtn);

    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(resultsEl.statusEl.textContent, COPY_FAILURE_MESSAGE);
    assert.equal(resultsEl.statusEl.className, 'linkedin-comment-copy-status is-error');
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
      'document.execCommand',
      'execCommand',
      'auto-post',
      'auto-comment',
      'completionState',
      'dueCard',
      'document.',
      'window.'
    ];
    for (const pattern of forbidden) {
      assert.ok(!source.includes(pattern), `forbidden pattern found: ${pattern}`);
    }
    assert.ok(source.includes('navigator.clipboard.writeText'));
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

const linkedInOpsCss = readFileSync(join(rootDir, 'css/admin-linkedin-ops.css'), 'utf8');

describe('linkedin-ops comment card CSS guards', () => {
  it('defines copy button touch target and focus-visible styles', () => {
    assert.match(linkedInOpsCss, /\.linkedin-comment-copy-btn\b/);
    assert.match(linkedInOpsCss, /\.linkedin-comment-copy-btn[\s\S]*min-height:\s*44px/);
    assert.match(linkedInOpsCss, /\.linkedin-comment-copy-btn:focus-visible/);
    assert.match(linkedInOpsCss, /\.linkedin-comment-copy-btn[\s\S]*overflow-wrap:\s*anywhere/);
  });

  it('defines action row wrap and overflow guards for card text', () => {
    assert.match(linkedInOpsCss, /\.linkedin-comment-card-actions[\s\S]*flex-wrap:\s*wrap/);
    assert.match(linkedInOpsCss, /\.linkedin-comment-card-title[\s\S]*overflow-wrap:\s*anywhere/);
    assert.match(linkedInOpsCss, /\.linkedin-comment-meta[\s\S]*overflow-wrap:\s*anywhere/);
    assert.match(linkedInOpsCss, /max-width:\s*480px[\s\S]*\.linkedin-comment-copy-btn/);
  });

  it('defines comment panel generate button touch target', () => {
    assert.match(
      linkedInOpsCss,
      /\.linkedin-comment-panel \.linkedin-lint-run-btn[\s\S]*min-height:\s*44px/
    );
    assert.match(
      linkedInOpsCss,
      /\.linkedin-comment-panel \.linkedin-lint-run-btn:focus-visible/
    );
  });
});
