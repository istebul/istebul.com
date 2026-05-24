# isteBul — Premium Enterprise Brand System

**Version:** 1.0  
**Goal:** Global technology company perception — trustworthy, precise, infrastructure-grade.  
**Audience:** Product, marketing, design, engineering, partners, investors.

---

## 1. Brand foundation

| Element | Definition |
|---------|------------|
| **Name** | isteBul (camelCase **B** in product UI; legal entity as registered) |
| **Descriptor** | Karar zekâsı platformu |
| **Promise** | Yüksek tutarlı satın alma kararlarını veriye dayalı netleştirmek |
| **Category** | Decision intelligence — not classifieds, not lead-gen spam |
| **Archetype** | Trusted advisor + infrastructure (Stripe/Linear register, Turkish corporate warmth) |

**Positioning statement (internal):**  
isteBul is a decision intelligence platform for high-consideration purchases. We combine transparent methodology, financial modeling, and optional partner fulfillment—without seller bias or pressure tactics.

---

## 2. Visual identity

### 2.1 Logo & mark

| Asset | Usage |
|-------|--------|
| **Wordmark** | `isteBul` — nav, footer, legal |
| **Mark** | `iB` in rounded tile — favicon, app icon, compact nav |
| **Clear space** | Minimum 1× mark height on all sides |
| **Don’t** | Stretch, rotate, add shadows to mark, place on low-contrast busy photos |

### 2.2 Color system

| Token | Hex | Role |
|-------|-----|------|
| Primary 600 | `#2563eb` | Primary actions, links, focus |
| Primary 900 | `#1e3a8a` | Deep trust, announcement bar accents |
| Accent 600 | `#0d9488` | Kickers, success paths, methodology |
| Ink | `#0f172a` | Headlines, body |
| Ink muted | `#64748b` | Secondary text |
| Surface | `#ffffff` / `#f8fafc` | Cards, sections |

**Gradient (brand):** `135deg` from primary 700 → accent 700 — buttons, kicker rules, premium surfaces.

**Implementation:** `css/design-tokens.css` (single source). Legacy aliases map to `--primary-color` etc.

### 2.3 Iconography & imagery

- **Icons:** Lucide, outline, 2px stroke, ~1.05em inline with text.
- **Photography:** Real vehicles/context; avoid stock “handshake” clichés.
- **Product UI:** Decision preview cards, score labels, methodology chips — not countdown timers.

### 2.4 Layout & elevation

- **Container max:** 72rem (`--ib-container-max`)
- **Radius:** sm 10px · md 14px · lg 20px · pill 999px
- **Shadow:** soft md for cards; lg for modals/hero preview
- **Glass nav:** On scroll — `nav-scrolled` (see `executive-polish.css`)

---

## 3. Typography

### 3.1 Typeface

| Role | Stack |
|------|--------|
| **UI & marketing** | **Inter** + system-ui fallback |
| **Code / data** | System mono |

Load Inter with `display=swap` for performance.

### 3.2 Scale & weight

| Level | Size | Weight | Tracking |
|-------|------|--------|----------|
| Display / H1 | `clamp(1.75rem, 4vw, 2.5rem)` | 800 | -0.03em |
| H2 | 1.5rem | 800 | -0.03em |
| Body | 1rem | 400–500 | normal |
| Small / meta | 0.8125rem | 500–600 | normal |
| Kicker / eyebrow | 0.72rem | 800 | 0.1em uppercase |

**Line height:** body 1.65; headlines 1.2.

### 3.3 Turkish typography

- Use proper Turkish characters (ı, ş, ğ, ü, ö, ç).
- Avoid ALL CAPS except kickers and legal micro-labels.
- **isteBul** never **ISTEBUL** in product UI.

---

## 4. Tone of voice

### 4.1 Voice attributes

| Attribute | Sounds like | Does not sound like |
|-----------|-------------|---------------------|
| **Authoritative** | “Denetlenebilir metodoloji” | “En iyi fırsatlar” |
| **Transparent** | “Şeffaf karar modeli” | “Gizli algoritma sihri” |
| **Neutral** | “Tarafsız değerlendirme” | “Hemen satın alın” |
| **Enterprise** | “Kurumsal karar altyapısı” | “MVP’mizi deneyin” |
| **Human** | “Kararınızı netleştirin” | “2 dk’da ücretsiz!!!” |

### 4.2 Language split

| Context | Language | Register |
|---------|----------|------------|
| Product UI (TR market) | Turkish | Formal **siz**, corporate |
| Investor / data room | English OK | Professional |
| Legal | Turkish | Legal precision |

### 4.3 Word list

**Use:** karar analizi, karar zekâsı, metodoloji, veriye dayalı, tarafsız, ön değerlendirme, senaryo, sinyal, altyapı, platform.

