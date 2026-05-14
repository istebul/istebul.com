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
}

function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (el) el.classList.add('active');
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
    console.error(error);
    toast('Hata: ' + error.message, 'error');
    throw error;
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
              'site-name','site-subtitle','hero-eyebrow','hero-title','hero-desc','title','description'];

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
  const rows = KEYS.map(f => ({ key: f, value: document.getElementById('s-' + f)?.value || '', updated_at: new Date().toISOString() }));
  rows.push({ key: 'maintenance', value: document.getElementById('s-maintenance').checked ? 'true' : 'false', updated_at: new Date().toISOString() });
  const { error } = await sb.from('site_settings').upsert(rows, { onConflict: 'key' });
  if (error) { toast('Hata: ' + error.message, 'error'); return; }
  toast('Kaydedildi!');
}

async function loadAnnouncements() {
  const { data } = await sb.from('announcements').select('*').order('created_at', { ascending: false });
  const el = document.getElementById('announcements-list');
  if (!data?.length) { el.innerHTML = '<p class="empty">Henüz duyuru yok.</p>'; return; }
  el.innerHTML = '<table class="table"><thead><tr><th>Başlık</th><th>İçerik</th><th>Durum</th><th>Tarih</th><th></th></tr></thead><tbody>' +
    data.map(a => `<tr><td><strong>${a.title||'—'}</strong></td><td class="cell-truncate">${a.content||'—'}</td><td><span class="badge ${a.is_active?'badge-green':'badge-red'}">${a.is_active?'Aktif':'Pasif'}</span></td><td class="text-muted cell-nowrap">${new Date(a.created_at).toLocaleDateString('tr-TR')}</td><td><div class="table-actions"><button class="btn btn-ghost btn-sm" data-action="toggle-ann" data-id="${a.id}" data-active="${a.is_active}">${a.is_active?'Durdur':'Yayınla'}</button><button class="btn btn-danger btn-sm" data-action="delete-ann" data-id="${a.id}">Sil</button></div></td></tr>`).join('') + '</tbody></table>';
}

async function saveAnnouncement() {
  const title = document.getElementById('a-title').value.trim();
  const content = document.getElementById('a-content').value.trim();
  const is_active = document.getElementById('a-active').checked;
  if (!title) { toast('Başlık zorunlu', 'error'); return; }
  const { error } = await sb.from('announcements').insert({ title, content, is_active });
  if (error) { toast('Hata: ' + error.message, 'error'); return; }
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
    data.map(f => `<tr><td class="text-muted">${f.order_num||0}</td><td>${f.question||'—'}</td><td><span class="badge ${f.is_active?'badge-green':'badge-red'}">${f.is_active?'Aktif':'Pasif'}</span></td><td><div class="table-actions"><button class="btn btn-ghost btn-sm" data-action="toggle-faq" data-id="${f.id}" data-active="${f.is_active}">${f.is_active?'Gizle':'Göster'}</button><button class="btn btn-danger btn-sm" data-action="delete-faq" data-id="${f.id}">Sil</button></div></td></tr>`).join('') + '</tbody></table>';
}

async function saveFaq() {
  const question = document.getElementById('faq-question').value.trim();
  const answer = document.getElementById('faq-answer').value.trim();
  const order_num = parseInt(document.getElementById('faq-order').value) || 0;
  const is_active = document.getElementById('faq-active').checked;
  if (!question) { toast('Soru zorunlu', 'error'); return; }
  const { error } = await sb.from('faqs').insert({ question, answer, order_num, is_active });
  if (error) { toast('Hata: ' + error.message, 'error'); return; }
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
    data.map(p => `<tr><td><strong>${p.title||'—'}</strong></td><td class="text-muted text-xs">/${p.slug||'—'}</td><td><span class="badge ${p.is_published?'badge-green':'badge-yellow'}">${p.is_published?'Yayında':'Taslak'}</span></td><td class="text-muted cell-nowrap">${new Date(p.created_at).toLocaleDateString('tr-TR')}</td><td><div class="table-actions"><button class="btn btn-ghost btn-sm" data-action="toggle-post" data-id="${p.id}" data-active="${p.is_published}">${p.is_published?'Taslağa al':'Yayınla'}</button><button class="btn btn-danger btn-sm" data-action="delete-post" data-id="${p.id}">Sil</button></div></td></tr>`).join('') + '</tbody></table>';
}

