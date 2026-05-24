# P4.3 — Mobile premium UX

iPhone Safari ve Android Chrome için mobile-first polish.

## Dosyalar

| Dosya | Rol |
|-------|-----|
| `css/p4-3-mobile-premium.css` | Sticky CTA, spacing, wizard, results, pricing, keyboard margins |
| `js/runtime/mobile-premium-ux.js` | `visualViewport` klavye, sticky gizleme, hero IO, wizard scroll |
| `css/mobile-perfection.css` | Temel tap target ve safe-area (alt katman) |

## Davranışlar

- **Sticky CTA:** Açık cam bar; klavye / modal / hero CTA görünürken gizlenir
- **Klavye:** `ib-keyboard-open` — alt padding ve sticky kapatma
- **Form:** `focusin` → alan ortalanır, sticky gizlenir; 16px font (zoom önleme) mobile-perfection’da
- **Auto wizard:** Sticky aksiyon çubuğu, 48px+ seçenekler, sonuç kartları tek sütun
- **Planlar:** Tam genişlik CTA, okunaklı fiyat tipografisi

## CI

```bash
node scripts/p4-mobile-ux-audit.cjs
```

Auto bundle: `auto.css` + P4 + P4.3 birleştirilir (`ib-car.css`).
