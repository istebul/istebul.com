# Business Admin

**Epic:** EPIC-202

## Architecture Freeze v1.0

- Foundation interface'leri değiştirilmez
- Core Runtime değiştirilmez
- Platform Admin değiştirilmez
- Business Runtime Engine'lerine (Dashboard / Report / Export dahil) dokunulmaz
- Dashboard Workspace (PR-202B) değiştirilmez
- Reports Workspace (PR-202C) değiştirilmez
- Yeni global state oluşturulmaz
- Platform Admin ile ortak ekran oluşturulmaz
- TypeScript strict devam eder

## PRs

| PR | Scope |
|----|--------|
| PR-202A | Business Admin Foundation Runtime |
| PR-202B | Dashboard Workspace |
| PR-202C | Reports Workspace |
| PR-202D | Export Workspace |

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

## Pipeline (PR-202D)

```
ExportResult → Workspace Projection → Summary → ExportWorkspaceResult
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

## Workspace widgets (PR-202D)

| ID | Name | Kind |
|----|------|------|
| `exports-overview` | Exports Overview | overview |
| `recent-exports` | Recent Exports | list |
| `available-formats` | Available Formats | formats |
| `export-status` | Export Status | status |
| `execution-summary` | Execution Summary | summary |

## Out of scope

- CRUD / Database / API / Auth
- Charts / Realtime (PR-202B)
- Realtime / Export (PR-202C)
- Realtime (PR-202D)

## Directory

```
src/business-admin/
  index.ts
  README.md
  tsconfig.json
  runtime/                 # PR-202A foundation (do not modify)
  dashboard/               # PR-202B Dashboard Workspace (do not modify)
  reports/                 # PR-202C Reports Workspace (do not modify)
  exports/                 # PR-202D Export Workspace
    index.ts
    runtime/
      ExportResult.ts
      ExportWorkspaceWidget.ts
      ExportWorkspaceContext.ts
      ExportWorkspaceResult.ts
      ExportWorkspaceRegistry.ts
      ExportWorkspaceRuntime.ts
      ExportWorkspaceSummary.ts
      builtinWidgets.ts
      workspaceValidation.ts
      workspaceProjection.ts
      index.ts
    ui/
      ExportWorkspaceLayout.ts
      exportWorkspaceStyles.ts
      index.ts
```
