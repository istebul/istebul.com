# Business Admin

**Epic:** EPIC-202

## Architecture Freeze v1.0

- Foundation interface'leri değiştirilmez
- Core Runtime değiştirilmez
- Platform Admin değiştirilmez
- Business Runtime Engine'lerine (Dashboard / Report dahil) dokunulmaz
- Dashboard Workspace (PR-202B) değiştirilmez
- Yeni global state oluşturulmaz
- Platform Admin ile ortak ekran oluşturulmaz
- TypeScript strict devam eder

## PRs

| PR | Scope |
|----|--------|
| PR-202A | Business Admin Foundation Runtime |
| PR-202B | Dashboard Workspace |
| PR-202C | Reports Workspace |

## Pipeline (PR-202A)

```
Validation → Module Registry → Summary → BusinessAdminResult
```

## Pipeline (PR-202B)

```
DashboardResult → Workspace Projection → Workspace Summary → DashboardWorkspaceResult
```

## Pipeline (PR-202C)

```
ReportResult → Workspace Projection → Summary → ReportsWorkspaceResult
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

## Workspace widgets (PR-202C)

| ID | Name | Kind |
|----|------|------|
| `reports-overview` | Reports Overview | overview |
| `recent-reports` | Recent Reports | list |
| `report-categories` | Report Categories | categories |
| `report-details` | Report Details | detail |
| `report-status` | Report Status | status |
| `execution-summary` | Execution Summary | summary |

## Out of scope

- CRUD / Database / API / Auth
- Charts / Realtime (PR-202B)
- Realtime / Export (PR-202C)

## Directory

```
src/business-admin/
  index.ts
  README.md
  tsconfig.json
  runtime/                 # PR-202A foundation (do not modify)
  dashboard/               # PR-202B Dashboard Workspace (do not modify)
  reports/                 # PR-202C Reports Workspace
    index.ts
    runtime/
      ReportResult.ts
      ReportsWorkspaceWidget.ts
      ReportsWorkspaceContext.ts
      ReportsWorkspaceResult.ts
      ReportsWorkspaceRegistry.ts
      ReportsWorkspaceRuntime.ts
      ReportsWorkspaceSummary.ts
      builtinWidgets.ts
      workspaceValidation.ts
      workspaceProjection.ts
      index.ts
    ui/
      ReportsWorkspaceLayout.ts
      reportsWorkspaceStyles.ts
      index.ts
```
