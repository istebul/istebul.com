/**
 * Admin shell — sidebar collapse, nav groups, global search (no routing changes).
 *
 * Header/search labels for admin pages. Keep in sync with admin-panel.html nav labels
 * and ADMIN_PAGE_IDS in admin-page-routing.js (Faz 4A-1a/4A-1b nav contract).
 */

const NAV_LABELS = {
  dashboard: 'Operasyon Özeti',
  users: 'Kullanıcılar',
  'auto-leads': 'Lead CRM',
  'vertical-leads': 'Dikey leadler',
  'vacation-analytics': 'Tatil Analytics',
  'vacation-leads': 'Tatil Leadleri',
  'vacation-scenarios': 'Tatil Senaryoları',
  'vacation-settings': 'Tatil Ayarları',
  'vacation-destinations': 'Destinasyon Yönetimi',
  'vacation-partners': 'Partner Yönetimi',
  'vacation-scoring': 'AI Prompt / Scoring',
  'housing-leads': 'Konut Leadleri',
  'housing-locations': 'Lokasyon Yönetimi',
  'housing-partners': 'Konut Partnerleri',
  'housing-scoring': 'Konut Scoring Ayarları',
  'finance-leads': 'Finans Leadleri',
  'sigorta-leads': 'Sigorta Leadleri',
  'kasko-leads': 'Kasko Leadleri',
  'finance-partners': 'Finans Partnerleri',
  'finance-scoring': 'Finans Scoring Ayarları',
  listings: 'Karar Seçenekleri',
  settings: 'Ayarlar',
  content: 'Sayfa içerikleri',
  announcements: 'Duyurular',
  campaigns: 'Kampanyalar',
  faqs: 'SSS',
  'home-news': 'Güncel haberler',
  blog: 'Blog',
  'linkedin-ops-assistant': 'LinkedIn Operasyon Asistanı',
  'unified-funnel': 'Birleşik Funnel',
  'auto-analytics': 'Auto analitik',
  'platform-analytics': 'Platform analitik',
  'dashboard-ceo': 'CEO Özeti',
  'dashboard-growth': 'Büyüme Özeti',
  'dashboard-revenue': 'Gelir Özeti',
  payments: 'Ödemeler',
  'dashboard-partner-ops': 'Partner Operasyon Özeti',
  'dashboard-support': 'Destek Özeti',
  'ops-ai-assistant': 'Ops asistan',
  'investor-metrics': 'Yatırımcı KPI',
  observability: 'Gözlemlenebilirlik',
  'ops-command-center': 'Operasyon Komuta Merkezi',
  'startup-operating-center': 'Startup operating',
  'scale-architecture': 'Scale architecture',
  'company-operating-system': 'Company OS',
  'hiring-architecture': 'Hiring',
  'international-expansion': 'Global',
  'category-dominance': 'Skor & moat',
  'competitor-attack': 'Defense',
  'expansion-prioritization': 'Expansion',
  'strategic-partnerships': 'Partnerships',
  'acquisition-exit': 'Exit / M&A',
  'partner-endpoints': 'Partner kanalları',
  'partner-applications': 'Başvurular',
  'partner-dispatch-logs': 'Teslimat logları'
};

function filterNavItems(query) {
  const q = String(query || '').trim().toLowerCase();
  document.querySelectorAll('#admin-nav .nav-item').forEach((item) => {
    const target = item.dataset.pageTarget || '';
    const label = (item.textContent || NAV_LABELS[target] || target).toLowerCase();
    const match = !q || label.includes(q) || target.includes(q);
    item.classList.toggle('is-filtered-out', !match);
    const group = item.closest('.nav-group');
    if (group && match) {
      group.classList.remove('is-collapsed');
      const toggle = group.querySelector('.nav-group-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
    }
  });
  document.querySelectorAll('#admin-nav .nav-group').forEach((group) => {
    const visible = group.querySelectorAll('.nav-item:not(.is-filtered-out)').length;
    group.classList.toggle('is-empty', q.length > 0 && visible === 0);
  });
}

export function initAdminShell() {
  const collapseBtn = document.getElementById('admin-sidebar-collapse');
  const storageKey = 'ib-admin-sidebar-collapsed';

  if (localStorage.getItem(storageKey) === '1') {
    document.body.classList.add('admin-sidebar-collapsed');
  }

  collapseBtn?.addEventListener('click', () => {
    const collapsed = document.body.classList.toggle('admin-sidebar-collapsed');
    localStorage.setItem(storageKey, collapsed ? '1' : '0');
    collapseBtn.setAttribute(
      'aria-label',
      collapsed ? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'
    );
  });

  document.querySelectorAll('.nav-group-toggle').forEach((btn) => {
    const group = btn.closest('.nav-group');
    if (!group) return;
    if (group.dataset.defaultCollapsed === 'true') {
      group.classList.add('is-collapsed');
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', () => {
      const collapsed = group.classList.toggle('is-collapsed');
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });
  });

  const search = document.getElementById('admin-global-search');
  search?.addEventListener('input', () => filterNavItems(search.value));
  search?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const first = document.querySelector('#admin-nav .nav-item:not(.is-filtered-out)');
    if (first?.dataset.pageTarget) {
      first.click();
      search.blur();
    }
  });

  document.getElementById('admin-notify-btn')?.addEventListener('click', () => {
    const item = document.querySelector('[data-page-target="observability"]');
    item?.click();
  });
}

export function syncAdminHeaderTitle(pageId) {
  const title = document.getElementById('admin-mobile-title');
  const topTitle = document.getElementById('admin-topbar-title');
  const label = NAV_LABELS[pageId] || pageId || 'Operasyon Özeti';
  if (title) title.textContent = label;
  if (topTitle) topTitle.textContent = label;
}
