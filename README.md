# istebul.com

Yapay zeka destekli karar platformu — yüksek tutarlı satın alma kararları (Auto canlı; çok dikey yol haritası).

## Investor / due diligence

- **Data room index:** [docs/investor/DATA_ROOM_INDEX.md](docs/investor/DATA_ROOM_INDEX.md)
- **Readiness audit:** [docs/investor/INVESTOR_READINESS.md](docs/investor/INVESTOR_READINESS.md)
- **One-pager:** [docs/investor/ONE_PAGER.md](docs/investor/ONE_PAGER.md)
- **Pitch deck outline:** [docs/investor/PITCH_DECK_OUTLINE.md](docs/investor/PITCH_DECK_OUTLINE.md)

## Moat architecture (P3.6)

- **Strategy:** [docs/P3_MOAT_ARCHITECTURE.md](docs/P3_MOAT_ARCHITECTURE.md)
- **Product:** [/karar-moat.html](https://www.istebul.com/karar-moat.html)
- **API:** `moat-health` edge function
- **Export:** `npm run metrics:moat`

## Growth engine

- **Playbook:** [docs/GROWTH_ENGINE.md](docs/GROWTH_ENGINE.md)
- **Lifecycle CRM:** [docs/LIFECYCLE_CRM.md](docs/LIFECYCLE_CRM.md)
- **Observability:** [docs/PRODUCTION_OBSERVABILITY.md](docs/PRODUCTION_OBSERVABILITY.md)
- **Resilience / BCP:** [docs/PRODUCTION_RESILIENCE_AUDIT.md](docs/PRODUCTION_RESILIENCE_AUDIT.md)
- **Compliance:** [docs/COMPLIANCE_READINESS_AUDIT.md](docs/COMPLIANCE_READINESS_AUDIT.md)
- **Weekly export:** `npm run metrics:growth` (requires Supabase service role)
- **KPI export:** `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/investor-metrics-snapshot.cjs`
- **Admin:** Investor KPIs panel (admin girişi gerekir)

## Otomatik deploy

`main` branch’e push → GitHub Actions **Production Deploy** (test + Cloudflare Pages + Supabase).

**İlk kurulum / domain / secret’lar:** [docs/CANLIYA_ALMA_REHBERI.md](docs/CANLIYA_ALMA_REHBERI.md)  
**Yerel kontrol:** `npm run verify:deploy`

İlk kurulum: [.github/SECRETS.example.md](.github/SECRETS.example.md)
