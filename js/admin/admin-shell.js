/**
 * Admin shell — sidebar collapse, nav groups, global search (no routing changes).
 */

const NAV_LABELS = {
  dashboard: 'Dashboard',
  users: 'Kullanıcılar',
  'auto-leads': 'Lead CRM',
  listings: 'İlan / Ürünler',
  settings: 'Ayarlar',
  content: 'Sayfa içerikleri',
  announcements: 'Duyurular',
  campaigns: 'Kampanyalar',
  faqs: 'SSS',
  blog: 'Blog',
  'auto-analytics': 'Auto analitik',
  'platform-analytics': 'Platform analitik',
  'dashboard-ceo': 'CEO dashboard',
  'dashboard-growth': 'Growth dashboard',
  'dashboard-revenue': 'Ödemeler',
  'dashboard-partner-ops': 'Partner ops',
  'dashboard-support': 'Support dashboard',
  'ops-ai-assistant': 'AI karar motoru',
  'investor-metrics': 'Executive KPIs',
  observability: 'Sistem logları',
  'ops-command-center': 'Ops command',
  'startup-operating-center': 'Startup operating',
  'scale-architecture': 'Scale architecture',
  'company-operating-system': 'Company OS',
  'hiring-architecture': 'Hiring',
  'international-expansion': 'Global expansion',
  'category-dominance': 'AI skor & moat',
  'competitor-attack': 'Defense',
  'expansion-prioritization': 'Expansion roadmap',
  'strategic-partnerships': 'Partnerships',
  'acquisition-exit': 'Exit / M&A',
  'partner-endpoints': 'Partner kanalları',
  'partner-applications': 'Partner başvuruları',
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
  const label = NAV_LABELS[pageId] || pageId || 'Dashboard';
  if (title) title.textContent = label;
  if (topTitle) topTitle.textContent = label;
}
