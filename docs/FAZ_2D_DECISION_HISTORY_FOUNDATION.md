# Faz 2D — Decision History Foundation Keşif Raporu

**Tarih:** 2026-06-08  
**Kapsam:** Keşif / analiz (kod değişikliği yok, migration yok)  
**Bağlam:** Faz 2C tamamlandı (Summary Card, AI Rationale, Share Card). Faz 2D, karar geçmişi temelini ürün ilkesine oturtmadan önce mimari hazırlık.

---

## 1. Mevcut durum — Karar sonucu üretim akışı

### 1.1 Akış özeti

```
handleDecisionAssistantSubmit (js/app.js)
  → buildDecisionResult(categoryConfig, answers)
  → [opsiyonel] augmentDecisionWithAI(...)
  → lastDecisionResult = result
  → ui.renderDecisionResults(result)          // js/ui/assistant-ui.js
  → saveDecisionHistory(result)               // auth kullanıcı → localStorage
```

**Sonuç üretim noktası:** `buildDecisionResult` (`js/app.js`, ~2667). Skor/TCO/risk motorları burada `calculateAssistantScores` ve türevleri üzerinden çalışır; Faz 2C katmanları bu çıktıyı **okur**, yeniden hesaplamaz.

### 1.2 Final sonuç objesi (`buildDecisionResult` dönüşü)

| Alan | Kaynak | Açıklama |
|------|--------|----------|
| `id` | `decision-${Date.now()}` | Oturum içi benzersiz kimlik |
| `categoryId` | `this.assistantCategory` | `arac`, `ev`, `tatil`, … |
| `categoryName` | `categoryConfig.name` | Görünen kategori adı |
| `createdAt` | ISO timestamp | Üretim anı |
| `rawAnswers` | Form cevapları (ham) | `repeatDecision` için gerekli |
| `answers` | Soru etiketli özet | UI + geçmiş kartı |
| `recommendations[]` | `calculateAssistantScores` (max 3) | Skor, risk, TCO, detaylar |
| `dataHealth` | `createDecisionDataHealth` | Güven bandı, kaynak sayısı |
| `summary` | `createDecisionSummary` | Metin özeti |
| `insight` | `createDecisionInsight` | headline, reasons, cautions, nextSteps |

**Primary recommendation** (`recommendations[0]`): skor, `riskLevel`, `yearlyCost`, `decisionTags`, `scoreNote`, `calculationTable`, `financeComparisons`, vb.

### 1.3 Sonuç ekranına geçen veri

`renderDecisionResults(result)` (`js/ui/assistant-ui.js`):

1. Hero + toolbar (primary name, score, badges)
2. **Faz 2C — `buildDecisionResultSummary(result)`** → fit / risk / TCO / profile kartları
3. **Faz 2C — AI Rationale** → summary sinyallerini açıklar (deterministik + opsiyonel proxy)
4. **Faz 2C — Share Card** → `buildDecisionResultShareText(summary)`
5. Executive metrics, data health, answers, insight, recommendations listesi

Önemli: `buildDecisionResultSummary` çıktısı **yalnızca render katmanı**; persist edilmiyor.

---

## 2. Persist edilebilir alanlar — Bugün nereden geliyor?

| Alan | Sonuç kaynağı | Summary (2C) kaynağı | `saveDecisionHistory` kaydı |
|------|---------------|----------------------|------------------------------|
| **score** | `recommendations[0].score` | `summary.fit.value` | `topPick.score` ✓ |
| **risk** | `recommendations[0].riskLevel` | `summary.risk.value` | **Kaydedilmiyor** ✗ |
| **TCO** | `recommendations[0].yearlyCost` | `summary.tco.value` | `topPick.yearlyCost` ✓ |
| **suitability (fit)** | `score` + `scoreNote` + `summary` string | `summary.fit.detail` | Kısmi (`summary` + `topPick.score`) |
| **decision profile** | `insight.headline`, `decisionTags[]`, `answers[]` | `summary.profile` | `insight` tam obje; **tags kaybolur** |
| **selected category** | `categoryId`, `categoryName` | `result.categoryName` | Her ikisi ✓ |
| **createdAt** | `buildDecisionResult` | — | ✓ |

