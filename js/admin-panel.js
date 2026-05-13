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
  loadDashboard(); loadSettings(); loadAnnouncements(); loadFaqs(); loadPosts(); loadListings(); loadUsers();
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
  });
}

bindAdminPanelEvents();
