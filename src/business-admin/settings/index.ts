/**
 * İSTEBUL Business Admin — Business Settings Workspace (PR-202E).
 *
 * Architecture Freeze v1.0 — additive runtime + UI iskeleti.
 * Core Runtime / Platform Admin / Business Engines / prior Workspaces değiştirilmez.
 * Yalnızca projeksiyon; CRUD, API, DB, Realtime, Auth yok.
 */

export type {
  BusinessSettings,
  BusinessSettingsProfile,
  BusinessSettingsOrganization,
  BusinessSettingsBranding,
  BusinessSettingsLocalization,
  BusinessSettingsNotifications,
  BusinessSettingsAiPreferences,
  BusinessSettingsWorkspaceWidgetId,
  BusinessSettingsWorkspaceWidgetKind,
  BusinessSettingsWorkspaceWidgetStatus,
  BusinessSettingsWorkspaceWidgetDefinition,
  BusinessSettingsWorkspaceFieldItem,
  BusinessSettingsProfileProjection,
  BusinessSettingsOrganizationProjection,
  BusinessSettingsBrandingProjection,
  BusinessSettingsLocalizationProjection,
  BusinessSettingsNotificationsProjection,
  BusinessSettingsAiPreferencesProjection,
  BusinessSettingsExecutionProjection,
  BusinessSettingsWorkspaceWidgetProjection,
  BusinessSettingsWorkspaceContext,
  BusinessSettingsWorkspaceSummary,
  BusinessSettingsWorkspaceSummaryItem,
  BusinessSettingsWorkspaceValidationIssue,
  BusinessSettingsWorkspaceTelemetry,
  BusinessSettingsWorkspaceResult
} from './runtime/index';

export {
  toEmptyBusinessSettingsWidgetProjection,
  createBusinessSettingsWorkspaceContext,
  buildBusinessSettingsWorkspaceSummary,
  buildBusinessSettingsWorkspaceSummaryItems,
  PIPELINE_BAG_BUSINESS_SETTINGS_WORKSPACE_RESULT_KEY,
  BusinessSettingsWorkspaceRegistry,
  createBusinessSettingsWorkspaceRegistry,
  BusinessSettingsWorkspaceRuntime,
  createBusinessSettingsWorkspaceRuntime,
  BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGETS,
  BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGET_COUNT,
  getBuiltinBusinessSettingsWorkspaceWidget,
  validateBusinessSettingsWorkspaceContext,
  resolveRequestedBusinessSettingsWidgets,
  projectBusinessSettingsWorkspaceWidget,
  projectBusinessSettingsWorkspaceWidgets
} from './runtime/index';

export type { BusinessSettingsWorkspaceLayoutOptions } from './ui/index';

export {
  createBusinessSettingsWorkspaceHeader,
  createBusinessSettingsWorkspaceProfile,
  createBusinessSettingsWorkspaceOrganization,
  createBusinessSettingsWorkspaceBranding,
  createBusinessSettingsWorkspaceLocalization,
  createBusinessSettingsWorkspaceNotifications,
  createBusinessSettingsWorkspaceAiPreferences,
  createBusinessSettingsWorkspaceSummaryPanel,
  createBusinessSettingsWorkspaceLayout,
  mountBusinessSettingsWorkspace,
  BUSINESS_SETTINGS_WORKSPACE_STYLE_ID,
  BUSINESS_SETTINGS_WORKSPACE_CSS,
  ensureBusinessSettingsWorkspaceStyles
} from './ui/index';
