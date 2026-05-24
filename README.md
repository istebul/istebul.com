# istebul.com

Yapay zeka destekli karar platformu — yüksek tutarlı satın alma kararları (Auto canlı; çok dikey yol haritası).

## Investor / due diligence

- **Data room index:** [docs/investor/DATA_ROOM_INDEX.md](docs/investor/DATA_ROOM_INDEX.md)
- **Readiness audit:** [docs/investor/INVESTOR_READINESS.md](docs/investor/INVESTOR_READINESS.md)
- **One-pager:** [docs/investor/ONE_PAGER.md](docs/investor/ONE_PAGER.md)
- **KPI export:** `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/investor-metrics-snapshot.cjs`
- **Admin:** Investor KPIs panel (admin girişi gerekir)

## Otomatik deploy

`main` branch’e push → GitHub Actions **Production Deploy** (test + Cloudflare Pages + Supabase).

**İlk kurulum / domain / secret’lar:** [docs/CANLIYA_ALMA_REHBERI.md](docs/CANLIYA_ALMA_REHBERI.md)  
**Yerel kontrol:** `npm run verify:deploy`

İlk kurulum: [.github/SECRETS.example.md](.github/SECRETS.example.md)
