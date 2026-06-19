# Corporate static build (`npm run build:corporate`)

## Purpose

Regenerates selected **corporate/legal** HTML from `scripts/lib/render-corporate-html.cjs` and `data/compliance/*`.

## Safe usage

```bash
npm run build:corporate
```

## Never overwrite (live apps)

`scripts/build-corporate-static.cjs` **skips** these paths — they ship hand-maintained wizard UIs:

| Slug / path | Reason |
|-------------|--------|
| `auto` | Full Auto decision app |
| `konut` | Housing wizard |
| `tatil` | Vacation wizard |
| `finans` | Finance wizard |
| `sigorta` | Insurance wizard |
| `kasko` | Comprehensive insurance wizard |
| `metodoloji` | Rich methodology page (from SEO build) |

## Generated files

- `hakkimizda.html`
- `kvkk.html` (includes `#ziyaretci-aydinlatma`, `#kvkk-bilgilendirme`)

## Footer / legal links

Corporate footer nav is defined in `scripts/lib/legal-footer.cjs`. After editing:

```bash
node scripts/sync-corporate-footers.cjs
```

## SEO / rehber pages

Long-form guides (`/rehber/*`) come from **`npm run build`** (`buildSeoPages`), not `build:corporate`.
