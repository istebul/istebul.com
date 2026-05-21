import { getSupabaseClient } from './core/supabase.js';

const sb = getSupabaseClient();

if (!sb) {
  document.body.innerHTML = `
    <div class="admin-config-error">
      <div>
        <h2>Supabase yapılandırması eksik</h2>
        <p>SUPABASE_URL veya SUPABASE_ANON_KEY yüklenemedi.</p>
      </div>
    </div>
  `;
  throw new Error('Supabase config missing');
}
let currentUser = null;

async function login() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  err.style.display = 'none';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { err.textContent = 'Hata: ' + error.message; err.style.display = 'block'; return; }
  currentUser = data.user;
  showApp();
}

async function logout() {
  await sb.auth.signOut();
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

async function showApp() {
  const { data: profile, error } = await sb
    .from('profiles')
    .select('role, is_banned')
    .eq('id', currentUser.id)
    .single();

  if (error || !profile || profile.role !== 'admin' || profile.is_banned === true) {
    await sb.auth.signOut();
    currentUser = null;
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    const err = document.getElementById('login-error');
    err.textContent = 'Bu panele erişim yetkiniz yok.';
    err.style.display = 'block';
    return;
  }

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  const email = currentUser?.email || '';
  document.getElementById('user-email').textContent = email;
  document.getElementById('user-avatar').textContent = email[0]?.toUpperCase() || 'A';
  loadDashboard();
  loadSettings();
  loadAnnouncements();
  loadFaqs();
  loadPosts();
  loadListings();
  loadUsers();
  loadAutoLeads();
  loadAutoAnalytics();
  loadPartnerEndpoints();
}

function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (el) el.classList.add('active');

  if (name === 'partner-endpoints') {
    loadPartnerEndpoints();
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ''));
    const allowed = ['https:', 'http:'];
    if (!allowed.includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'success' ? '✓ ' : '✗ ') + msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function adminAction(payload) {
  const { data: sessionData } = await sb.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    toast('Oturum bulunamadı. Tekrar giriş yapın.', 'error');
    throw new Error('No session token');
  }

  const { data, error } = await sb.functions.invoke('admin-action', {
    body: payload,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (error) {
    let detail = error.message;

    try {
      const body = await error.context?.clone?.().json?.();
      detail = body?.error || body?.message || detail;
      console.error('admin-action error body:', body);
    } catch (_) {
      try {
        const text = await error.context?.clone?.().text?.();
        if (text) detail = text;
        console.error('admin-action error text:', text);
      } catch (_) {}
    }

    console.error(error);
    toast('Hata: ' + detail, 'error');
    throw new Error(detail);
  }

  if (data?.error) {
    console.error(data.error);
    toast('Hata: ' + data.error, 'error');
    throw new Error(data.error);
  }

  return data;
}


async function loadDashboard() {
  try {
    const [u, l, a, f, p] = await Promise.all([
      sb.from('profiles').select('*', { count: 'exact', head: true }),
      sb.from('listings').select('*', { count: 'exact', head: true }),
      sb.from('announcements').select('*', { count: 'exact', head: true }).eq('is_active', true),
      sb.from('faqs').select('*', { count: 'exact', head: true }),
      sb.from('posts').select('*', { count: 'exact', head: true }).eq('is_published', true)
    ]);
    document.getElementById('stat-users').textContent = u.count ?? '—';
    document.getElementById('stat-listings').textContent = l.count ?? '—';
    document.getElementById('stat-ann').textContent = a.count ?? '—';
    document.getElementById('stat-faqs').textContent = f.count ?? '—';
    document.getElementById('stat-posts').textContent = p.count ?? '—';
  } catch(e) {}
}

const KEYS = ['phone','email','address','instagram','twitter','facebook','linkedin','youtube','tiktok',
              'site-name','site-subtitle','hero-eyebrow','hero-title','hero-desc','title','description','auto_whatsapp_phone'];

async function loadSettings() {
  const { data } = await sb.from('site_settings').select('*');
  if (!data) return;
  const map = {};
  data.forEach(r => map[r.key] = r.value);
  KEYS.forEach(f => {
    const el = document.getElementById('s-' + f);
    if (el && map[f] !== undefined) el.value = map[f];
  });
  if (map['maintenance'] === 'true') document.getElementById('s-maintenance').checked = true;
}

async function saveSettings() {
  const rows = KEYS.map(f => ({ key: f, value: document.getElementById('s-' + f)?.value || '' }));
  rows.push({ key: 'maintenance', value: document.getElementById('s-maintenance').checked ? 'true' : 'false' });
  await adminAction({ action: 'upsert_settings', table: 'site_settings', id: 'settings', values: rows });
  toast('Kaydedildi!');
}

async function loadAnnouncements() {
  const { data } = await sb.from('announcements').select('*').order('created_at', { ascending: false });
  const el = document.getElementById('announcements-list');
  if (!data?.length) { el.innerHTML = '<p class="empty">Henüz duyuru yok.</p>'; return; }
  el.innerHTML = '<table class="table"><thead><tr><th>Başlık</th><th>İçerik</th><th>Durum</th><th>Tarih</th><th></th></tr></thead><tbody>' +
    data.map(a => `<tr><td><strong>${escapeHtml(a.title||'—')}</strong></td><td class="cell-truncate">${escapeHtml(a.content||'—')}</td><td><span class="badge ${a.is_active?'badge-green':'badge-red'}">${a.is_active?'Aktif':'Pasif'}</span></td><td class="text-muted cell-nowrap">${new Date(a.created_at).toLocaleDateString('tr-TR')}</td><td><div class="table-actions"><button class="btn btn-ghost btn-sm" data-action="toggle-ann" data-id="${safeAttr(a.id)}" data-active="${a.is_active}">${a.is_active?'Durdur':'Yayınla'}</button><button class="btn btn-danger btn-sm" data-action="delete-ann" data-id="${safeAttr(a.id)}">Sil</button></div></td></tr>`).join('') + '</tbody></table>';
}

async function saveAnnouncement() {
  const title = document.getElementById('a-title').value.trim();
  const content = document.getElementById('a-content').value.trim();
  const is_active = document.getElementById('a-active').checked;
  if (!title) { toast('Başlık zorunlu', 'error'); return; }
  await adminAction({ action: 'insert', table: 'announcements', id: 'new', values: { title, content, is_active } });
  toast('Duyuru eklendi');
  document.getElementById('a-title').value = '';
  document.getElementById('a-content').value = '';
  loadAnnouncements(); loadDashboard();
}

async function toggleAnn(id, current) {
  await adminAction({ action: 'update', table: 'announcements', id, values: { is_active: !current } });
  toast(current ? 'Durduruldu' : 'Yayınlandı');
  loadAnnouncements();
}

async function deleteAnn(id) {
  if (!confirm('Silmek istediğinize emin misiniz?')) return;
  await adminAction({ action: 'delete', table: 'announcements', id });
  toast('Silindi');
  loadAnnouncements(); loadDashboard();
}

async function loadFaqs() {
  const { data } = await sb.from('faqs').select('*').order('order_num').order('created_at', { ascending: false });
  const el = document.getElementById('faqs-list');
  if (!data?.length) { el.innerHTML = '<p class="empty">Henüz SSS yok.</p>'; return; }
  el.innerHTML = '<table class="table"><thead><tr><th>#</th><th>Soru</th><th>Durum</th><th></th></tr></thead><tbody>' +
    data.map(f => `<tr><td class="text-muted">${f.order_num||0}</td><td>${escapeHtml(f.question||'—')}</td><td><span class="badge ${f.is_active?'badge-green':'badge-red'}">${f.is_active?'Aktif':'Pasif'}</span></td><td><div class="table-actions"><button class="btn btn-ghost btn-sm" data-action="toggle-faq" data-id="${safeAttr(f.id)}" data-active="${f.is_active}">${f.is_active?'Gizle':'Göster'}</button><button class="btn btn-danger btn-sm" data-action="delete-faq" data-id="${safeAttr(f.id)}">Sil</button></div></td></tr>`).join('') + '</tbody></table>';
}

async function saveFaq() {
  const question = document.getElementById('faq-question').value.trim();
  const answer = document.getElementById('faq-answer').value.trim();
  const order_num = parseInt(document.getElementById('faq-order').value) || 0;
  const is_active = document.getElementById('faq-active').checked;
  if (!question) { toast('Soru zorunlu', 'error'); return; }
  await adminAction({ action: 'insert', table: 'faqs', id: 'new', values: { question, answer, order_num, is_active } });
  toast('SSS eklendi');
  document.getElementById('faq-question').value = '';
  document.getElementById('faq-answer').value = '';
  loadFaqs(); loadDashboard();
}

async function toggleFaq(id, current) {
  await adminAction({ action: 'update', table: 'faqs', id, values: { is_active: !current } });
  toast(current ? 'Gizlendi' : 'Gösterildi');
  loadFaqs();
}

async function deleteFaq(id) {
  if (!confirm('Silmek istediğinize emin misiniz?')) return;
  await adminAction({ action: 'delete', table: 'faqs', id });
  toast('Silindi');
  loadFaqs(); loadDashboard();
}

function autoSlug() {
  const title = document.getElementById('post-title').value;
  document.getElementById('post-slug').value = title.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim();
}

async function loadPosts() {
  const { data } = await sb.from('posts').select('*').order('created_at', { ascending: false });
  const el = document.getElementById('posts-list');
  if (!data?.length) { el.innerHTML = '<p class="empty">Henüz yazı yok.</p>'; return; }
  el.innerHTML = '<table class="table"><thead><tr><th>Başlık</th><th>Slug</th><th>Durum</th><th>Tarih</th><th></th></tr></thead><tbody>' +
    data.map(p => `<tr><td><strong>${escapeHtml(p.title||'—')}</strong></td><td class="text-muted text-xs">/${escapeHtml(p.slug||'—')}</td><td><span class="badge ${p.is_published?'badge-green':'badge-yellow'}">${p.is_published?'Yayında':'Taslak'}</span></td><td class="text-muted cell-nowrap">${new Date(p.created_at).toLocaleDateString('tr-TR')}</td><td><div class="table-actions"><button class="btn btn-ghost btn-sm" data-action="toggle-post" data-id="${safeAttr(p.id)}" data-active="${p.is_published}">${p.is_published?'Taslağa al':'Yayınla'}</button><button class="btn btn-danger btn-sm" data-action="delete-post" data-id="${safeAttr(p.id)}">Sil</button></div></td></tr>`).join('') + '</tbody></table>';
}

async function savePost() {
  const title = document.getElementById('post-title').value.trim();
  const slug = document.getElementById('post-slug').value.trim() || title.toLowerCase().replace(/\s+/g,'-');
  const content = document.getElementById('post-content').value.trim();
  const is_published = document.getElementById('post-published').checked;
  if (!title) { toast('Başlık zorunlu', 'error'); return; }
  await adminAction({ action: 'insert', table: 'posts', id: 'new', values: { title, slug, content, is_published } });
  toast('Yazı eklendi');
  document.getElementById('post-title').value = '';
  document.getElementById('post-slug').value = '';
  document.getElementById('post-content').value = '';
  loadPosts(); loadDashboard();
}

async function togglePost(id, current) {
  await adminAction({ action: 'update', table: 'posts', id, values: { is_published: !current } });
  toast(current ? 'Taslağa alındı' : 'Yayınlandı');
  loadPosts(); loadDashboard();
}

async function deletePost(id) {
  if (!confirm('Silmek istediğinize emin misiniz?')) return;
  await adminAction({ action: 'delete', table: 'posts', id });
  toast('Silindi');
  loadPosts(); loadDashboard();
}

async function loadListings() {
  const { data } = await sb.from('listings').select('*').order('created_at', { ascending: false }).limit(100);
  const el = document.getElementById('listings-list');
  if (!data?.length) { el.innerHTML = '<p class="empty">Henüz ilan yok.</p>'; return; }
  el.innerHTML = '<table class="table"><thead><tr><th>Başlık</th><th>Kategori</th><th>Fiyat</th><th>Durum</th><th>Tarih</th><th></th></tr></thead><tbody>' +
    data.map(l => `<tr><td><strong>${escapeHtml(l.title||l.name||'—')}</strong></td><td><span class="badge badge-blue">${escapeHtml(l.category||l.type||'—')}</span></td><td class="cell-nowrap">${l.price?Number(l.price).toLocaleString('tr-TR')+' ₺':'—'}</td><td><span class="badge ${!l.status||l.status==='active'?'badge-green':'badge-red'}">${l.status||'aktif'}</span></td><td class="text-muted cell-nowrap">${l.created_at?new Date(l.created_at).toLocaleDateString('tr-TR'):'—'}</td><td><div class="table-actions"><button class="btn btn-warning btn-sm" data-action="feature-listing" data-id="${safeAttr(l.id)}" data-active="${!!l.is_featured}">${l.is_featured?'Öne çıkarmayı kaldır':'Öne çıkar'}</button><button class="btn btn-danger btn-sm" data-action="delete-listing" data-id="${safeAttr(l.id)}">Sil</button></div></td></tr>`).join('') + '</tbody></table>';
}

async function featureListing(id, current) {
  await adminAction({ action: 'update', table: 'listings', id, values: { is_featured: !current } });
  toast(current ? 'Kaldırıldı' : 'Öne çıkarıldı');
  loadListings();
}

async function deleteListing(id) {
  if (!confirm('Bu ilanı silmek istediğinize emin misiniz?')) return;
  await adminAction({ action: 'delete', table: 'listings', id });
  toast('İlan silindi');
  loadListings(); loadDashboard();
}

async function loadUsers() {
  const { data } = await sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
  const el = document.getElementById('users-list');
  if (!data?.length) { el.innerHTML = '<p class="empty">Henüz kullanıcı yok.</p>'; return; }
  el.innerHTML = '<table class="table"><thead><tr><th>Ad</th><th>E-posta</th><th>Rol</th><th>Kayıt</th><th></th></tr></thead><tbody>' +
    data.map(u => {
      const isAdmin = u.role === 'admin';
      const isSelf = u.id === currentUser?.id;
      const actions = [];

      if (!isAdmin) {
        actions.push(`<button class="btn btn-ghost btn-sm" data-action="set-user-role" data-id="${safeAttr(u.id)}" data-role="admin">Admin yap</button>`);
      }

      if (isAdmin && !isSelf) {
        actions.push(`<button class="btn btn-ghost btn-sm" data-action="set-user-role" data-id="${safeAttr(u.id)}" data-role="user">Yetki kaldır</button>`);
      }

      if (!isSelf) {
        actions.push(`<button class="btn btn-danger btn-sm" data-action="ban-user" data-id="${safeAttr(u.id)}">Engelle</button>`);
      }

      const displayName = escapeHtml(u.full_name || u.name || '—');
      const email = escapeHtml(u.email || '—');
      const role = escapeHtml(u.role || 'kullanıcı');
      const createdAt = u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '—';

      return `<tr><td><strong>${displayName}</strong></td><td class="text-muted">${email}</td><td><span class="badge ${u.role==='admin'?'badge-blue':u.role==='moderator'?'badge-yellow':'badge-green'}">${role}</span></td><td class="text-muted cell-nowrap">${createdAt}</td><td><div class="table-actions">${actions.join('')}</div></td></tr>`;
    }).join('') + '</tbody></table>';
}


function normalizePhoneForWhatsapp(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('90')) return digits;
  if (digits.startsWith('0')) return `90${digits.slice(1)}`;
  return `90${digits}`;
}