**Kayıt şekli bugün** (`saveDecisionHistory`, ~3694):

```javascript
{
  id, categoryId, categoryName, createdAt,
  rawAnswers, answers, summary, insight, dataHealth,
  topPick: { name, score, price, yearlyCost, monthlyPayment },
  recommendations: [{ name, score, price, yearlyCost }]  // kırpılmış
}
```

- Limit: **12 kayıt**, kullanıcı scoped `istebul_decision_history:{userId}`
- Anonim: kayıt yok (`getUserHistoryStorageKey` → `null`)
- Başarı mesajı: giriş yoksa "Geçmişe kaydetmek için giriş yapın"

### 2.1 Paralel / parçalı geçmiş sistemleri

| Sistem | Depolama | Amaç | Wizard sonucu? |
|--------|----------|------|----------------|
| **Karar Asistanı `/gecmis`** | `istebul_decision_history:{userId}` | Wizard sonuçları | Evet |
| **Decision Memory Lite** | `istebul_decision_history_v1` | Profil/trend snapshot | Kısmen (farklı şema) |
| **Retention saved decisions** | `istebul_saved_decisions` | LTV / revisit | Hayır |
| **UDC listing events** | In-memory + Supabase şeması | İlan etkileşimi | Hayır (listing-centric) |
| **Auto bridge** | `saveDecisionHistory` via `app-bridge.js` | Auto analiz | Evet (`categoryId: auto`) |
| **Konut** | Doğrudan localStorage yazımı | Konut raporu | Evet (farklı şekil, `konut`) |

**Gap:** Tek canonical model yok; kategori ID tutarsız (`arac` vs `auto`, `ev` vs `konut`).

---

## 3. Minimum viable history record (öneri)

Faz 2D Foundation için **motor çıktısını değiştirmeden** serialize edilebilecek minimum kayıt:

```typescript
// Kavramsal tip — implementasyon PR'larında jsdoc veya ayrı types modülü
interface DecisionHistoryEntryV1 {
  id: string;                    // decision-{timestamp} veya uuid
  categoryId: string;            // normalize: arac | ev | tatil | auto | konut | ...
  categoryName: string;
  createdAt: string;             // ISO-8601

  // Nihai sinyaller (primary recommendation + 2C summary ile uyumlu)
  score: number;                 // 0–100
  riskLevel: string;             // Düşük risk | Kontrollü risk | ...
  yearlyCost: number;            // TCO sayısal
  tcoLabel?: string;             // calculationTable.totalLabel
  suitabilityNote?: string;      // scoreNote veya kısa fit metni
  decisionProfile: string;       // insight.headline veya profile özeti
  profileTags?: string[];        // decisionTags.slice(0, 3)
  confidenceLabel?: string;      // dataHealth.confidenceLabel

  // Yeniden değerlendirme için
  rawAnswers: Record<string, unknown>;
  answers: Array<{ id?: string; label: string; value: string }>;

  // Geriye dönük uyumluluk (mevcut UI)
  topPick: {
    name: string;
    score: number;
    price: number;
    yearlyCost: number;
    monthlyPayment?: number;
    riskLevel?: string;
  };
  summary?: string;
  insight?: object;
  dataHealth?: object;
  recommendations?: Array<{ name: string; score: number; price: number; yearlyCost: number }>;

  // Meta
  source: 'assistant' | 'auto' | 'konut' | 'bridge';
  schemaVersion: 1;
}
```

**Minimum alan seti (MVP liste kartı için):**

`id`, `categoryId`, `categoryName`, `createdAt`, `score`, `riskLevel`, `yearlyCost`, `decisionProfile`, `topPick.name`

**Türetim (yeni hesaplama yok):**

```javascript
// Pseudocode — buildDecisionResultSummary + mevcut result okuma
const primary = result.recommendations[0];
const summary = buildDecisionResultSummary(result);
return {
  score: primary.score,
  riskLevel: primary.riskLevel,
  yearlyCost: primary.yearlyCost,
  decisionProfile: summary.profile.value,
  profileTags: primary.decisionTags?.slice(0, 3),
  confidenceLabel: result.dataHealth?.confidenceLabel,
  tcoLabel: primary.calculationTable?.totalLabel,
  suitabilityNote: primary.scoreNote,
  // ... mevcut alanlar korunur
  schemaVersion: 1
};
```

