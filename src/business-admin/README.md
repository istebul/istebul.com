# Business Admin

**Epic:** EPIC-202

## Architecture Freeze v1.0

- Foundation interface'leri değiştirilmez
- Core Runtime değiştirilmez
- Platform Admin değiştirilmez
- Business Runtime Engine'lerine dokunulmaz
- Dashboard / Reports / Export Workspace'ler değiştirilmez
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
| PR-202E | Business Settings Workspace |

## Pipeline (PR-202E)

```
BusinessSettings → Workspace Projection → Summary → BusinessSettingsWorkspaceResult
```

## Workspace widgets (PR-202E)

| ID | Name | Kind |
|----|------|------|
| `business-profile` | Business Profile | profile |
| `organization` | Organization | organization |
| `branding` | Branding | branding |
| `localization` | Localization | localization |
| `notification-preferences` | Notification Preferences | notifications |
| `ai-preferences` | AI Preferences | ai-preferences |
| `workspace-summary` | Workspace Summary | summary |

## Out of scope (PR-202E)

CRUD · Database · API · Realtime · Authentication

## Directory

```
src/business-admin/
  runtime/                 # PR-202A (do not modify)
  dashboard/               # PR-202B (do not modify)
  reports/                 # PR-202C (do not modify)
  exports/                 # PR-202D (do not modify)
  settings/                # PR-202E Business Settings Workspace
    index.ts
    runtime/
    ui/
```
