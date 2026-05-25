# Kod tekrarı temizlik raporu (GÖREV 1)

**Tarih:** 2026-05-24 · **Stack:** Vanilla HTML/CSS/JS · Cloudflare Pages

## CSS

| Bulgu | Aksiyon | Risk |
|--------|---------|------|
| `style.css` içinde **iki `:root`** bloğu (satır ~22 ve ~1862) | Token’lar tek `:root`’ta birleştirildi; ikinci blok yorumlandı | LOW |
| `.btn` / `.btn-primary` `style.css` içinde 3 kez tanımlı | İlk tanım güçlendirildi; Professional Refresh tekrarı yorumlandı | LOW |
| `.btn` hem `auto.css` hem `style.css` | Auto sayfası bağımsız runtime CSS kullanıyor — **dokunulmadı** (kırılma riski) | — |
| `.spinner`, `.modal`, `.empty-state` çoklu dosya | Ortak import zinciri (`style.css` @import) ile hizalı; çakışan kurallar cascade ile çözülüyor | LOW |

**Yeni dosyalar:** `css/design-tokens.css`, `css/layout-guard.css`, `css/button-states.css` → `style.css` üzerinden import.

## JavaScript

| Fonksiyon | Dosyalar | Aksiyon |
|-----------|----------|---------|
| `escapeHtml` | admin, partner-*, premium-pages, help-center | Bilinçli yerel kopyalar — **refactor yapılmadı** (kapsam dışı) |
| `getSupabaseConfig` | lifecycle-client, customer-ops-client | `js/runtime/env-config.js` → `requireSupabasePublicEnv()` | LOW |
| `toast` | yalnızca `admin-panel.js` | Admin’e özel kaldı |
| Global toast | — | `js/runtime/ui-toast.js` eklendi (kurumsal sayfalar) |

## HTML `<script>` / `<link>`

| Sayfa | Bulgu | Aksiyon |
|-------|-------|---------|
| `index.html` | Tek `env.js`, tek bundle — OK | — |
| `abonelik-iptal.html` | `/css/main.css` (yok), `/dist/env.js` | → `style.css` + `/env.js` düzeltildi | MED |
| Partner sayfaları | Ortak `style.css` + `enterprise-polish` pattern | Tutarlı |
| `partner-onboarding.html` | Yalnızca redirect script | OK |

## Kullanılmayan kod

- Geniş tarama sonrası **silme yapılmadı**; yalnızca birleştirilen duplicate bloklar yorum ile işaretlendi (`DUPLICATE_REMOVED`).
- Şüpheli legacy selector’lar için ayrı PR önerilir (otomatik kullanım analizi yok).
