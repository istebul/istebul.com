import { escapeHtml } from '../../core/security.js';

function formatCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '—';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(numeric);
}

export function renderUserResultCard(result) {
  const score = Math.max(0, Math.min(100, Number(result.score) || 0));
  return `
    <article class="ud-result-card">
      <p class="ud-result-badge">${escapeHtml(result.categoryLabel || 'Analiz Sonucu')}</p>
      <div class="ud-result-score">
        <strong>${score}</strong><span>/100</span>
      </div>
      <p><span>Aylık / Toplam Maliyet</span><strong>${escapeHtml(result.costLabel || '—')}</strong></p>
      <p><span>Risk Seviyesi</span><strong>${escapeHtml(result.riskLevel || 'Belirsiz')}</strong></p>
      <p><span>AI Yorumu</span><strong>${escapeHtml(result.aiSummary || 'Bilgi yetersiz.')}</strong></p>
      ${result.purposeLabel ? `<p><span>Amaç</span><strong>${escapeHtml(result.purposeLabel)}</strong></p>` : ''}
      ${result.locationLabel ? `<p><span>Lokasyon</span><strong>${escapeHtml(result.locationLabel)}</strong></p>` : ''}
      <p><span>Tarih</span><strong>${escapeHtml(result.dateLabel || '—')}</strong></p>
      <div class="ud-result-actions">
        ${result.showReanalyze ? `<a class="btn btn-outline btn-sm" href="${escapeHtml(result.reanalyzeHref || '/konut/')}">Tekrar analiz et</a>` : ''}
        <a class="btn btn-ghost btn-sm" href="${escapeHtml(result.href || '/gecmis')}">Raporu görüntüle</a>
      </div>
    </article>
  `;
}

export function mapHistoryRecordToResult(record = {}) {
  const monthly = Number(record?.topPick?.monthlyPayment || 0);
  const yearly = Number(record?.topPick?.yearlyCost || 0);
  const costLabel = monthly > 0 ? `${formatCurrency(monthly)} / ay` : yearly > 0 ? `${formatCurrency(yearly)} / toplam` : '—';
  const categoryId = record.categoryId || '';
  const href = categoryId === 'konut' || categoryId === 'housing'
    ? '/konut/'
    : categoryId === 'finans' || categoryId === 'finansman'
      ? '/finans/'
      : categoryId === 'tatil'
        ? '/tatil/'
        : categoryId === 'auto' || categoryId === 'arac' || categoryId === 'araba'
          ? '/auto/'
          : '/gecmis';
  const riskFromRecord = record?.topPick?.riskLevel;
  const isKonut = categoryId === 'konut' || categoryId === 'housing';
  return {
    id: record.id,
    categoryLabel: record.categoryName || 'Karar Sonucu',
    score: record?.topPick?.score || 0,
    costLabel,
    riskLevel: riskFromRecord || ((record?.topPick?.score || 0) >= 85 ? 'Düşük' : (record?.topPick?.score || 0) >= 65 ? 'Orta' : 'Yüksek'),
    aiSummary: record.summary || 'Tahmini analiz sonucu kaydedildi.',
    dateLabel: record.createdAt ? new Date(record.createdAt).toLocaleDateString('tr-TR') : '—',
    purposeLabel: record.purchasePurpose || '',
    locationLabel: record.city && record.district ? `${record.city} / ${record.district}` : '',
    href,
    showReanalyze: isKonut,
    reanalyzeHref: '/konut/'
  };
}
