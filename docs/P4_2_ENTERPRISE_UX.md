# P4.2 — Enterprise UX

Form, auth, account, checkout-adjacent, partner funnel ve admin giriş yüzeyleri için tutarlı enterprise kalite.

## Katmanlar

| Dosya | Rol |
|-------|-----|
| `css/enterprise-ux-system.css` | Form hataları, modal geçişi, loading, empty state, auth banner |
| `js/runtime/enterprise-form-ux.js` | Modal a11y, submit loading, inline banner, field errors |

## Düzeltmeler (özet)

- **Auth:** Escape + Tab trap, `aria-live` hatalar, checkout success gecikmesi, şifre sıfırlama modalı + e-posta ön doldurma
- **Account:** `tab` / `tabpanel` + `aria-controls`, güven metni
- **Partner:** `alert()` → inline funnel banner
- **Auto lead:** Etiketli alanlar, KVKK metni korundu
- **Messages / Favoriler:** Boş durum + CTA
- **Admin login:** `for`/`id`, `role="alert"`, submit loading
- **Global submit:** `data-enterprise-form` formları kör `aria-busy` dışında

## CI

```bash
node scripts/p4-enterprise-ux-audit.cjs
```

`npm test` içinde çalışır.
