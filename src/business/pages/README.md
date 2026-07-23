# pages

Business ürününün sayfa düzeyindeki yüzeyleri.

| Sayfa | Route |
|-------|-------|
| `BusinessDashboardPage` | `/business/` |
| `BusinessAnalysesPage` | `/business/analizler/` |
| `BusinessReportsPage` | `/business/raporlar/` |
| `BusinessAiAdvisorPage` | `/business/danisman/` |
| `BusinessNotificationsPage` | `/business/bildirimler/` |
| `BusinessSettingsPage` | `/business/ayarlar/` |
| `BusinessHomePage` | Legacy alias → Dashboard mount |

Her sayfa `BusinessLayout` kabuğu ile `mountBusinessApp` üzerinden birleştirilir.