**Avoid:** MVP, startup, hack, beta (unless technical), emoji in product chrome, urgency scams, “en ucuz”, “garanti”.

---

## 5. Trust language

Trust is **specific**, not vague. Repeat the same four rails everywhere (nav complement, footer, checkout).

### 5.1 Trust rail (canonical)

1. KVKK uyumlu veri işleme  
2. Uçtan uca şifreleme (TLS)  
3. Kurumsal karar altyapısı  
4. Denetlenebilir metodoloji  

### 5.2 Proof microcopy (hero, lead forms)

- Taahhüt yok  
- Zorunlu satın alma yok  
- Ücretsiz katman — **not** “free forever hype”; pair with methodology  

### 5.3 Compliance references

Link to: `gizlilik.html`, `kvkk.html`, `cerez-politikasi.html`, `docs/investor/SUBPROCESSORS.md`.

**Don’t claim:** “Bankacılık lisansı”, “resmi onay” unless legally verified.

---

## 6. Product messaging

### 6.1 Message hierarchy

```
Category     → Karar zekâsı platformu
Product      → Araç alım karar asistanı (Auto live)
Pillar       → TCO + finansman + güvenilirlik sinyalleri, tek model
Proof        → Karar skoru, şeffaf metodoloji, KVKK
CTA          → Karar analizini başlat
```

### 6.2 Segment messages

| Segment | Headline angle |
|---------|----------------|
| **Consumer (Auto)** | Netleştirin, karşılaştırın, baskı yok |
| **Pro subscriber** | Gelişmiş raporlar, sınırsız karşılaştırma, öncelikli eşleşme |
| **Partner** | Kaliteli, skorlanmış talep; entegrasyon ve SLA |

### 6.3 SEO / meta (homepage)

- Title pattern: `isteBul | [Product] — [Primary benefit]`  
- Description: methodology + geography (Türkiye) + no hype  

---

## 7. CTA language

### 7.1 Hierarchy

| Priority | Label (TR) | When |
|----------|------------|------|
| **Primary** | Karar analizini başlat | Hero, nav, sticky — drives `/auto/` |
| **Secondary** | Metodolojiyi incele | Education — `#how-it-works` |
| **Tertiary** | Planları görüntüle | Monetization — `#pricing` |
| **Auth** | Giriş yap / Hesap oluştur | Account |
| **Pro** | Pro'yu 7 gün değerlendir | Trial — not “ücretsiz dene!!!” |
| **Lead** | Finansman ön değerlendirmesini başlat | Finance intent |
| **Lead** | Partner eşleşmesini başlat | Partner intent |

### 7.2 CTA rules

- One **primary** per viewport (hero OR sticky, not competing neon buttons).
- Primary button: verb + outcome (“analizini başlat”), not “Ücretsiz” alone in nav.
- Microcopy under CTA: `Ücretsiz ön değerlendirme • zorunlu satın alma yok` — allowed.
- **Banned in primary CTAs:** `2 dk ücretsiz`, `hemen al`, `son şans`.

**Programmatic source:** `js/core/brand-voice.js` · `data/brand/brand-system.json`

---

## 8. Consistency

### 8.1 Cross-surface checklist

| Surface | Must align |
|---------|------------|
| Homepage `index.html` | Trust rail, hero CTA, descriptor |
| Auto `auto/` | Same primary CTA, enterprise body class |
| Account / Pro | Plan names, trial wording |
| Admin | Neutral ops tone (not consumer hype) |
| Email / lifecycle | Same trust + CTA hierarchy |
| Investor docs | English OK; metrics not marketing fluff |

### 8.2 CSS cascade (do not reorder lightly)

1. `design-tokens.css`  
2. `style.css` base  
3. `enterprise-polish.css`  
4. `executive-polish.css`  

Body class: `ib-enterprise` (+ `ib-auto` on Auto).

### 8.3 Engineering hooks

```javascript
import { getCta, TRUST_RAIL, auditCopy } from './core/brand-voice.js';

const label = getCta('primary');
const { ok, violations } = auditCopy(userGeneratedTitle);
```

### 8.4 CI

`node scripts/brand-audit-check.cjs` — required artifacts + homepage CTA alignment.

---

## 9. Related files

| File | Purpose |
|------|---------|
| `css/design-tokens.css` | Visual tokens |
| `data/brand/brand-system.json` | Machine-readable brand pack |
| `js/core/brand-voice.js` | Runtime copy API |
| `docs/BRAND_CONSISTENCY_CHECKLIST.md` | PR / release checklist |
| `docs/EXECUTIVE_POLISH.md` | UI polish layer notes |

---

## 10. Evolution

- **v1.0** — Enterprise brand system baseline (Auto + platform shell).  
- Future: localized EN marketing site, partner co-brand rules, Figma token export.

*Maintainers: update JSON + `brand-voice.js` together when changing canonical CTAs.*
