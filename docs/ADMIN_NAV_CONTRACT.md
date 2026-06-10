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
- `tests/unit/admin-page-routing.test.mjs` — routing sözleşmesi + terminoloji
- `tests/unit/admin-decision-nav.test.mjs` — AI listings harici nav + Karar ayrımı

## Kapsam dışı (bu faz)

- `admin-panel.js` monolith parçalama
- Yeni admin sayfası / Edge Function / Supabase migration
- Router core değişikliği
- AI listings ↔ listings tablo birleşimi
- Skor/TCO/risk/ranking motorları
- Public UI değişikliği
