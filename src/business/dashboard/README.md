# Dashboard Engine

İSTEBUL Business **Dashboard Engine** — Analysis / Decision / Report girdilerinden kanonik `DashboardModel` üretme sözleşmeleri.

## Architecture Freeze v1.0

Tanım katmanı; React, Chart.js, ECharts, Recharts veya UI yoktur.

## Dizinler

| Klasör | Amaç |
|--------|------|
| `models/` | DashboardModel ve parça tipleri |
| `ports/` | Motor ve pipeline portları |
| `pipeline/` | Aşama tanımları |
| `registry/` | Profil, widget, yerleşim, tema |
| `constants/` | Sabitler |
| `widgets/` | Widget kayıt sözleşmesi |
| `layouts/` | Yerleşim kayıt sözleşmesi |

Detay: `Dashboard Engine Specification.md`
