import { escapeHtml } from '../../core/security.js';

export function renderUserDecisionCard(card) {
  const progress = Math.max(0, Math.min(100, Number(card.progress) || 0));
  return `
    <article class="ud-decision-card">
      <p class="ud-decision-kicker">${escapeHtml(card.category || 'Karar')}</p>
      <h3>${escapeHtml(card.title || 'Devam eden analiz')}</h3>
      <p>${escapeHtml(card.description || '')}</p>
      <div class="ud-progress" role="img" aria-label="İlerleme yüzde ${progress}">
        <span style="width:${progress}%"></span>
      </div>
      <div class="ud-decision-meta">
        <small>${escapeHtml(card.updatedAtLabel || 'Son güncelleme yok')}</small>
        <strong>%${progress}</strong>
      </div>
      <a class="btn btn-primary btn-sm" href="${escapeHtml(card.href || '/')}">Devam Et</a>
    </article>
  `;
}

export function renderEmptyDecisionCard() {
  return `
    <article class="ud-empty-card">
      <h3>Henüz devam eden kararınız yok.</h3>
      <p>Araba, konut, tatil veya finansman kategorilerinden yeni analiz başlatabilirsiniz.</p>
      <a href="/karar-asistani/" class="btn btn-outline btn-sm">Ön değerlendirmeye başla</a>
    </article>
  `;
}