async function trackAdminAutoEvent(eventName, metadata = {}) {
  // Admin panel analytics should not write directly to auto_events.
  // Auto funnel events are recorded through the auto-intake Edge Function.
  void eventName;
  void metadata;
}

async function loadAutoAnalytics() {
  const [autoEventsRes, autoLeadsRes] = await Promise.all([
    sb.from('auto_events').select('*').order('created_at', { ascending: false }).limit(500),
    sb.from('auto_leads').select('status, follow_up_at, follow_up_done, partner_status, estimated_revenue, actual_revenue')
  ]);

  const { data, error } = autoEventsRes;
  const { data: leads, error: leadsError } = autoLeadsRes;
  const el = document.getElementById('auto-analytics-list');

  if (!el) return;

  if (error || leadsError) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml((error || leadsError).message)}</p>`;
    return;
  }

  const events = data || [];
  const leadRows = leads || [];

  const counts = events.reduce((acc, event) => {
    acc[event.event_name] = (acc[event.event_name] || 0) + 1;
    return acc;
  }, {});

  const labels = {
    auto_page_view: 'Auto sayfa ziyareti',
    auto_form_started: 'Form başladı',
    auto_form_submitted: 'Form gönderildi',
    auto_analysis_started: 'Analiz başlatıldı',
    auto_results_rendered: 'Sonuç render',
    auto_modal_submitted: 'Modal gönderildi',
    auto_hot_lead_detected: 'Hot lead tespit',
    auto_quiz_submit: 'Eski quiz gönderimi',
    auto_email_submit: 'Eski email/telefon submit',
    auto_results_view: 'Sonuç görüntülendi',
    auto_modal_open: 'Lead formu açıldı',
    auto_lead_submit: 'Lead bırakıldı',
    auto_finance_click: 'Finansman tıklama',
    auto_whatsapp_click: 'WhatsApp iletişimi',
    decision_feedback_helpful: 'Karar faydalı',
    decision_feedback_unclear: 'Daha açıklama istiyor',
    decision_feedback_contact: 'Uzman destek isteği'
  };

  const pageViews = counts.auto_page_view || 0;
  const formStarted = counts.auto_form_started || counts.auto_analysis_started || counts.auto_quiz_submit || 0;
  const formSubmitted = counts.auto_form_submitted || counts.auto_results_view || counts.auto_results_rendered || 0;
  const analysisStarted = (counts.auto_analysis_started || 0) + (counts.auto_quiz_submit || 0);
  const resultsRendered = counts.auto_results_rendered || counts.auto_results_view || 0;
  const modalSubmitted = counts.auto_modal_submitted || counts.auto_lead_submit || 0;
  const hotLeadDetected = counts.auto_hot_lead_detected || 0;

  const pct = (value, base) => base ? Math.round((value / base) * 100) + '%' : '—';


  const totalExpectedRevenue = leadRows.reduce(
    (sum, lead) => sum + Number(lead.estimated_revenue || 0),
    0
  );

  const totalActualRevenue = leadRows.reduce(
    (sum, lead) => sum + Number(lead.actual_revenue || 0),
    0
  );

  const wonPartners = leadRows.filter(
    lead => lead.partner_status === 'won'
  ).length;

  const partnerTracked = leadRows.filter(
    lead => lead.partner_status && lead.partner_status !== 'pending'
  ).length;

  const revenuePerLead = leadRows.length
    ? Math.round(totalActualRevenue / leadRows.length)
    : 0;

  const revenuePerVisit = pageViews
    ? Math.round(totalActualRevenue / pageViews)
    : 0;

  const partnerWinRate = partnerTracked
    ? Math.round((wonPartners / partnerTracked) * 100)
    : 0;

  const analyticsCards = [
    ['auto_page_view', labels.auto_page_view, pageViews, 'trafik'],
    ['auto_form_started', labels.auto_form_started, formStarted, pct(formStarted, pageViews)],
    ['auto_form_submitted', labels.auto_form_submitted, formSubmitted, pct(formSubmitted, formStarted)],
    ['auto_results_rendered', labels.auto_results_rendered, resultsRendered, pct(resultsRendered, formSubmitted)],
    ['auto_modal_open', labels.auto_modal_open, counts.auto_modal_open || 0, pct(counts.auto_modal_open || 0, resultsRendered)],
    ['auto_modal_submitted', labels.auto_modal_submitted, modalSubmitted, pct(modalSubmitted, counts.auto_modal_open || 0)],
    ['auto_lead_submit', labels.auto_lead_submit, counts.auto_lead_submit || 0, pct(counts.auto_lead_submit || 0, modalSubmitted || 1)],
    ['auto_hot_lead_detected', labels.auto_hot_lead_detected, hotLeadDetected, 'priority'],
    ['auto_whatsapp_click', labels.auto_whatsapp_click, counts.auto_whatsapp_click || 0, pct(counts.auto_whatsapp_click || 0, resultsRendered)],
    ['expected_revenue', 'Beklenen Gelir', totalExpectedRevenue.toLocaleString('tr-TR') + ' ₺', 'pipeline'],
    ['actual_revenue', 'Gerçek Gelir', totalActualRevenue.toLocaleString('tr-TR') + ' ₺', 'cash'],
    ['revenue_per_lead', 'Lead Başına Gelir', revenuePerLead.toLocaleString('tr-TR') + ' ₺', 'unit'],
    ['revenue_per_visit', 'Ziyaret Başına Gelir', revenuePerVisit.toLocaleString('tr-TR') + ' ₺', 'traffic'],
    ['partner_win_rate', 'Partner Win Rate', partnerWinRate + '%', 'conversion']
  ];

  const leadCounts = leadRows.reduce((acc, lead) => {
    let status = lead.status || 'new';

    if (status === 'called') status = 'first_contact';
    if (status === 'interested') status = 'proposal_sent';
    if (status === 'closed') status = 'won';
    if (status === 'rejected') status = 'lost';

    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const totalLeads = leadRows.length;
  const crmPct = (value) => totalLeads ? Math.round((value / totalLeads) * 100) + '%' : '—';

  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const overdueCount = leadRows.filter(
    lead => lead.follow_up_at && !lead.follow_up_done && new Date(lead.follow_up_at) < now
  ).length;

  const todayCount = leadRows.filter(
    lead => lead.follow_up_at && !lead.follow_up_done && new Date(lead.follow_up_at) <= todayEnd
  ).length;

  const activeCount = leadRows.filter(
    lead => lead.follow_up_at && !lead.follow_up_done
  ).length;

  const opsCards = [
    ['🔴 Geciken', overdueCount, 'acil'],
    ['🟠 Bugün', todayCount, 'takip'],
    ['🟢 Aktif', activeCount, 'pipeline'],
    ['⚪ Toplam', totalLeads, 'lead']
  ];

  const crmCards = [
    ['Toplam Lead', totalLeads, '100%'],
    ['Yeni', leadCounts.new || 0, crmPct(leadCounts.new || 0)],
    ['İlk temas', leadCounts.first_contact || 0, crmPct(leadCounts.first_contact || 0)],
    ['Ulaşılamadı', leadCounts.unreachable || 0, crmPct(leadCounts.unreachable || 0)],
    ['Tekrar ara', leadCounts.callback || 0, crmPct(leadCounts.callback || 0)],
    ['Teklif gönderildi', leadCounts.proposal_sent || 0, crmPct(leadCounts.proposal_sent || 0)],
    ['Finansman', leadCounts.financing || 0, crmPct(leadCounts.financing || 0)],
    ['Sigorta', leadCounts.insurance || 0, crmPct(leadCounts.insurance || 0)],
    ['Kazanıldı', leadCounts.won || 0, crmPct(leadCounts.won || 0)],
    ['Kaybedildi', leadCounts.lost || 0, crmPct(leadCounts.lost || 0)],
    ['Test/Spam', leadCounts.spam || 0, crmPct(leadCounts.spam || 0)]
  ];

  el.innerHTML = `
    <h3 style="margin:0 0 14px 0;">Operasyon</h3>
    <div class="stat-grid">
      ${opsCards.map(([label, value, sub]) => `
        <div class="stat-card">
          <div class="stat-label">${label}</div>
          <div class="stat-value">${value}</div>
          <div class="stat-sub">${sub}</div>
        </div>
      `).join('')}
    </div>

    <div style="height:20px"></div>

    <h3 style="margin:0 0 14px 0;">CRM Funnel</h3>
    <div class="stat-grid">
      ${crmCards.map(([label, value, sub]) => `
        <div class="stat-card">
          <div class="stat-label">${label}</div>
          <div class="stat-value">${value}</div>
          <div class="stat-sub">${sub}</div>
        </div>
      `).join('')}
    </div>

    <div style="height:20px"></div>

    <h3 style="margin:0 0 14px 0;">Acquisition Funnel</h3>
    <div class="stat-grid">
      ${analyticsCards.map(([key, label, value, sub]) => `
        <div class="stat-card">
          <div class="stat-label">${label}</div>
          <div class="stat-value">${value}</div>
          <div class="stat-sub">${sub}</div>
        </div>
      `).join('')}
    </div>

    <div style="height:20px"></div>

    ${events.length ? `
      <table class="table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Email</th>
            <th>Telefon</th>
            <th>Tarih</th>
          </tr>
        </thead>
        <tbody>
          ${events.slice(0, 100).map(event => `
            <tr>
              <td><strong>${labels[event.event_name] || event.event_name}</strong></td>
              <td>${escapeHtml(event.email || '—')}</td>
              <td>${escapeHtml(event.phone || '—')}</td>
              <td>${event.created_at ? new Date(event.created_at).toLocaleString('tr-TR') : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="empty">Henüz analytics event yok.</p>'}
  `;
}








async function createPartnerEndpoint() {
  const name = document.getElementById('partner-name')?.value?.trim();
  const routeType = document.getElementById('partner-route-type')?.value;
  const webhookUrl = document.getElementById('partner-webhook-url')?.value?.trim();
  const priorityWeight = Number(document.getElementById('partner-priority-weight')?.value || 100);
  const dailyCapRaw = document.getElementById('partner-daily-cap')?.value;
  const notes = document.getElementById('partner-notes')?.value || '';

  if (!name || !routeType || !webhookUrl) {
    toast('Partner adı, yönlendirme tipi ve webhook URL zorunlu.', 'error');
    return;
  }

  await adminAction({
    action: 'insert',
    table: 'partner_endpoints',
    id: 'new',
    values: {
      name,
      route_type: routeType,
      webhook_url: webhookUrl,
      is_active: true,
      priority_weight: priorityWeight,
      daily_cap: dailyCapRaw ? Number(dailyCapRaw) : null,
      notes
    }
  });

  toast('Partner kanalı eklendi');
  ['partner-name', 'partner-webhook-url', 'partner-daily-cap', 'partner-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  loadPartnerEndpoints();
}

async function togglePartnerEndpoint(id, active) {
  await adminAction({
    action: 'update',
    table: 'partner_endpoints',
    id,
    values: {
      is_active: active === 'true'
    }
  });

  toast('Partner kanalı güncellendi');
  loadPartnerEndpoints();
}

async function loadPartnerEndpoints() {
  const { data, error } = await sb
    .from('partner_endpoints')
    .select('*')
    .order('priority_weight', { ascending: false });

  const el = document.getElementById('partner-endpoints-list');
  if (!el) return;

  if (error) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
    el.innerHTML = '<p class="empty">Partner endpoint yok.</p>';
    return;
  }

  el.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Partner</th>
          <th>Yönlendirme</th>
          <th>Durum</th>
          <th>Öncelik</th>
          <th>Günlük Limit</th>
          <th>Bugün Gönderilen</th>
          <th>Başarılı</th>
          <th>Başarısız</th>
          <th>İşlem</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>
            <td><strong>${escapeHtml(row.name)}</strong></td>
            <td>${escapeHtml({
              dealer_partner: 'Bayi / Galeri',
              finance_partner: 'Finansman',
              insurance_partner: 'Sigorta',
              premium_report: 'Premium Rapor',
              general_sales: 'Genel Satış'
            }[row.route_type] || row.route_type)}</td>
            <td>${row.is_active ? 'Aktif' : 'Pasif'}</td>
            <td>${row.priority_weight || 0}</td>
            <td>${row.daily_cap || '∞'}</td>
            <td>${row.sent_today || 0}</td>
            <td>${row.success_count || 0}</td>
            <td>${row.fail_count || 0}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-action="toggle-partner-endpoint" data-id="${safeAttr(row.id)}" data-active="${row.is_active ? 'false' : 'true'}">
                ${row.is_active ? 'Pasif yap' : 'Aktif yap'}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function formatShortDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDispatchError(value) {
  if (!value) return '—';
  const text = String(value);
  return text.length > 34 ? text.slice(0, 34) + '…' : text;
}

function formatFollowUpLabel(lead) {
  if (lead.follow_up_done) return 'Tamamlandı';
  if (!lead.follow_up_at) return '—';

  const date = new Date(lead.follow_up_at);
  const now = new Date();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const nextDayStart = new Date(todayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 2);

  if (date < now) return 'Gecikti';
  if (date >= todayStart && date < tomorrowStart) return 'Bugün';
  if (date >= tomorrowStart && date < nextDayStart) return 'Yarın';

  return date.toLocaleDateString('tr-TR');
}



function getFollowUpBadgeClass(label) {
  if (label === 'Gecikti') return 'badge-red';
  if (label === 'Bugün') return 'badge-yellow';
  if (label === 'Yarın') return 'badge-blue';
  if (label === 'Tamamlandı') return 'badge-green';
  return '';
}


async function loadAutoLeads() {
  const { data, error } = await sb
    .from('auto_leads')
    .select('*')
    .order('lead_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000);

  const el = document.getElementById('auto-leads-list');

  if (!el) return;

  if (error) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
    el.innerHTML = '<p class="empty">Henüz lead yok.</p>';
    return;
  }

  const searchValue = (document.getElementById('auto-leads-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('auto-leads-status-filter')?.value || '';
  const notesOnly = document.getElementById('auto-leads-notes-only')?.checked || false;
  const followFilter = document.getElementById('auto-leads-follow-filter')?.value || '';
  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const filteredData = data.filter((lead) => {
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'hot_only' && ['hot', 'very_hot'].includes(lead.priority)) ||
      (statusFilter === 'dispatch_failed' && lead.partner_status === 'dispatch_failed') ||
      (statusFilter === 'dispatch_dead' && lead.partner_status === 'dispatch_dead') ||
      (statusFilter === 'dispatched' && lead.partner_status === 'dispatched') ||
      (statusFilter === 'won_only' && lead.partner_status === 'won') ||
      (statusFilter === 'hide_test' && lead.status !== 'test_spam') ||
      lead.status === statusFilter;
    const hasNotes = !!(lead.notes || '').trim();
    const matchesNotes = !notesOnly || hasNotes;
    const haystack = [
      lead.email,
      lead.phone,
      lead.notes,
      lead.interest_type,
      lead.usage,
      lead.body,
      lead.fuel,
      lead.vehicle,
      lead.priority
    ].filter(Boolean).join(' ').toLowerCase();

    const followDate = lead.follow_up_at ? new Date(lead.follow_up_at) : null;
    const isFollowDone = lead.follow_up_done === true;
    const matchesFollow =
      !followFilter ||
      (followFilter === 'today' && followDate && followDate <= todayEnd && !isFollowDone) ||
      (followFilter === 'overdue' && followDate && followDate < now && !isFollowDone) ||
      (followFilter === 'open' && followDate && !isFollowDone) ||
      (followFilter === 'done' && isFollowDone);

    return matchesStatus && matchesNotes && matchesFollow && (!searchValue || haystack.includes(searchValue));
  });

  if (!filteredData.length) {
    el.innerHTML = '<p class="empty">Filtreye uygun lead bulunamadı.</p>';
    return;
  }

  el.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Telefon</th>
          <th>Bütçe</th>
          <th>Skor</th>
          <th>Öncelik</th>
          <th>Partner Durumu</th>
          <th>Retry</th>
          <th>Son Hata</th>
          <th>Tahmini Gelir</th>
          <th>Gerçek Gelir</th>
          <th>Durum</th>
          <th>Takip</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${filteredData.map(lead => `
          <tr
            class="${lead.follow_up_at && !lead.follow_up_done && new Date(lead.follow_up_at) < new Date() ? 'lead-overdue' : ''}"
            data-action="view-auto-lead"
            data-lead='${safeAttr(JSON.stringify(lead))}'>
            <td>${lead.phone || '—'}</td>
            <td>${lead.budget ? Number(lead.budget).toLocaleString('tr-TR') + ' ₺' : '—'}</td>
            <td><strong>${lead.lead_score || 0}</strong></td>
            <td><span class="badge ${
              lead.priority === 'very_hot' ? 'badge-red' :
              lead.priority === 'hot' ? 'badge-yellow' :
              lead.priority === 'warm' ? 'badge-blue' :
              'badge-green'
            }">${lead.priority || 'cold'}</span></td>
            <td>${renderPartnerStatusSelect(lead)}</td>
<td>${lead.dispatch_retry_count || 0}</td>
<td title="${safeAttr(lead.last_dispatch_error || '')}">${escapeHtml(formatDispatchError(lead.last_dispatch_error))}</td>
<td>
  <input class="form-input" data-action="update-estimated-revenue" data-id="${lead.id}" value="${lead.estimated_revenue || ''}" placeholder="₺">
</td>
<td>
  <input class="form-input" data-action="update-actual-revenue" data-id="${lead.id}" value="${lead.actual_revenue || ''}" placeholder="₺">
</td>

            <td>
              <select class="status-select status-${lead.status || 'new'}" data-action="update-auto-status" data-id="${lead.id}">
                <option value="new" ${lead.status === 'new' ? 'selected' : ''}>Yeni</option>
                <option value="first_contact" ${lead.status === 'first_contact' || lead.status === 'called' ? 'selected' : ''}>İlk temas</option>
                <option value="unreachable" ${lead.status === 'unreachable' ? 'selected' : ''}>Ulaşılamadı</option>
                <option value="callback" ${lead.status === 'callback' ? 'selected' : ''}>Tekrar ara</option>
                <option value="proposal_sent" ${lead.status === 'proposal_sent' || lead.status === 'interested' ? 'selected' : ''}>Teklif gönderildi</option>
                <option value="financing" ${lead.status === 'financing' ? 'selected' : ''}>Finansman süreci</option>
                <option value="insurance" ${lead.status === 'insurance' ? 'selected' : ''}>Sigorta süreci</option>
                <option value="won" ${lead.status === 'won' || lead.status === 'closed' ? 'selected' : ''}>Kazanıldı</option>
                <option value="lost" ${lead.status === 'lost' || lead.status === 'rejected' ? 'selected' : ''}>Kaybedildi</option>
                <option value="spam" ${lead.status === 'spam' ? 'selected' : ''}>Test/Spam</option>
              </select>
            </td>
            <td>
              ${(() => {
                const followLabel = formatFollowUpLabel(lead);
                const badgeClass = getFollowUpBadgeClass(followLabel);
                return badgeClass
                  ? `<span class="badge ${badgeClass}">${followLabel}</span>`
                  : followLabel;
              })()}
            </td>
            <td>
              <div class="table-actions">
                ${lead.phone ? `<a class="btn btn-success btn-sm" href="https://wa.me/${normalizePhoneForWhatsapp(lead.phone)}?text=Merhaba%2C%20isteBul%20Auto%20talebinizi%20gördük.%20Size%20uygun%20teklifleri%20hazırlayabiliriz." target="_blank" rel="noopener">WhatsApp</a>` : ''}
                ${['dispatch_failed', 'dispatch_dead'].includes(lead.partner_status) ? `<button class="btn btn-warning btn-sm" data-action="retry-dispatch" data-id="${lead.id}">Tekrar</button>` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}


function getPartnerStatusOptions(route) {
  const workflows = {
    insurance_partner: [
      ['pending', 'Bekliyor'],
      ['dispatched', 'Partnere Gönderildi'],
      ['dispatch_failed', 'Gönderim Hatası'],
      ['dispatch_dead', 'Gönderim Durduruldu'],
      ['contacted', 'İletişime Geçildi'],
      ['quote_sent', 'Teklif Gönderildi'],
      ['policy_issued', 'Poliçe Kesildi'],
      ['paid', 'Paid'],
      ['closed', 'Closed']
    ],
    dealer_partner: [
      ['pending', 'Bekliyor'],
      ['dispatched', 'Partnere Gönderildi'],
      ['dispatch_failed', 'Gönderim Hatası'],
      ['dispatch_dead', 'Gönderim Durduruldu'],
      ['contacted', 'İletişime Geçildi'],
      ['offer_sent', 'Teklif Gönderildi'],
      ['test_drive', 'Test Sürüşü'],
      ['negotiation', 'Negotiation'],
      ['won', 'Kazanıldı'],
      ['delivered', 'Teslim Edildi'],
      ['lost', 'Kaybedildi']
    ],
    finance_partner: [
      ['pending', 'Bekliyor'],
      ['docs_requested', 'Docs Requested'],
      ['preapproved', 'Preapproved'],
      ['approved', 'Approved'],
      ['funded', 'Funded'],
      ['closed', 'Closed']
    ],
    premium_report: [
      ['pending', 'Bekliyor'],
      ['purchased', 'Purchased'],
      ['delivered', 'Teslim Edildi']
    ],
    general_sales: [
      ['pending', 'Bekliyor'],
      ['dispatched', 'Partnere Gönderildi'],
      ['dispatch_failed', 'Gönderim Hatası'],
      ['dispatch_dead', 'Gönderim Durduruldu'],
      ['contacted', 'İletişime Geçildi'],
      ['quoted', 'Teklif Verildi'],
      ['won', 'Kazanıldı'],
      ['lost', 'Kaybedildi']
    ]
  };

  return workflows[route] || workflows.general_sales;
}

function isRevenueRealizedPartnerStatus(route, status) {
  const realizedByRoute = {
    insurance_partner: ['paid', 'closed'],
    dealer_partner: ['won', 'delivered'],
    finance_partner: ['funded', 'closed'],
    premium_report: ['purchased', 'delivered'],
    general_sales: ['won', 'closed']
  };

  return (realizedByRoute[route] || realizedByRoute.general_sales).includes(status);
}

function renderPartnerStatusSelect(lead) {
  const options = getPartnerStatusOptions(lead.partner_route)
    .map(([value, label]) =>
      `<option value="${value}" ${lead.partner_status === value ? 'selected' : ''}>${label}</option>`
    )
    .join('');

  return `
<select
  class="status-select"
  data-action="update-partner-status"
  data-id="${lead.id}"
>
  ${options}
</select>`;
}

function openLeadDrawer(lead) {
  const drawer = document.getElementById('lead-drawer');
  const overlay = document.getElementById('lead-drawer-overlay');
  const content = document.getElementById('lead-drawer-content');

  if (!drawer || !overlay || !content) return;

  const fmt = (v) => escapeHtml(v || '—');
  const label = (map, value) => map[value] || value || '—';

  const usageLabels = { family: 'Aile', city: 'Şehir', long: 'Uzun yol' };
  const bodyLabels = { suv: 'SUV', sedan: 'Sedan', hatchback: 'Hatchback' };
  const fuelLabels = { any: 'Fark etmez', gasoline: 'Benzin', diesel: 'Dizel', hybrid: 'Hibrit', electric: 'Elektrikli' };
  const loanLabels = { yes: 'Evet', no: 'Hayır' };
  const statusLabels = {
    new: 'Yeni',
    called: 'İlk temas',
    interested: 'Teklif gönderildi',
    closed: 'Kazanıldı',
    rejected: 'Kaybedildi',
    first_contact: 'İlk temas',
    unreachable: 'Ulaşılamadı',
    callback: 'Tekrar ara',
    proposal_sent: 'Teklif gönderildi',
    financing: 'Finansman süreci',
    insurance: 'Sigorta süreci',
    won: 'Kazanıldı',
    lost: 'Kaybedildi',
    spam: 'Test/Spam'
  };

  const whatsappUrl = lead.phone ? `https://wa.me/${normalizePhoneForWhatsapp(lead.phone)}` : '';
  const notesHistory = Array.isArray(lead.notes_history) ? lead.notes_history : [];

  content.innerHTML = `
    <div class="table-actions" style="margin-bottom:14px;flex-wrap:wrap;gap:10px;">
      ${lead.phone ? `<button class="btn btn-success btn-sm" data-action="track-whatsapp-click" data-email="${lead.email || ''}" data-phone="${lead.phone || ''}" data-whatsapp-url="${whatsappUrl}">WhatsApp</button>` : ''}
      ${lead.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${lead.phone}">Ara</a>` : ''}
      ${['dispatch_failed','dispatch_dead'].includes(lead.partner_status) ? `<button class="btn btn-warning btn-sm" data-action="retry-dispatch" data-id="${lead.id}">Partner Tekrar Gönder</button>` : ''}
      <button class="btn btn-success btn-sm" data-action="simulate-partner-won" data-id="${lead.id}" data-phone="${lead.phone || ''}">Partner Won Test</button>
      <button class="btn btn-danger btn-sm" data-action="simulate-partner-lost" data-id="${lead.id}" data-phone="${lead.phone || ''}">Partner Lost Test</button>
      <button class="btn btn-ghost btn-sm" data-action="complete-follow-up" data-id="${lead.id}">Takibi Tamamla</button>

      <input
        type="datetime-local"
        class="form-input"
        id="follow-up-date"
        value="${lead.follow_up_at ? new Date(lead.follow_up_at).toISOString().slice(0,16) : ''}"
        style="max-width:220px;"
      >
      <button class="btn btn-ghost btn-sm" data-action="save-follow-up" data-id="${lead.id}">Takip Kaydet</button>
    </div>
    <div class="lead-detail-grid">
      <div class="lead-detail-item"><div class="lead-detail-label">Email</div><div class="lead-detail-value">${fmt(lead.email)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Telefon</div><div class="lead-detail-value">${fmt(lead.phone)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Ad</div><div class="lead-detail-value">${fmt(lead.contact_name)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Aranma zamanı</div><div class="lead-detail-value">${fmt(lead.preferred_contact_time)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Bütçe</div><div class="lead-detail-value">${lead.budget ? Number(lead.budget).toLocaleString('tr-TR') + ' ₺' : '—'}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Kullanım</div><div class="lead-detail-value">${label(usageLabels, lead.usage)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Kasa</div><div class="lead-detail-value">${label(bodyLabels, lead.body)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Yakıt</div><div class="lead-detail-value">${label(fuelLabels, lead.fuel)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Kredi</div><div class="lead-detail-value">${label(loanLabels, lead.loan)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">İlgi</div><div class="lead-detail-value">${fmt(lead.interest_type)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Araç</div><div class="lead-detail-value">${fmt(lead.vehicle)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Lead Skoru</div><div class="lead-detail-value">${fmt(lead.lead_score)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Öncelik</div><div class="lead-detail-value">${fmt(lead.priority)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Partner</div><div class="lead-detail-value">${fmt(lead.partner_route)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Partner Durumu</div><div class="lead-detail-value">${fmt(lead.partner_status)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Durum</div><div class="lead-detail-value">${label(statusLabels, lead.status)}</div></div>
      <div class="lead-detail-item">
        <div class="lead-detail-label">Yeni Not</div>
        <textarea id="new-lead-note" class="form-input" rows="3" placeholder="Yeni not ekle..."></textarea>
        <div style="height:8px"></div>
        <button class="btn btn-ghost btn-sm" data-action="add-lead-note" data-id="${lead.id}" data-history='${safeAttr(JSON.stringify(notesHistory))}'>Not Ekle</button>
      </div>
      <div class="lead-detail-item">
        <div class="lead-detail-label">Not Geçmişi</div>
        <div class="lead-detail-value">
          ${notesHistory.length ? notesHistory.slice().reverse().map((item) => `
            <div style="padding:8px 0;border-bottom:1px solid #2a3441;">
              <div style="font-size:12px;color:#94a3b8;">${item.at ? new Date(item.at).toLocaleString('tr-TR') : '—'}</div>
              <div>${escapeHtml(item.text || '—')}</div>
            </div>
          `).join('') : 'Henüz not geçmişi yok.'}
        </div>
      </div>
      <div class="lead-detail-item"><div class="lead-detail-label">Son Not</div><div class="lead-detail-value">${escapeHtml(fmt(lead.notes))}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Tarih</div><div class="lead-detail-value">${lead.created_at ? new Date(lead.created_at).toLocaleString('tr-TR') : '—'}</div></div>
    </div>
  `;

  drawer.classList.add('open');
  overlay.classList.add('open');
}

function closeLeadDrawer() {
  document.getElementById('lead-drawer')?.classList.remove('open');
  document.getElementById('lead-drawer-overlay')?.classList.remove('open');
}




async function addLeadNote(id, history) {
  const input = document.getElementById('new-lead-note');
  const text = input?.value?.trim();

  if (!text) {
    toast('Not yazın');
    return;
  }

  const notesHistory = Array.isArray(history) ? history : [];
  const nextHistory = [
    ...notesHistory,
    {
      at: new Date().toISOString(),
      text
    }
  ];

  await adminAction({
    action: 'update',
    table: 'auto_leads',
    id,
    values: {
      notes: text,
      notes_history: nextHistory
    }
  });

  toast('Not geçmişe eklendi');
  closeLeadDrawer();
  loadAutoLeads();
}


async function completeFollowUp(id) {
  await adminAction({
    action: 'update',
    table: 'auto_leads',
    id,
    values: {
      follow_up_done: true
    }
  });

  toast('Takip tamamlandı');
  closeLeadDrawer();
  loadAutoLeads();
}

async function saveFollowUp(id) {
  const input = document.getElementById('follow-up-date');
  if (!input?.value) {
    toast('Takip tarihi seçin');
    return;
  }

  await adminAction({
    action: 'update',
    table: 'auto_leads',
    id,
    values: {
      follow_up_at: new Date(input.value).toISOString(),
      follow_up_done: false
    }
  });

  toast('Takip tarihi kaydedildi');
  loadAutoLeads();
}


async function updateAutoLeadStatus(id, status) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const twoDaysLater = new Date();
  twoDaysLater.setDate(twoDaysLater.getDate() + 2);

  const values = { status };

  if (status === 'first_contact' || status === 'called' || status === 'unreachable' || status === 'callback') {
    values.follow_up_at = tomorrow.toISOString();
    values.follow_up_done = false;
  }

  if (status === 'proposal_sent' || status === 'interested' || status === 'financing' || status === 'insurance') {
    values.follow_up_at = twoDaysLater.toISOString();
    values.follow_up_done = false;
  }

  if (status === 'won' || status === 'lost' || status === 'spam' || status === 'closed' || status === 'rejected') {
    values.follow_up_done = true;
  }

  if (status === 'new') {
    values.follow_up_at = null;
    values.follow_up_done = false;
  }

  await adminAction({
    action: 'update',
    table: 'auto_leads',
    id,
    values
  });

  toast('Lead durumu güncellendi');
  loadAutoLeads();
  loadAutoAnalytics();
  loadPartnerEndpoints();
}

async function updateAutoLeadNotes(id, notes) {
  await adminAction({
    action: 'update',
    table: 'auto_leads',
    id,
    values: { notes }
  });

  toast('Not kaydedildi');
  loadAutoLeads();
}


async function exportAutoLeadsCsv() {
  const { data, error } = await sb
    .from('auto_leads')
    .select('*')
    .order('lead_score', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    toast(`CSV hata: ${error.message}`);
    return;
  }

  const rows = data || [];
  if (!rows.length) {
    toast('Dışa aktarılacak lead yok');
    return;
  }

  const headers = [
    'email',
    'phone',
    'budget',
    'usage',
    'body',
    'fuel',
    'loan',
    'interest_type',
    'vehicle',
    'lead_score',
    'priority',
    'partner_route',
    'partner_status',
    'status',
    'notes',
    'created_at'
  ];

  const escapeCsv = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => escapeCsv(row[key])).join(','))
  ].join('\n');

  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);

  a.href = url;
  a.download = `auto-leads-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  toast('CSV indirildi');
}



async function setUserRole(id, role) {
  await adminAction({ action: 'update', table: 'profiles', id, values: { role } });
  const labels = { admin: 'Admin yapıldı', user: 'Yetki kaldırıldı' };
  toast(labels[role] || 'Rol güncellendi');
  loadUsers();
}

async function banUser(id) {
  if (!confirm('Bu kullanıcıyı engellemek istediğinize emin misiniz?')) return;
  await adminAction({ action: 'update', table: 'profiles', id, values: { is_banned: true } });
  toast('Kullanıcı engellendi');
  loadUsers();
}

sb.auth.getSession().then(({ data }) => {
  if (data.session) { currentUser = data.session.user; showApp(); }
});
function bindAdminPanelEvents() {
  document.getElementById('login-btn')?.addEventListener('click', login);
  document.getElementById('login-password')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') login();
  });
  document.getElementById('logout-btn')?.addEventListener('click', logout);

  document.querySelectorAll('[data-page-target]').forEach((el) => {
    el.addEventListener('click', () => showPage(el.dataset.pageTarget, el));
  });

  document.querySelectorAll('[data-action="save-settings"]').forEach((el) => {
    el.addEventListener('click', saveSettings);
  });

  document.querySelector('[data-action="save-announcement"]')?.addEventListener('click', saveAnnouncement);
  document.querySelector('[data-action="save-faq"]')?.addEventListener('click', saveFaq);
  document.querySelector('[data-action="save-post"]')?.addEventListener('click', savePost);

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (!el) return;

    const { action, id, active, role } = el.dataset;
    const isActive = active === 'true';

    if (action === 'update-auto-status') {
      updateAutoLeadStatus(id, el.value);
      return;
    }

    if (action === 'update-partner-status') {
      let values = {
        partner_status: el.value
      };

      try {
        const row = el.closest('tr');
        const lead = row?.dataset?.lead ? JSON.parse(row.dataset.lead) : null;

        if (lead && isRevenueRealizedPartnerStatus(lead.partner_route, el.value)) {
          const estimatedInput = row?.querySelector('[data-action="update-estimated-revenue"]');
          const estimatedRevenue = Number(estimatedInput?.value || lead.estimated_revenue || 0);

          values = {
            ...values,
            actual_revenue: estimatedRevenue
          };
        }
      } catch {}

      adminAction({
        action: 'update',
        table: 'auto_leads',
        id,
        values
      }).then(() => {
        toast('Partner durumu güncellendi', 'success');
        loadAutoLeads();
        loadAutoAnalytics();
      });

      return;
    }

    

    if (action === 'simulate-partner-won' || action === 'simulate-partner-lost') {
      const ANON = window.__env?.SUPABASE_ANON_KEY;
      const status = action === 'simulate-partner-won' ? 'won' : 'lost';
      const revenue = action === 'simulate-partner-won' ? 5000 : 0;

      const secret = prompt('Partner callback secret girin');
      if (!secret || !ANON) {
        toast('Secret veya env eksik', 'error');
        return;
      }

      fetch('https://hjfrcdstbyonmgatgwcc.supabase.co/functions/v1/partner-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON,
          Authorization: `Bearer ${ANON}`,
          'x-partner-callback-secret': secret
        },
        body: JSON.stringify({
          lead_id: id,
          partner_status: status,
          actual_revenue: revenue,
          notes: 'admin callback simulation'
        })
      })
      .then(r => r.json())
      .then((res) => {
        if (res?.ok) {
          toast('Partner callback test başarılı', 'success');
          loadAutoLeads();
          loadAutoAnalytics();
        } else {
          toast(res?.error || 'Callback başarısız', 'error');
        }
      })
      .catch(() => toast('Callback hatası', 'error'));

      return;
    }

    if (action === 'retry-dispatch') {
      adminAction({
        action: 'update',
        table: 'auto_leads',
        id,
        values: {
          partner_status: 'dispatch_failed',
          dispatch_retry_count: 0,
          next_retry_at: new Date().toISOString(),
          last_dispatch_error: null
        }
      }).then(() => {
        toast('Dispatch retry kuyruğa alındı', 'success');
        loadAutoLeads();
        loadAutoAnalytics();
      });

      return;
    }

    if (action === 'update-estimated-revenue') {
      adminAction({
        action: 'update',
        table: 'auto_leads',
        id,
        values: {
          estimated_revenue: Number(el.value || 0)
        }
      });
      return;
    }

    if (action === 'update-actual-revenue') {
      adminAction({
        action: 'update',
        table: 'auto_leads',
        id,
        values: {
          actual_revenue: Number(el.value || 0)
        }
      });
      return;
    }

    if (action === 'toggle-ann') toggleAnn(id, isActive);
    if (action === 'delete-ann') deleteAnn(id);
    if (action === 'toggle-faq') toggleFaq(id, isActive);
    if (action === 'delete-faq') deleteFaq(id);
    if (action === 'toggle-post') togglePost(id, isActive);
    if (action === 'delete-post') deletePost(id);
    if (action === 'feature-listing') featureListing(id, isActive);
    if (action === 'delete-listing') deleteListing(id);
    if (action === 'set-user-role') setUserRole(id, role);
    if (action === 'ban-user') banUser(id);
    if (action === 'export-auto-leads') exportAutoLeadsCsv();
    if (action === 'close-lead-drawer') closeLeadDrawer();
    if (action === 'complete-follow-up') completeFollowUp(id);
    if (action === 'save-follow-up') saveFollowUp(id);
    if (action === 'add-lead-note') addLeadNote(id, safeJsonParse(el.dataset.history, []));
    if (action === 'view-auto-lead') openLeadDrawer(safeJsonParse(el.dataset.lead));
    if (action === 'track-whatsapp-click') {
      event.preventDefault();
      trackAdminAutoEvent('auto_whatsapp_click', {
        email: el.dataset.email,
        phone: el.dataset.phone
      }).finally(() => {
        const safeUrl = safeExternalUrl(el.dataset.whatsappUrl);
        if (!safeUrl) {
          toast('Geçersiz WhatsApp bağlantısı', 'error');
          return;
        }
        window.open(safeUrl, '_blank', 'noopener');
      });
      return;
    }
  });
}


  document.getElementById('lead-drawer-overlay')?.addEventListener('click', closeLeadDrawer);

document.addEventListener('change', (event) => {
    const el = event.target.closest('[data-action="update-auto-notes"]');
    if (!el) return;

    updateAutoLeadNotes(el.dataset.id, el.value);
  });


  ['auto-leads-search', 'auto-leads-status-filter', 'auto-leads-notes-only'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', loadAutoLeads);
    document.getElementById(id)?.addEventListener('change', loadAutoLeads);
  });

bindAdminPanelEvents();


const overdueStyle = document.createElement('style');
overdueStyle.textContent = `
.lead-overdue {
  background: rgba(220, 38, 38, 0.08);
}
`;
document.head.appendChild(overdueStyle);
