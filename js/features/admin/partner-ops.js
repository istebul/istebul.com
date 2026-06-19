/**
 * P2.5 — Partner operations UX helpers (admin CRM; honest dispatch/retry copy).
 */

export const PARTNER_DISPATCH_STATUSES = Object.freeze({
  pending: { label: 'Bekliyor', badge: 'badge-blue' },
  dispatched: { label: 'Teslim edildi', badge: 'badge-green' },
  dispatch_failed: { label: 'Gönderim hatası', badge: 'badge-yellow' },
  dispatch_dead: { label: 'Retry tükendi', badge: 'badge-red' },
  won: { label: 'Kazanıldı', badge: 'badge-green' },
  lost: { label: 'Kaybedildi', badge: 'badge-red' }
});

export const CRM_PIPELINE_QUICK = Object.freeze([
  ['new', 'Yeni'],
  ['first_contact', 'İlk temas'],
  ['callback', 'Tekrar ara'],
  ['proposal_sent', 'Teklif'],
  ['won', 'Kazanıldı'],
  ['lost', 'Kaybedildi']
]);

const RETRY_DELAYS = ['15 dk', '1 sa', '6 sa', '24 sa', '24 sa'];

export function describeRetryState(lead) {
  const count = Number(lead?.dispatch_retry_count || 0);
  const status = String(lead?.partner_status || 'pending');
  const nextAt = lead?.next_retry_at ? new Date(lead.next_retry_at) : null;
  const now = new Date();

  if (status === 'dispatched') {
    return { headline: 'Partner webhook başarılı', detail: 'Otomatik retry durdu.', tone: 'success' };
  }
  if (status === 'dispatch_dead') {
    return {
      headline: 'Maksimum retry (5/5)',
      detail: 'Manuel gönderim veya endpoint düzeltmesi gerekir.',
      tone: 'danger'
    };
  }
  if (status === 'dispatch_failed') {
    const nextLabel = nextAt && nextAt > now
      ? nextAt.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : null;
    const delayHint = RETRY_DELAYS[Math.min(count, RETRY_DELAYS.length - 1)] || '24 sa';
    return {
      headline: `Başarısız deneme ${count}/5`,
      detail: nextLabel
        ? `Sonraki otomatik retry: ${nextLabel} (plan: +${delayHint})`
        : `Retry kuyruğunda veya manuel gönderim bekleniyor (+${delayHint} planı)`,
      tone: 'warning'
    };
  }
  if (status === 'pending') {
    return { headline: 'Partner gönderimi bekliyor', detail: 'Hot lead dispatch kuyruğunda.', tone: 'muted' };
  }
  return { headline: status, detail: '', tone: 'muted' };
}

export function computePartnerOpsKpis(leads) {
  const rows = Array.isArray(leads) ? leads : [];
  const partner = {
    pending: 0,
    dispatched: 0,
    dispatch_failed: 0,
    dispatch_dead: 0,
    won: 0,
    overdueFollowUp: 0,
    hot: 0
  };
  const now = new Date();

  for (const lead of rows) {
    const ps = String(lead.partner_status || 'pending');
    if (partner[ps] != null) partner[ps] += 1;
    if (ps === 'won') partner.won += 1;
    if (['hot', 'very_hot'].includes(lead.priority)) partner.hot += 1;
    if (lead.follow_up_at && !lead.follow_up_done && new Date(lead.follow_up_at) < now) {
      partner.overdueFollowUp += 1;
    }
  }

  return partner;
}

export function aggregatePartnerFunnelEvents(rows) {
  const counts = {
    partner_landing_view: 0,
    partner_application_submit: 0,
    partner_onboarding_view: 0,
    partner_webhook_draft_saved: 0,
    partner_onboarding_complete: 0,
    partner_dispatch_success: 0,
    partner_dispatch_failed: 0
  };

  for (const row of rows || []) {
    const name = row.event_name;
    if (Object.prototype.hasOwnProperty.call(counts, name)) {
      counts[name] += 1;
    }
  }

  return counts;
}

export function funnelConversionPct(step, previous) {
  if (!previous) return '—';
  return `${Math.round((step / previous) * 100)}%`;
}

export function partnerStatusBadge(status) {
  const meta = PARTNER_DISPATCH_STATUSES[status];
  if (meta) return meta;
  return { label: status || '—', badge: 'badge-blue' };
}

export function formatDispatchLogRow(log) {
  return {
    at: log.created_at,
    route: log.partner_route,
    endpoint: log.endpoint_name,
    trigger: log.trigger_source,
    http: log.http_status,
    ms: log.duration_ms,
    ok: Boolean(log.success),
    error: log.error_message || ''
  };
}
