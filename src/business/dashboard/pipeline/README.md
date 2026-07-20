# pipeline

`DashboardPipeline.ts` — altı sabit aşama (Architecture Freeze v1.0).

`runtime/` — Pipeline Runtime Orchestrator (PR-105A):

- `DashboardPipelineRuntime` — sıralı aşama koordinasyonu
- `dashboard-dogrulama` gerçek kaynak doğrulaması
- diğer ara aşamalar structured `not-implemented`
- `dashboard-derleme` iskelet `DashboardModel` üretir
- Dashboard-özel bag + telemetri