async function savePost() {
  const title = document.getElementById('post-title').value.trim();
  const slug = document.getElementById('post-slug').value.trim() || title.toLowerCase().replace(/\s+/g,'-');
  const content = document.getElementById('post-content').value.trim();
  const is_published = document.getElementById('post-published').checked;
  if (!title) { toast('Başlık zorunlu', 'error'); return; }
  const { error } = await sb.from('posts').insert({ title, slug, content, is_published });
  if (error) { toast('Hata: ' + error.message, 'error'); return; }
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
    data.map(l => `<tr><td><strong>${l.title||l.name||'—'}</strong></td><td><span class="badge badge-blue">${l.category||l.type||'—'}</span></td><td class="cell-nowrap">${l.price?Number(l.price).toLocaleString('tr-TR')+' ₺':'—'}</td><td><span class="badge ${!l.status||l.status==='active'?'badge-green':'badge-red'}">${l.status||'aktif'}</span></td><td class="text-muted cell-nowrap">${l.created_at?new Date(l.created_at).toLocaleDateString('tr-TR'):'—'}</td><td><div class="table-actions"><button class="btn btn-warning btn-sm" data-action="feature-listing" data-id="${l.id}" data-active="${!!l.is_featured}">${l.is_featured?'Öne çıkarmayı kaldır':'Öne çıkar'}</button><button class="btn btn-danger btn-sm" data-action="delete-listing" data-id="${l.id}">Sil</button></div></td></tr>`).join('') + '</tbody></table>';
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
    data.map(u => `<tr><td><strong>${u.full_name||u.name||'—'}</strong></td><td class="text-muted">${u.email||'—'}</td><td><span class="badge ${u.role==='admin'?'badge-blue':u.role==='moderator'?'badge-yellow':'badge-green'}">${u.role||'kullanıcı'}</span></td><td class="text-muted cell-nowrap">${u.created_at?new Date(u.created_at).toLocaleDateString('tr-TR'):'—'}</td><td><div class="table-actions"><button class="btn btn-ghost btn-sm" data-action="set-user-role" data-id="${u.id}" data-role="admin">Admin yap</button><button class="btn btn-warning btn-sm" data-action="set-user-role" data-id="${u.id}" data-role="moderator">Moderator yap</button><button class="btn btn-ghost btn-sm" data-action="set-user-role" data-id="${u.id}" data-role="user">Yetki kaldır</button><button class="btn btn-danger btn-sm" data-action="ban-user" data-id="${u.id}">Engelle</button></div></td></tr>`).join('') + '</tbody></table>';
}


function normalizePhoneForWhatsapp(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('90')) return digits;
  if (digits.startsWith('0')) return `90${digits.slice(1)}`;
  return `90${digits}`;
}


async function trackAdminAutoEvent(eventName, metadata = {}) {
  await sb.from('auto_events').insert({
    event_name: eventName,
    email: metadata.email || null,
    phone: metadata.phone || null,
    metadata
  });
}

