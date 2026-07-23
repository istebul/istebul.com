/**
 * Business Settings Workspace UI — dışa aktarımlar (PR-202E).
 */

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
  mountBusinessSettingsWorkspace
} from './BusinessSettingsWorkspaceLayout';
export type { BusinessSettingsWorkspaceLayoutOptions } from './BusinessSettingsWorkspaceLayout';

export {
  BUSINESS_SETTINGS_WORKSPACE_STYLE_ID,
  BUSINESS_SETTINGS_WORKSPACE_CSS,
  ensureBusinessSettingsWorkspaceStyles
} from './businessSettingsWorkspaceStyles';