---

## 4. UX keşfi — Kullanıcı geçmişte ne görmek ister?

### 4.1 Platform ilkesiyle hizalama

isteBul: **"AI destekli karar verme platformu"** — geçmiş, satın alma geçmişi değil; **karar sinyallerinin zaman içindeki izi**.

- Skor / risk / TCO / profil **deterministik** gösterilir
- AI yorumu geçmişte **opsiyonel snapshot** veya "o anki gerekçe" olarak saklanabilir (Faz 2D+); zorunlu değil
- "En doğru karar budur" dili yok; "o anki sinyal özeti" dili

### 4.2 Önerilen UX yapısı

#### A. Karar geçmişi listesi (`/gecmis` — mevcut sayfa evrimi)

Her kart:

| Bölüm | İçerik |
|-------|--------|
| Başlık | Kategori + tarih |
| Öne çıkan | `topPick.name` |
| Sinyal şeridi | Uygunluk skoru · Risk etiketi · TCO · Profil tek satır |
| Eylemler | Tekrar aç · Karşılaştırmaya ekle · Sil |

Mevcut kart (`renderDecisionHistory`) skor + fiyat + maliyet gösteriyor; **risk ve profil eksik**.

#### B. Son kararlar (hub snippet)

- Karar Merkezi / Profil / Ana sayfada son 1–3 kayıt
- "Son kararınız: Araç · 88/100 · Düşük risk · ₺… TCO"
- CTA: Geçmişe git · Yeniden değerlendir

#### C. Yeniden değerlendir

- Mevcut: `repeatDecision` → `rawAnswers` ile wizard son adım + `buildDecisionResult` yeniden
- İyileştirme: aynı girdilerle güncel skor/TCO (motor güncellenmişse değerler değişebilir — kullanıcıya "yeniden hesaplandı" notu)

#### D. Karşılaştırmaya geri gönder

- `createComparisonItemFromRecommendation(topPick, record)` ile `/karsilastir/`
- Geçmiş kartında secondary CTA: "Karşılaştırmaya ekle"
- Mevcut akış sonuç ekranında var; geçmişe taşınmalı

#### E. Empty / auth state (değişmez)

- Giriş yok: auth gate (mevcut `renderHistoryAuthGate`)
- Geçmiş boş: Karar Merkezi'ne yönlendiren CTA

---

## 5. Risk analizi

| Risk | Etki | Değerlendirme |
|------|------|----------------|
| **Router** | Düşük | `/gecmis` zaten var (`history`). Yeni route gerekmez; Faz 2D UI evrimi mevcut sayfada yapılabilir |
| **Supabase** | Orta-yüksek | `decision_history` tabloları **listing-centric**; wizard sonucu kolonları yok. Client Supabase'e yazmıyor. Cloud sync ayrı PR / migration gerektirir |
| **Veri boyutu** | Düşük-orta | localStorage 12 kayıt × ~2–5 KB ≈ güvenli. Konut doğrudan yazım 80 kayıt — tutarsız. JSON şişmesi: `recommendations` + `insight` tam obje saklanıyor |
| **Çok kategori** | Orta | `arac`/`auto`, `ev`/`konut` ayrımı `repeatDecision` ve filtreleri kırabilir. Normalize katmanı şart |
| **Model parçalanması** | Yüksek | 4+ paralel geçmiş kaynağı; Foundation önce **canonical entry** + tek yazım yolu tanımlamalı |
| **Motor değişikliği** | Düşük (hedef) | History sadece mevcut alanları serialize eder; skor motoruna dokunulmaz |
| **AI snapshot** | Düşük | Rationale metni saklansa bile yeni AI mantığı gerekmez; opsiyonel `rationaleSnapshot` string |

---

## 6. Faz 2D için önerilen PR sırası

