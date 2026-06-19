# isteBul Investor Export Pack

Generated: 2026-05-26T21:40:36.485Z

## PDF dosyaları (yatırımcıya gönder)

| Dosya | Kullanım |
|-------|----------|
| `isteBul_ONE_PAGER.pdf` | İlk temas, intro mail eki |
| `isteBul_PITCH_DECK.pdf` | 1. ve 2. görüşme sunumu (16:9 slayt) |
| `isteBul_EXECUTIVE_REPORT.pdf` | DD öncesi özet rapor |
| `isteBul_FUNDRAISING_READINESS.pdf` | İç hazırlık / eksik listesi |
| `isteBul_FOUNDER_FUNDRAISING_GUIDE.pdf` | Kurucu operasyon rehberi (iletişim + süreç) |

## HTML (düzenleme / yeniden export)

HTML dosyalarını düzenledikten sonra: `npm run investor:export:pdf`

## Canlı metrik

Toplantı öncesi: `npm run metrics:investor:pack` → `dist/investor-readiness-pack.json`

## Google Slides / Keynote

1. `docs/investor/investor-deck.md` dosyasını Marp veya manuel olarak slaytlara aktarın
2. Veya `pitch-deck-slides.html` → tarayıcıdan PDF → slayt görseli olarak import
