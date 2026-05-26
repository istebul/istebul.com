# isteBul — Yatırımcı Teslim Paketi (PDF + Slayt + Rehber)

Bu sayfa, yatırımcı bulma ve yatırım alma sürecinde kullanacağınız **tüm çıktıların** tek giriş noktasıdır.

## Hızlı başlangıç

```bash
# 1) PDF ve slayt paketini üret
npm run investor:export:pdf

# 2) Canlı metrikleri toplantı öncesi güncelle (opsiyonel, önerilir)
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:investor:pack
```

Çıktılar: **`docs/investor/export/`**

## PDF ve slayt dosyaları

| Dosya | Açıklama |
|-------|----------|
| `isteBul_ONE_PAGER.pdf` | Tek sayfalık özet — ilk temas |
| `isteBul_PITCH_DECK.pdf` | 16:9 pitch slaytları |
| `isteBul_EXECUTIVE_REPORT.pdf` | DD öncesi birleşik rapor |
| `isteBul_FUNDRAISING_READINESS.pdf` | Hazırlık ve eksik listesi |
| `isteBul_FOUNDER_FUNDRAISING_GUIDE.pdf` | İletişim, toplantı, aksiyon rehberi |
| `pitch-deck-slides.html` | Tarayıcıda sunum / yeniden PDF |

## Operasyon rehberleri (Markdown)

| Konu | Dosya |
|------|--------|
| **Tam kurucu rehberi (bu paketin ana kitabı)** | `FOUNDER_FUNDRAISING_MASTER_GUIDE.md` |
| 100 yatırımcı listesi | `INVESTOR_TARGET_LIST_100.csv` |
| Outreach (warm + cold) | `OUTREACH_PLAYBOOK.md` |
| Toplantı 1 / 2 / DD | `MEETING_FLOW_AND_DD.md` |
| 48 saat follow-up + haftalık update | `FOLLOW_UP_DISCIPLINE.md` |
| Data room | `DATA_ROOM_INDEX.md` |

## Slayt kaynağı (düzenleme)

- Markdown kaynak: `investor-deck.md` (her `---` bir slayt)
- Outline: `PITCH_DECK_OUTLINE.md`

## Founder’ın doldurması gereken alanlar

`investor-deck.md` ve `ONE_PAGER.md` içinde:

- Kurucu adı, e-posta, tur tutarı, dilution
- TAM/SAM rakamları (doğrulanmış)
- Takım tablosu
- Slayt 7 canlı metrikler (`metrics:investor:pack`)

Güncelleme sonrası: `npm run investor:export:pdf`