| Sıra | PR | Kapsam | Dokunulan alanlar |
|------|-----|--------|-------------------|
| **2D-1** | Canonical entry builder | `buildDecisionHistoryEntry(result)` — summary + result okuma, `schemaVersion: 1` | `js/ui/` veya `js/decision/` yeni modül; `saveDecisionHistory` genişletme |
| **2D-2** | History list UX (sinyal şeridi) | `/gecmis` kartlarında risk + profil + TCO etiketi | `assistant-ui.js` `renderDecisionHistory`, CSS |
| **2D-3** | Geçmiş eylemleri | "Karşılaştırmaya ekle" + son kararlar snippet (hub/profil) | UI + mevcut `addComparisonItem` köprüsü |
| **2D-4** | Kategori normalizasyonu | `arac`↔`auto`, `ev`↔`konut` mapping; Auto/Konut yazıcıları bridge'e | `app-bridge`, `auto-app`, `real-estate-app` (mantık değil, yazım yolu) |
| **2D-5** | Geriye dönük uyumluluk | Eski kayıtları okurken eksik alanları türet (riskLevel vb.) | Migration'sız client-side upgrade |
| **2D-6** (opsiyonel) | Supabase wizard sync spike | Ayrı tablo veya `metadata jsonb` tasarımı; RLS; **migration ayrı onay** | Supabase + edge — Faz 2D dışı spike |

**Bilinçli olarak ertelenen:**

- Cloud sync / çok cihaz
- AI rationale snapshot saklama
- Listing event geçmişi ile wizard geçmişi birleştirme (UDC tab)
- PDF/export

---

## 7. Hazırlık değerlendirmesi

| Soru | Cevap |
|------|-------|
| Mimari hazır mı? | **Kısmen.** Üretim (`buildDecisionResult`), persist (`saveDecisionHistory`), liste UI (`/gecmis`) ve Faz 2C özet katmanı var. Eksik: canonical model, sinyal alanlarının kaydı, UX hizalama |
| Hemen migration gerekir mi? | **Hayır.** localStorage genişletmesi ile 2D-1–2D-3 yapılabilir |
| app.js / motor değişikliği gerekir mi? | **Minimum.** `saveDecisionHistory` kayıt şekli genişletmesi; skor hesabı değişmez |
| Faz 2C ile uyum? | **Yüksek.** `buildDecisionResultSummary` doğrudan history entry türetimi için kaynak olabilir |

---

## 8. Sonuç

**Faz 2D Decision History Foundation** için keşif tamamlandı:

1. Karar sonucu `buildDecisionResult` → `renderDecisionResults` → `saveDecisionHistory` zincirinde üretiliyor.
2. Skor ve TCO kaydediliyor; **risk, profil etiketleri ve 2C summary serialize edilmiyor**.
3. Minimum kayıt modeli (`DecisionHistoryEntryV1`) ve PR sırası tanımlandı.
4. UX: mevcut `/gecmis` evrilerek sinyal odaklı kart + yeniden değerlendir + karşılaştırmaya ekle önerildi.
5. Ana riskler: parçalı geçmiş modelleri, kategori ID tutarsızlığı, Supabase şemasının wizard sonuçlarına uyumsuzluğu.

**Öneri:** Faz 2D-1 ile canonical entry builder + `saveDecisionHistory` genişletmesi; ürün kapsamı ve motorlar korunarak ilerlenmeli.

---

## Ek: İlgili dosya indeksi

| Alan | Dosyalar |
|------|----------|
| Üretim | `js/app.js` (`buildDecisionResult`, `saveDecisionHistory`, `repeatDecision`) |
| Render | `js/ui/assistant-ui.js`, `js/ui/decision-result-summary.js` |
| Geçmiş UI | `js/ui/assistant-ui.js` (`renderDecisionHistory`), `index.html` (`#history-list`) |
| Depolama | `js/core/storage-keys.js` |
| Listing geçmişi | `js/decision-history/history-engine.js`, `js/app.js` (`recordUserDecisionEvent`) |
| Supabase şema | `supabase/migrations/20260702_user_decision_platform_v1.sql` |
| Dikey yazıcılar | `js/auto/auto-app.js`, `js/real-estate/real-estate-app.js`, `js/core/app-bridge.js` |
