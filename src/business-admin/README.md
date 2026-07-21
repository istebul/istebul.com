# Business Admin

**Epic:** EPIC-202

## Architecture Freeze v1.0

- Foundation interface'leri değiştirilmez
- Core Runtime değiştirilmez
- Platform Admin değiştirilmez
- Business Runtime Engine'lerine (Dashboard dahil) dokunulmaz
- Yeni global state oluşturulmaz
- Platform Admin ile ortak ekran oluşturulmaz
- TypeScript strict devam eder

## PRs

| PR | Scope |
|----|--------|
| PR-202A | Business Admin Foundation Runtime |
| PR-202B | Dashboard Workspace |

## Pipeline (PR-202A)

```
Validation → Module Registry → Summary → BusinessAdminResult
```

## Pipeline (PR-202B)

```
DashboardResult → Workspace Projection → Workspace Summary → DashboardWorkspaceResult
```

## Modules (foundation skeleton)

| ID | Name | Category |
|----|------|----------|
| `dashboard` | Dashboard | operations |
| `reports` | Reports | monitoring |
| `exports` | Exports | operations |
| `business-settings` | Business Settings | configuration |
| `users` | Users | operations |
| `activity` | Activity | monitoring |

## Workspace widgets (PR-202B)

| ID | Name | Kind |
|----|------|------|
| `overview` | Overview | overview |
| `kpi-cards` | KPI Cards | kpi-cards |
| `recent-analysis` | Recent Analysis | list |
| `recent-decisions` | Recent Decisions | list |
| `recent-reports` | Recent Reports | list |
| `recent-exports` | Recent Exports | list |
| `execution-summary` | Execution Summary | summary |

## Out of scope

- CRUD / Database / API / Auth
- Charts / Realtime (PR-202B)

## Directory

```
src/business-admin/
  index.ts
  README.md
  tsconfig.json
  runtime/                 # PR-202A foundation (do not modify)
    BusinessAdminContext.ts
    BusinessAdminResult.ts
    BusinessAdminModule.ts
    BusinessAdminRegistryRuntime.ts
    BusinessAdminRuntime.ts
    builtinModules.ts
    businessValidation.ts
    businessSummary.ts
    timing.ts
    index.ts
  dashboard/               # PR-202B Dashboard Workspace
    index.ts
    runtime/
      DashboardResult.ts
      DashboardWorkspaceWidget.ts
      DashboardWorkspaceContext.ts
      DashboardWorkspaceResult.ts
      DashboardWorkspaceRegistry.ts
      DashboardWorkspaceRuntime.ts
      DashboardWorkspaceSummary.ts
      builtinWidgets.ts
      workspaceValidation.ts
      workspaceProjection.ts
      index.ts
    ui/
      DashboardWorkspaceLayout.ts
      dashboardWorkspaceStyles.ts
      index.ts
```
