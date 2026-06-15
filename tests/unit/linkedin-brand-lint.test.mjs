import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  lintLinkedInText,
  getLinkedInLintRules,
  normalizeLinkedInTextForLint
} from '../../js/features/ops/linkedin-brand-lint.js';

const CLEAN_METHODOLOGY_POST =
  'Büyük alımlarda sohbet AI\'sı iyi bir çerçeve sunar; asıl zorluk sayıların denetlenebilir olmasıdır. Skorlar bilgilendirme amaçlıdır; finansal tavsiye veya getiri taahhüdü değildir. https://www.istebul.com/metodoloji/';

const CLEAN_EN_COMMENT =
  'Conversational AI is excellent for framing questions. For high-stakes purchases, auditable numbers matter more than a fluent answer.';

describe('linkedin-brand-lint', () => {
  it('getLinkedInLintRules returns expected defaults', () => {
    const rules = getLinkedInLintRules();
    assert.equal(rules.maxHashtags, 1);
    assert.equal(rules.maxLinks, 1);
    assert.ok(rules.forbiddenClaims.includes('garanti tasarruf'));
    assert.equal(rules.firstSentenceNoBrandName, true);
  });

  it('normalizeLinkedInTextForLint trims and collapses whitespace', () => {
    assert.equal(normalizeLinkedInTextForLint('  hello   world  '), 'hello world');
    assert.equal(normalizeLinkedInTextForLint('a\r\n\r\n\r\nb'), 'a\n\nb');
  });

  it('empty text fails', () => {
    const result = lintLinkedInText('   ');
    assert.equal(result.ok, false);
    assert.equal(result.severity, 'fail');
    assert.ok(result.issues.some((i) => i.code === 'empty_text'));
  });

  it('clean methodology post passes', () => {
    const result = lintLinkedInText(CLEAN_METHODOLOGY_POST, { actionType: 'post' });
    assert.equal(result.ok, true);
    assert.equal(result.severity, 'pass');
    assert.equal(result.issues.length, 0);
  });

  it('comment_opportunity with brand in first sentence fails', () => {
    const result = lintLinkedInText(
      'isteBul olarak bu ayrımı önemli buluyoruz. Skorlar kural tabanlıdır.',
      { actionType: 'comment_opportunity' }
    );
    assert.equal(result.ok, false);
    assert.equal(result.severity, 'fail');
    assert.ok(result.issues.some((i) => i.code === 'brand_in_first_sentence' && i.severity === 'fail'));
  });

  it('post with brand in first sentence warns', () => {
    const result = lintLinkedInText(
      'isteBul olarak metodolojimiz şeffaftır. Skorlar bilgilendirme amaçlıdır.',
      { actionType: 'post' }
    );
    assert.equal(result.ok, false);
    assert.equal(result.severity, 'warning');
    assert.ok(result.issues.some((i) => i.code === 'brand_in_first_sentence' && i.severity === 'warning'));
  });

  it('garanti tasarruf fails', () => {
    const result = lintLinkedInText('Bu araçla garanti tasarruf sağlarsınız.');
    assert.equal(result.severity, 'fail');
    assert.ok(result.issues.some((i) => i.code === 'forbidden_claim' || i.code === 'guarantee_claim'));
  });

  it('kesin kazanç fails', () => {
    const result = lintLinkedInText('Bu yatırım kesin kazanç getirir.');
    assert.equal(result.severity, 'fail');
  });

  it('finansal tavsiye değildir disclaimer does not fail', () => {
    const result = lintLinkedInText(CLEAN_METHODOLOGY_POST, { actionType: 'post' });
    assert.ok(!result.issues.some((i) => i.code === 'financial_advice'));
    assert.equal(result.severity, 'pass');
  });

  it('finansal tavsiye veriyoruz fails', () => {
    const result = lintLinkedInText('Size finansal tavsiye veriyoruz; şu krediyi alın.');
    assert.equal(result.severity, 'fail');
    assert.ok(result.issues.some((i) => i.code === 'financial_advice'));
  });

  it('hukuki tavsiye fails', () => {
    const result = lintLinkedInText('Bu konuda hukuki tavsiye verebiliriz.');
    assert.equal(result.severity, 'fail');
    assert.ok(result.issues.some((i) => i.code === 'legal_advice'));
  });

  it('yatırım tavsiyesi fails', () => {
    const result = lintLinkedInText('Bu hisse için yatırım tavsiyesi sunuyoruz.');
    assert.equal(result.severity, 'fail');
    assert.ok(result.issues.some((i) => i.code === 'investment_advice'));
  });

  it('automation promises fail', () => {
    for (const text of [
      'Sistem otomatik yorum yapar.',
      'LinkedIn API ile otomatik paylaşım sağlarız.',
      'Otomatik beğeni ve otomatik takip özelliği var.'
    ]) {
      const result = lintLinkedInText(text);
      assert.equal(result.severity, 'fail', `expected fail for: ${text}`);
      assert.ok(result.issues.some((i) => i.code === 'automation_language'));
    }
  });

  it('more than max hashtags warns', () => {
    const result = lintLinkedInText('Metin #TCO #AI #karar için örnek.', { maxHashtags: 1 });
    assert.equal(result.severity, 'warning');
    assert.ok(result.issues.some((i) => i.code === 'hashtag_limit'));
  });

  it('more than max links warns', () => {
    const result = lintLinkedInText(
      'Link1 https://www.istebul.com/metodoloji/ ve link2 https://www.istebul.com/rehber/tco/',
      { maxLinks: 1 }
    );
    assert.equal(result.severity, 'warning');
    assert.ok(result.issues.some((i) => i.code === 'link_limit'));
  });

  it('/metodoloji/ link passes on clean post', () => {
    const result = lintLinkedInText(CLEAN_METHODOLOGY_POST, { actionType: 'post' });
    assert.ok(!result.issues.some((i) => i.code === 'sales_page_link'));
    assert.equal(result.severity, 'pass');
  });

  it('/auto/ or /planlar links warn or fail', () => {
    const autoResult = lintLinkedInText(
      'Detay: https://www.istebul.com/auto/ adresinde.',
      { actionType: 'post' }
    );
    assert.ok(autoResult.issues.some((i) => i.code === 'sales_page_link'));

    const planResult = lintLinkedInText(
      'Planlar: https://www.istebul.com/planlar',
      { actionType: 'comment_opportunity' }
    );
    assert.equal(planResult.severity, 'fail');
    assert.ok(planResult.issues.some((i) => i.code === 'sales_page_link' && i.severity === 'fail'));
  });

  it('English clean comment passes', () => {
    const result = lintLinkedInText(CLEAN_EN_COMMENT, {
      actionType: 'comment_opportunity',
      language: 'en'
    });
    assert.equal(result.ok, true);
    assert.equal(result.severity, 'pass');
  });

  it('aggressive CTA fails', () => {
    for (const text of ['Hemen kaydol ve dene.', 'Formu doldurun, satın al.']) {
      const result = lintLinkedInText(text);
      assert.equal(result.severity, 'fail', `expected fail for: ${text}`);
      assert.ok(result.issues.some((i) => i.code === 'sales_cta'));
    }
  });
});
