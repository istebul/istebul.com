# Admin Navigasyon Sözleşmesi (Faz 4A-1a)

Admin Operasyon Merkezi (`admin-panel.html` + `js/admin-panel.js`) için nav/deep-link drift riskini kapatmak amacıyla tek kaynak sözleşmesi.

## Strateji

- isteBul bir **AI destekli karar verme platformudur**; klasik ilan sitesi değildir.
- Admin merkezi klasik ilan paneli değil, **karar platformu operasyon merkezidir**.
- Lead ve partner modülleri kalıcı strateji parçasıdır.
- Türkçe UI korunur; runtime/Edge/Supabase/migration/scoring motorlarına dokunulmaz.

## Tek kaynak dosyalar

| Dosya | Rol |
|-------|-----|
| `js/admin/admin-page-routing.js` | `ADMIN_PAGE_IDS`, `ADMIN_PATH_ALIASES`, deep-link slug listesi |
| `js/admin/admin-shell.js` | `NAV_LABELS` — header arama etiketleri |
| `admin-panel.html` | Sidebar `data-page-target` + `id="page-*"` DOM |
| `js/admin-panel.js` | `registerAdminPageHandlers({ ... })` sayfa yenileme eşlemesi |
| `js/admin/admin-decision-nav.js` | Harici admin-only link: AI İlan Yönetimi |
| `scripts/lib/admin-deep-links.cjs` | Build-time deep-link shell üretimi (`dist/admin/<slug>/`) |

## "Karar" terminolojisi (çakışma çözümü)

| Kavram | Route / page id | Admin etiket | Açıklama |
|--------|-----------------|--------------|----------|
| Public Karar Merkezi | `/profil/` | — | Kullanıcı paneli; admin page id değildir |
| Karar Seçenekleri | `/admin/listings` → `listings` | Karar Seçenekleri | Klasik CRM: `listings` tablosu CRUD |
| AI İlan Yönetimi | `/admin/ai-listings/` | AI İlan Yönetimi | Harici admin-only link; AI listings motoru workspace ("Karar Merkezi" UI başlığı) |
| Ops AI karar motoru | `/admin/decision-center` → `ops-ai-assistant` | Ops asistan | Operasyon AI asistanı; path alias |

**Önemli:** "Karar Merkezi" başlığı AI listings panelinde (`admin/ai-listings.html`) workspace adıdır. Admin CRM içindeki **Karar Seçenekleri** (`listings`) ile karıştırılmamalıdır.

## Sözleşme kuralları

1. Her `#admin-nav` sidebar `data-page-target` değeri `ADMIN_PAGE_IDS` içinde olmalıdır.
2. Her `ADMIN_PAGE_IDS` girdisi için `admin-panel.html` içinde `id="page-{id}"` DOM ve `registerAdminPageHandlers` anahtarı olmalıdır.
3. `NAV_LABELS` tüm `ADMIN_PAGE_IDS` girdilerini kapsamalıdır (header/search drift önleme).
4. `ADMIN_PATH_ALIASES` yalnızca geriye dönük deep-link uyumu içindir; hedef page id geçerli olmalıdır.
5. AI İlan Yönetimi harici linktir (`nav-item--external`); `ADMIN_PAGE_IDS`'e eklenmez.
6. Public sitemap/homepage/kategori nav'ına admin veya AI listings linki eklenmez.

## CI denetimleri

- `node scripts/admin-panel-pages-audit.cjs` — nav ↔ handler ↔ DOM ↔ `ADMIN_PAGE_IDS` eşleşmesi
- `node scripts/admin-dashboard-landing-audit.cjs` — operasyon landing terminoloji + CTA sözleşmesi (Faz 4A-1b)
- `tests/unit/admin-page-routing.test.mjs` — routing sözleşmesi + terminoloji
- `tests/unit/admin-decision-nav.test.mjs` — AI listings harici nav + Karar ayrımı
- `tests/unit/admin-dashboard-landing.test.mjs` — landing copy/CTA/placeholder disclosure

## Operasyon landing terminolojisi (Faz 4A-1b)

| page id | Nav / header etiket | Rol |
|---------|---------------------|-----|
| `dashboard` | **Operasyon Özeti** | Varsayılan landing; CRM KPI + yönlendirme |
| `ops-command-center` | **Operasyon Komuta Merkezi** | P9 birleşik ops rollup |
| `dashboard-ceo` | **CEO Özeti** | Executive + CEO alerts |
| `dashboard-growth` | **Büyüme Özeti** | Funnel/kanal/deney |
| `dashboard-revenue` | **Gelir Özeti** | MRR/churn/RevOps |
| `dashboard-support` | **Destek Özeti** | Lifecycle/SSS |
| `dashboard-partner-ops` | **Partner Operasyon Özeti** | Dispatch/SLA |
| `unified-funnel` | **Birleşik Funnel** | Dikey funnel karşılaştırma |
| `investor-metrics` | **Yatırımcı KPI** | Deep link korunur |

Landing (`page-dashboard`) kuralları:

1. Üst KPI kartları CRM verisidir; grafik alanları **örnek görsel** olarak etiketlenir.
2. **Operasyon panelleri** bölümü: Komuta Merkezi, Birleşik Funnel, Partner Operasyon Özeti, AI İlan Yönetimi linkleri zorunlu.
3. `stat-system-alerts` canlı observability rollup'a bağlanmaz.
4. Motor/fetch (`loadDashboard`, `loadOpsCommandCenter`, P14 context) değiştirilmez.

## Kapsam dışı (bu faz)

- `admin-panel.js` monolith parçalama
- Yeni admin sayfası / Edge Function / Supabase migration
- Router core değişikliği
- AI listings ↔ listings tablo birleşimi
- Skor/TCO/risk/ranking motorları
- Public UI değişikliği

### Faz 4A-1b-3A — Operasyon/analitik statik başlık hizası

Aşağıdaki statik admin sayfalarında sidebar/topbar etiketi ile sayfa `<h2>` başlığı aynı canonical etiketi taşımalıdır:

| page id | Canonical etiket |
|---------|------------------|
| `ops-ai-assistant` | Ops asistan |
| `observability` | Observability |
| `platform-analytics` | Platform analitik |
| `auto-analytics` | Auto analitik |

CI: `admin-dashboard-landing-audit.cjs` + `admin-dashboard-landing.test.mjs` bu h2 ↔ NAV_LABELS eşleşmesini kilitler.

Kapsam dışı (4A-1b-3A): dinamik dashboard CTA metinleri (`internal-dashboard-views.js`), P18–P26 kurumsal/gelişmiş başlıkları, AI listings workspace, router/Supabase/migration alanları.

### Faz 4A-1b-3B — Internal dashboard operasyon/analitik CTA hizası

P14 internal dashboard dinamik CTA butonları (yalnızca görünen etiket) admin nav/NAV_LABELS ile hizalı kalmalıdır:

| page id | Canonical CTA etiket |
|---------|----------------------|
| `investor-metrics` | Yatırımcı KPI |
| `ops-command-center` | Operasyon Komuta Merkezi |
| `platform-analytics` | Platform analitik |
| `auto-analytics` | Auto analitik |

CI: `scripts/p14-internal-dashboards-audit.cjs` + `tests/unit/internal-dashboards.test.mjs`.

Kapsam dışı (4A-1b-3B): `data-page-target` değerleri, route/handler yapısı, `admin-panel.js`, partner/support CTA metinleri, `<h3>`/kicker/stat kart/muted copy, P18–P26, AI listings workspace.
