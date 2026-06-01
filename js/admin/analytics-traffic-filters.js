/**
 * Admin analytics dashboards — real / internal / all data modes.
 */

export const ANALYTICS_DATA_MODES = Object.freeze({
  REAL: 'real',
  INTERNAL: 'internal',
  ALL: 'all'
});

export const ANALYTICS_DATA_MODE_LABELS = Object.freeze({
  real: 'Gerçek Kullanıcı Verisi',
  internal: 'Test/Geliştirici Verisi',
  all: 'Tüm Veri'
});

export function rowIsInternal(row) {
  if (row?.is_internal === true) return true;
  if (row?.properties?.is_internal === true) return true;
  return false;
}

export function rowTrafficType(row) {
  return row?.traffic_type || row?.properties?.traffic_type || 'unknown';
}

export function filterAnalyticsRows(rows, mode = ANALYTICS_DATA_MODES.REAL, cleanStartAt = null) {
  let list = Array.isArray(rows) ? [...rows] : [];

  if (mode === ANALYTICS_DATA_MODES.ALL) return list;

  if (cleanStartAt && mode === ANALYTICS_DATA_MODES.REAL) {
    const cutoff = new Date(cleanStartAt).getTime();
    if (Number.isFinite(cutoff)) {
      list = list.filter((row) => {
        const ts = row?.created_at ? new Date(row.created_at).getTime() : 0;
        return ts >= cutoff;
      });
    }
  }

  if (mode === ANALYTICS_DATA_MODES.INTERNAL) {
    return list.filter((row) => rowIsInternal(row) || rowTrafficType(row) === 'internal');
  }

  return list.filter(
    (row) =>
      !rowIsInternal(row) &&
      rowTrafficType(row) !== 'internal' &&
      rowTrafficType(row) !== 'bot'
  );
}

export function renderAnalyticsDataModeToolbar(activeMode = ANALYTICS_DATA_MODES.REAL) {
  return `
    <div class="analytics-data-mode" role="group" aria-label="Veri modu">
      ${Object.entries(ANALYTICS_DATA_MODE_LABELS)
        .map(
          ([id, label]) => `
        <button type="button" class="btn btn-sm ${id === activeMode ? 'btn-primary' : 'btn-ghost'}" data-analytics-data-mode="${id}">
          ${label}
        </button>`
        )
        .join('')}
    </div>`;
}

export async function fetchAnalyticsCleanStartAt(sb) {
  if (!sb) return null;
  const { data } = await sb
    .from('site_settings')
    .select('value')
    .eq('key', 'analytics_clean_start_at')
    .maybeSingle();
  return data?.value || null;
}