async function loadAutoAnalytics() {
  const [autoEventsRes, autoLeadsRes] = await Promise.all([
    sb.from('auto_events').select('*').order('created_at', { ascending: false }).limit(500),
    sb.from('auto_leads').select('status')
  ]);

  const { data, error } = autoEventsRes;
  const { data: leads, error: leadsError } = autoLeadsRes;
  const el = document.getElementById('auto-analytics-list');

  if (!el) return;

  if (error || leadsError) {
    el.innerHTML = `<p class="empty">Hata: ${(error || leadsError).message}</p>`;
    return;
  }

  const events = data || [];
  const leadRows = leads || [];

  const counts = events.reduce((acc, event) => {
    acc[event.event_name] = (acc[event.event_name] || 0) + 1;
    return acc;
  }, {});

  const labels = {
    auto_page_view: 'Sayfa görüntüleme',
    auto_quiz_submit: 'Quiz gönderimi',
    auto_email_submit: 'Email/telefon submit',
    auto_results_view: 'Sonuç görüntüleme',
    auto_finance_click: 'Finansman tıklama',
    auto_whatsapp_click: 'WhatsApp tıklama'
  };

  const pageViews = counts.auto_page_view || 0;
  const pct = (value, base) => base ? Math.round((value / base) * 100) + '%' : '—';

  const analyticsCards = [
    ['auto_page_view', labels.auto_page_view, counts.auto_page_view || 0, 'trafik'],
    ['auto_quiz_submit', labels.auto_quiz_submit, counts.auto_quiz_submit || 0, pct(counts.auto_quiz_submit || 0, pageViews)],
    ['auto_email_submit', labels.auto_email_submit, counts.auto_email_submit || 0, pct(counts.auto_email_submit || 0, counts.auto_quiz_submit || 0)],
    ['auto_results_view', labels.auto_results_view, counts.auto_results_view || 0, pct(counts.auto_results_view || 0, counts.auto_email_submit || 0)],
    ['auto_finance_click', labels.auto_finance_click, counts.auto_finance_click || 0, pct(counts.auto_finance_click || 0, counts.auto_results_view || 0)],
    ['auto_whatsapp_click', labels.auto_whatsapp_click, counts.auto_whatsapp_click || 0, pct(counts.auto_whatsapp_click || 0, counts.auto_finance_click || 0)]
  ];

  const leadCounts = leadRows.reduce((acc, lead) => {
    const status = lead.status || 'new';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const totalLeads = leadRows.length;
  const crmPct = (value) => totalLeads ? Math.round((value / totalLeads) * 100) + '%' : '—';

  const crmCards = [
    ['Toplam Lead', totalLeads, '100%'],
    ['Yeni', leadCounts.new || 0, crmPct(leadCounts.new || 0)],
    ['Arandı', leadCounts.called || 0, crmPct(leadCounts.called || 0)],
    ['İlgileniyor', leadCounts.interested || 0, crmPct(leadCounts.interested || 0)],
    ['Kapandı', leadCounts.closed || 0, crmPct(leadCounts.closed || 0)],
    ['Uygun değil', leadCounts.rejected || 0, crmPct(leadCounts.rejected || 0)]
  ];

  el.innerHTML = `
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
              <td>${event.email || '—'}</td>
              <td>${event.phone || '—'}</td>
              <td>${event.created_at ? new Date(event.created_at).toLocaleString('tr-TR') : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="empty">Henüz analytics event yok.</p>'}
  `;
}



async function loadAutoLeads() {
  const { data, error } = await sb
    .from('auto_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const el = document.getElementById('auto-leads-list');

  if (!el) return;

  if (error) {
    el.innerHTML = `<p class="empty">Hata: ${error.message}</p>`;
    return;
  }

  if (!data?.length) {
    el.innerHTML = '<p class="empty">Henüz lead yok.</p>';
    return;
  }

  const searchValue = (document.getElementById('auto-leads-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('auto-leads-status-filter')?.value || '';
  const notesOnly = document.getElementById('auto-leads-notes-only')?.checked || false;

  const filteredData = data.filter((lead) => {
    const matchesStatus = !statusFilter || lead.status === statusFilter;
    const hasNotes = !!(lead.notes || '').trim();
    const matchesNotes = !notesOnly || hasNotes;
    const haystack = [
      lead.email,
      lead.phone,
      lead.notes,
      lead.interest_type,
      lead.usage,
      lead.body,
      lead.fuel
    ].filter(Boolean).join(' ').toLowerCase();

    return matchesStatus && matchesNotes && (!searchValue || haystack.includes(searchValue));
  });

  if (!filteredData.length) {
    el.innerHTML = '<p class="empty">Filtreye uygun lead bulunamadı.</p>';
    return;
  }

  el.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Telefon</th>
          <th>Bütçe</th>
          <th>Durum</th>
          <th>Not</th>
          <th>Tarih</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${filteredData.map(lead => `
          <tr data-action="view-auto-lead" data-lead='${JSON.stringify(lead).replace(/'/g, "&apos;")}'>
            <td><strong>${lead.email || '—'}</strong></td>
            <td>${lead.phone || '—'}</td>
            <td>${lead.budget ? Number(lead.budget).toLocaleString('tr-TR') + ' ₺' : '—'}</td>

            <td>
              <select class="status-select status-${lead.status || 'new'}" data-action="update-auto-status" data-id="${lead.id}">
                <option value="new" ${lead.status === 'new' ? 'selected' : ''}>Yeni</option>
                <option value="called" ${lead.status === 'called' ? 'selected' : ''}>Arandı</option>
                <option value="interested" ${lead.status === 'interested' ? 'selected' : ''}>İlgileniyor</option>
                <option value="closed" ${lead.status === 'closed' ? 'selected' : ''}>Kapandı</option>
                <option value="rejected" ${lead.status === 'rejected' ? 'selected' : ''}>Uygun değil</option>
              </select>
            </td>
            <td>
              <input
                type="text"
                class="form-input"
                placeholder="Not ekle..."
                value="${lead.notes || ''}"
                data-action="update-auto-notes"
                data-id="${lead.id}"
              />
            </td>
            <td>${lead.created_at ? new Date(lead.created_at).toLocaleString('tr-TR') : '—'}</td>
            <td>
              <div class="table-actions">
                <button class="btn btn-danger btn-sm" data-action="delete-auto-lead" data-id="${lead.id}">
                  Sil
                </button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}


function openLeadDrawer(lead) {
  const drawer = document.getElementById('lead-drawer');
  const overlay = document.getElementById('lead-drawer-overlay');
  const content = document.getElementById('lead-drawer-content');

  if (!drawer || !overlay || !content) return;

  const fmt = (v) => v || '—';
  const label = (map, value) => map[value] || value || '—';

  const usageLabels = { family: 'Aile', city: 'Şehir', long: 'Uzun yol' };
  const bodyLabels = { suv: 'SUV', sedan: 'Sedan', hatchback: 'Hatchback' };
  const fuelLabels = { any: 'Fark etmez', gasoline: 'Benzin', diesel: 'Dizel', hybrid: 'Hibrit', electric: 'Elektrikli' };
  const loanLabels = { yes: 'Evet', no: 'Hayır' };
  const statusLabels = { new: 'Yeni', called: 'Arandı', interested: 'İlgileniyor', closed: 'Kapandı', rejected: 'Uygun değil' };

  const whatsappUrl = lead.phone ? `https://wa.me/${normalizePhoneForWhatsapp(lead.phone)}` : '';

  content.innerHTML = `
    <div class="table-actions" style="margin-bottom:14px;">
      ${lead.phone ? `<button class="btn btn-ghost btn-sm" data-action="track-whatsapp-click" data-email="${lead.email || ''}" data-phone="${lead.phone || ''}" data-whatsapp-url="${whatsappUrl}">WhatsApp</button>` : ''}
      ${lead.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${lead.phone}">Ara</a>` : ''}
      <button class="btn btn-ghost btn-sm" disabled>Follow-up yakında</button>
    </div>
    <div class="lead-detail-grid">
      <div class="lead-detail-item"><div class="lead-detail-label">Email</div><div class="lead-detail-value">${fmt(lead.email)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Telefon</div><div class="lead-detail-value">${fmt(lead.phone)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Bütçe</div><div class="lead-detail-value">${lead.budget ? Number(lead.budget).toLocaleString('tr-TR') + ' ₺' : '—'}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Kullanım</div><div class="lead-detail-value">${label(usageLabels, lead.usage)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Kasa</div><div class="lead-detail-value">${label(bodyLabels, lead.body)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Yakıt</div><div class="lead-detail-value">${label(fuelLabels, lead.fuel)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Kredi</div><div class="lead-detail-value">${label(loanLabels, lead.loan)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">İlgi</div><div class="lead-detail-value">${fmt(lead.interest_type)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Durum</div><div class="lead-detail-value">${label(statusLabels, lead.status)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Not</div><div class="lead-detail-value">${fmt(lead.notes)}</div></div>
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


async function updateAutoLeadStatus(id, status) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const twoDaysLater = new Date();
  twoDaysLater.setDate(twoDaysLater.getDate() + 2);

  const values = { status };

  if (status === 'called') {
    values.follow_up_at = tomorrow.toISOString();
    values.follow_up_done = false;
  }

  if (status === 'interested') {
    values.follow_up_at = twoDaysLater.toISOString();
    values.follow_up_done = false;
  }

  if (status === 'closed' || status === 'rejected') {
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


async function deleteAutoLead(id) {
  if (!confirm('Bu lead silinsin mi?')) return;

  await adminAction({
    action: 'delete',
    table: 'auto_leads',
    id
  });

  toast('Lead silindi');
  loadAutoLeads();
  loadAutoAnalytics();
}

async function setUserRole(id, role) {
  await adminAction({ action: 'update', table: 'profiles', id, values: { role } });
  const labels = { admin: 'Admin yapıldı', moderator: 'Moderator yapıldı', user: 'Yetki kaldırıldı' };
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
    if (action === 'delete-auto-lead') deleteAutoLead(id);
    if (action === 'export-auto-leads') exportAutoLeadsCsv();
    if (action === 'close-lead-drawer') closeLeadDrawer();
    if (action === 'view-auto-lead') openLeadDrawer(JSON.parse(el.dataset.lead.replace(/&apos;/g, "'")));
    if (action === 'track-whatsapp-click') {
      event.preventDefault();
      trackAdminAutoEvent('auto_whatsapp_click', {
        email: el.dataset.email,
        phone: el.dataset.phone
      }).finally(() => {
        window.open(el.dataset.whatsappUrl, '_blank', 'noopener');
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
