/**
 * Business Settings Workspace Runtime — PR-202E (en az 50 unit test)
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(
  pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href
);

const {
  createBusinessAdminRuntime,
  createBusinessAdminContext,
  createBusinessSettingsWorkspaceRuntime,
  createBusinessSettingsWorkspaceRegistry,
  createBusinessSettingsWorkspaceContext,
  validateBusinessSettingsWorkspaceContext,
  resolveRequestedBusinessSettingsWidgets,
  projectBusinessSettingsWorkspaceWidget,
  projectBusinessSettingsWorkspaceWidgets,
  buildBusinessSettingsWorkspaceSummary,
  buildBusinessSettingsWorkspaceSummaryItems,
  toEmptyBusinessSettingsWidgetProjection,
  BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGETS,
  BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGET_COUNT,
  getBuiltinBusinessSettingsWorkspaceWidget,
  PIPELINE_BAG_BUSINESS_SETTINGS_WORKSPACE_RESULT_KEY,
  createBusinessSettingsWorkspaceLayout,
  BUSINESS_SETTINGS_WORKSPACE_CSS
} = await import('../../src/business-admin/index.ts');

function sampleBusinessSettings(overrides = {}) {
  return {
    tenantId: 'tenant-1',
    profile: {
      businessName: 'Demo İşletme',
      displayName: 'Demo',
      legalName: 'Demo A.Ş.',
      taxId: '1234567890',
      industry: 'technology',
      website: 'https://demo.example'
    },
    organization: {
      organizationName: 'Demo Org',
      countryCode: 'TR',
      city: 'İstanbul',
      addressLine: 'Kadıköy',
      employeeCountBand: '11-50'
    },
    branding: {
      primaryColor: '#1d4ed8',
      secondaryColor: '#0f172a',
      logoLabel: 'demo-logo',
      faviconLabel: 'demo-favicon',
      themeMode: 'light'
    },
    localization: {
      defaultLocale: 'tr',
      timezone: 'Europe/Istanbul',
      currency: 'TRY',
      dateFormat: 'DD.MM.YYYY'
    },
    notifications: {
      emailEnabled: true,
      pushEnabled: false,
      weeklyDigest: true,
      securityAlerts: true
    },
    aiPreferences: {
      assistantEnabled: true,
      autoSummarize: true,
      preferredTone: 'profesyonel',
      maxTokensPerRequest: 2048
    },
    updatedAt: '2026-07-22T00:00:00.000Z',
    ...overrides
  };
}

describe('BusinessSettingsWorkspaceRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = createBusinessSettingsWorkspaceRegistry(true);
  });

  it('seeds all 7 builtin sections', () => {
    assert.equal(registry.count(), 7);
    assert.equal(BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGET_COUNT, 7);
    assert.equal(BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGETS.length, 7);
  });

  it('returns sections sorted by order', () => {
    const widgets = registry.getAll();
    assert.equal(widgets[0].id, 'business-profile');
    assert.equal(widgets[widgets.length - 1].id, 'workspace-summary');
    for (let i = 1; i < widgets.length; i++) {
      assert.ok(widgets[i].order >= widgets[i - 1].order);
    }
  });

  it('getById returns branding section', () => {
    const widget = registry.getById('branding');
    assert.ok(widget);
    assert.equal(widget.name, 'Branding');
    assert.equal(widget.kind, 'branding');
  });

  it('getBuiltinBusinessSettingsWorkspaceWidget resolves ai-preferences', () => {
    const widget = getBuiltinBusinessSettingsWorkspaceWidget('ai-preferences');
    assert.ok(widget);
    assert.equal(widget.name, 'AI Preferences');
  });

  it('register adds a new section', () => {
    registry.register({
      id: 'custom-section',
      name: 'Custom',
      description: 'Test',
      order: 99,
      kind: 'summary',
      status: 'coming-soon',
      visible: false
    });
    assert.equal(registry.count(), 8);
    assert.ok(registry.getById('custom-section'));
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGETS[0]),
      /zaten kayıtlı/
    );
  });

  it('register throws on missing id', () => {
    assert.throws(
      () =>
        registry.register({
          id: '',
          name: 'X',
          description: 'Y',
          order: 1,
          kind: 'profile',
          status: 'active',
          visible: true
        }),
      /id zorunludur/
    );
  });

  it('register throws on missing name', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'x',
          name: '',
          description: 'Y',
          order: 1,
          kind: 'profile',
          status: 'active',
          visible: true
        }),
      /name zorunludur/
    );
  });

  it('unregister removes a section', () => {
    assert.ok(registry.unregister('localization'));
    assert.equal(registry.count(), 6);
    assert.equal(registry.getById('localization'), undefined);
  });

  it('getByKind filters profile sections', () => {
    const profiles = registry.getByKind('profile');
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0].id, 'business-profile');
  });

  it('getVisible returns active visible sections', () => {
    assert.equal(registry.getVisible().length, 7);
  });

  it('clear empties the registry', () => {
    registry.clear();
    assert.equal(registry.count(), 0);
  });
});

describe('BusinessSettingsWorkspaceContext', () => {
  it('defaults locale to tr', () => {
    const ctx = createBusinessSettingsWorkspaceContext({
      tenantId: 'tenant-1'
    });
    assert.equal(ctx.locale, 'tr');
    assert.equal(ctx.tenantId, 'tenant-1');
  });

  it('accepts businessSettings and en locale', () => {
    const settings = sampleBusinessSettings();
    const ctx = createBusinessSettingsWorkspaceContext({
      tenantId: 'tenant-1',
      locale: 'en',
      businessSettings: settings
    });
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.businessSettings?.profile.businessName, 'Demo İşletme');
  });
});

describe('validateBusinessSettingsWorkspaceContext', () => {
  let registry;

  beforeEach(() => {
    registry = createBusinessSettingsWorkspaceRegistry(true);
  });

  it('passes for valid context', () => {
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({ tenantId: 'tenant-1' }),
      registry
    );
    assert.equal(issues.length, 0);
  });

  it('passes for valid context with businessSettings', () => {
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: sampleBusinessSettings()
      }),
      registry
    );
    assert.equal(issues.length, 0);
  });

  it('errors on missing tenantId', () => {
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({ tenantId: '  ' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'MISSING_TENANT_ID'));
  });

  it('errors on invalid business settings profile', () => {
    const settings = sampleBusinessSettings({
      profile: { businessName: '' }
    });
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: settings
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_BUSINESS_SETTINGS_PROFILE'));
  });

  it('errors on invalid organization name', () => {
    const settings = sampleBusinessSettings();
    settings.organization = {
      ...settings.organization,
      organizationName: ''
    };
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: settings
      }),
      registry
    );
    assert.ok(
      issues.some((i) => i.code === 'INVALID_BUSINESS_SETTINGS_ORGANIZATION')
    );
  });

  it('errors on invalid country code', () => {
    const settings = sampleBusinessSettings();
    settings.organization = { ...settings.organization, countryCode: '' };
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: settings
      }),
      registry
    );
    assert.ok(
      issues.some((i) => i.code === 'INVALID_BUSINESS_SETTINGS_COUNTRY')
    );
  });

  it('errors on invalid localization locale', () => {
    const settings = sampleBusinessSettings({
      localization: { defaultLocale: 'de' }
    });
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: settings
      }),
      registry
    );
    assert.ok(
      issues.some((i) => i.code === 'INVALID_BUSINESS_SETTINGS_LOCALIZATION')
    );
  });

  it('errors when notifications missing', () => {
    const settings = sampleBusinessSettings({ notifications: undefined });
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: settings
      }),
      registry
    );
    assert.ok(
      issues.some((i) => i.code === 'INVALID_BUSINESS_SETTINGS_NOTIFICATIONS')
    );
  });

  it('errors when aiPreferences missing', () => {
    const settings = sampleBusinessSettings({ aiPreferences: undefined });
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: settings
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_BUSINESS_SETTINGS_AI'));
  });

  it('errors when branding missing', () => {
    const settings = sampleBusinessSettings({ branding: undefined });
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: settings
      }),
      registry
    );
    assert.ok(
      issues.some((i) => i.code === 'INVALID_BUSINESS_SETTINGS_BRANDING')
    );
  });

  it('warns on tenant id mismatch', () => {
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: sampleBusinessSettings({ tenantId: 'other' })
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'TENANT_ID_MISMATCH'));
  });

  it('warns on unknown widget id', () => {
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['business-profile', 'ghost']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_WIDGET_ID'));
  });

  it('warns on empty widgetIds', () => {
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: []
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_WIDGET_IDS'));
  });

  it('warns on duplicate widget ids', () => {
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['business-profile', 'business-profile']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'DUPLICATE_WIDGET_ID'));
  });

  it('warns on empty actorId', () => {
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        actorId: '   '
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_ACTOR_ID'));
  });

  it('warns when upstream business admin lacks business-settings module', () => {
    const admin = createBusinessAdminRuntime().execute(
      createBusinessAdminContext({
        tenantId: 'tenant-1',
        moduleIds: ['users']
      })
    );
    const issues = validateBusinessSettingsWorkspaceContext(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessAdminResult: admin
      }),
      registry
    );
    assert.ok(
      issues.some((i) => i.code === 'BUSINESS_SETTINGS_MODULE_NOT_PROJECTED')
    );
  });
});

describe('resolveRequestedBusinessSettingsWidgets', () => {
  let registry;

  beforeEach(() => {
    registry = createBusinessSettingsWorkspaceRegistry(true);
  });

  it('returns all sections when widgetIds omitted', () => {
    const { widgets, requestedCount, unavailableCount } =
      resolveRequestedBusinessSettingsWidgets(
        createBusinessSettingsWorkspaceContext({ tenantId: 'tenant-1' }),
        registry
      );
    assert.equal(widgets.length, 7);
    assert.equal(requestedCount, 7);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested section ids', () => {
    const { widgets, unavailableCount } =
      resolveRequestedBusinessSettingsWidgets(
        createBusinessSettingsWorkspaceContext({
          tenantId: 'tenant-1',
          widgetIds: ['business-profile', 'branding']
        }),
        registry
      );
    assert.equal(widgets.length, 2);
    assert.equal(unavailableCount, 0);
    assert.deepEqual(
      widgets.map((w) => w.id),
      ['business-profile', 'branding']
    );
  });

  it('counts unavailable sections', () => {
    const { widgets, unavailableCount } =
      resolveRequestedBusinessSettingsWidgets(
        createBusinessSettingsWorkspaceContext({
          tenantId: 'tenant-1',
          widgetIds: ['business-profile', 'missing']
        }),
        registry
      );
    assert.equal(widgets.length, 1);
    assert.equal(unavailableCount, 1);
  });
});

describe('Workspace Projection', () => {
  it('projects empty sections without businessSettings', () => {
    const def = getBuiltinBusinessSettingsWorkspaceWidget('business-profile');
    assert.ok(def);
    const projection = projectBusinessSettingsWorkspaceWidget(
      def,
      createBusinessSettingsWorkspaceContext({ tenantId: 'tenant-1' })
    );
    assert.equal(projection.projected, true);
    assert.equal(projection.itemCount, 0);
    assert.equal(projection.profile, undefined);
  });

  it('projects business-profile from BusinessSettings', () => {
    const def = getBuiltinBusinessSettingsWorkspaceWidget('business-profile');
    assert.ok(def);
    const projection = projectBusinessSettingsWorkspaceWidget(
      def,
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: sampleBusinessSettings()
      })
    );
    assert.ok(projection.profile);
    assert.equal(projection.profile.businessName, 'Demo İşletme');
    assert.equal(projection.title, 'Demo');
    assert.ok(projection.itemCount >= 5);
  });

  it('projects organization from BusinessSettings', () => {
    const def = getBuiltinBusinessSettingsWorkspaceWidget('organization');
    assert.ok(def);
    const projection = projectBusinessSettingsWorkspaceWidget(
      def,
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: sampleBusinessSettings()
      })
    );
    assert.ok(projection.organization);
    assert.equal(projection.organization.countryCode, 'TR');
    assert.ok(projection.fields.some((f) => f.id === 'city'));
  });

  it('projects branding from BusinessSettings', () => {
    const def = getBuiltinBusinessSettingsWorkspaceWidget('branding');
    assert.ok(def);
    const projection = projectBusinessSettingsWorkspaceWidget(
      def,
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: sampleBusinessSettings()
      })
    );
    assert.ok(projection.branding);
    assert.equal(projection.branding.primaryColor, '#1d4ed8');
    assert.equal(projection.branding.themeMode, 'light');
  });

  it('projects localization from BusinessSettings', () => {
    const def = getBuiltinBusinessSettingsWorkspaceWidget('localization');
    assert.ok(def);
    const projection = projectBusinessSettingsWorkspaceWidget(
      def,
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: sampleBusinessSettings()
      })
    );
    assert.ok(projection.localization);
    assert.equal(projection.localization.defaultLocale, 'tr');
    assert.equal(projection.localization.currency, 'TRY');
  });

  it('projects notification-preferences from BusinessSettings', () => {
    const def = getBuiltinBusinessSettingsWorkspaceWidget(
      'notification-preferences'
    );
    assert.ok(def);
    const projection = projectBusinessSettingsWorkspaceWidget(
      def,
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: sampleBusinessSettings()
      })
    );
    assert.ok(projection.notifications);
    assert.equal(projection.notifications.emailEnabled, true);
    assert.equal(projection.notifications.pushEnabled, false);
    assert.equal(projection.itemCount, 4);
  });

  it('projects ai-preferences from BusinessSettings', () => {
    const def = getBuiltinBusinessSettingsWorkspaceWidget('ai-preferences');
    assert.ok(def);
    const projection = projectBusinessSettingsWorkspaceWidget(
      def,
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: sampleBusinessSettings()
      })
    );
    assert.ok(projection.aiPreferences);
    assert.equal(projection.aiPreferences.assistantEnabled, true);
    assert.equal(projection.aiPreferences.maxTokensPerRequest, 2048);
  });

  it('projects workspace-summary execution info', () => {
    const def = getBuiltinBusinessSettingsWorkspaceWidget('workspace-summary');
    assert.ok(def);
    const projection = projectBusinessSettingsWorkspaceWidget(
      def,
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: sampleBusinessSettings()
      })
    );
    assert.ok(projection.execution);
    assert.equal(projection.execution.hasBusinessSettings, true);
    assert.equal(projection.execution.sectionCount, 6);
    assert.equal(projection.execution.filledSectionCount, 6);
  });

  it('workspace-summary without settings reports zero filled', () => {
    const def = getBuiltinBusinessSettingsWorkspaceWidget('workspace-summary');
    assert.ok(def);
    const projection = projectBusinessSettingsWorkspaceWidget(
      def,
      createBusinessSettingsWorkspaceContext({ tenantId: 'tenant-1' })
    );
    assert.ok(projection.execution);
    assert.equal(projection.execution.hasBusinessSettings, false);
    assert.equal(projection.execution.filledSectionCount, 0);
  });

  it('toEmptyBusinessSettingsWidgetProjection marks active visible', () => {
    const def = getBuiltinBusinessSettingsWorkspaceWidget('business-profile');
    assert.ok(def);
    const projection = toEmptyBusinessSettingsWidgetProjection(def);
    assert.equal(projection.visible, true);
    assert.equal(projection.projected, true);
  });

  it('projectBusinessSettingsWorkspaceWidgets returns frozen list of 7', () => {
    const registry = createBusinessSettingsWorkspaceRegistry(true);
    const projections = projectBusinessSettingsWorkspaceWidgets(
      registry.getAll(),
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: sampleBusinessSettings()
      })
    );
    assert.equal(projections.length, 7);
    assert.ok(Object.isFrozen(projections));
  });
});

describe('Workspace Summary', () => {
  it('counts visible settings sections excluding summary', () => {
    const registry = createBusinessSettingsWorkspaceRegistry(true);
    const projections = projectBusinessSettingsWorkspaceWidgets(
      registry.getAll(),
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: sampleBusinessSettings()
      })
    );
    const summary = buildBusinessSettingsWorkspaceSummary(
      projections,
      7,
      0,
      false,
      'tenant-1',
      true
    );
    assert.equal(summary.visibleSettingsSectionCount, 6);
    assert.equal(summary.visibleWidgetCount, 7);
    assert.equal(summary.success, true);
  });

  it('buildBusinessSettingsWorkspaceSummaryItems includes section count and actor', () => {
    const summary = buildBusinessSettingsWorkspaceSummary(
      [],
      0,
      0,
      true,
      'tenant-9',
      true
    );
    const items = buildBusinessSettingsWorkspaceSummaryItems(
      summary,
      'en',
      'actor-1'
    );
    assert.ok(items.some((i) => i.key === 'tenant-id' && i.value === 'tenant-9'));
    assert.ok(
      items.some(
        (i) => i.key === 'visible-settings-section-count' && i.value === 0
      )
    );
    assert.ok(items.some((i) => i.key === 'actor-id' && i.value === 'actor-1'));
    assert.ok(
      items.some((i) => i.key === 'has-business-settings' && i.value === true)
    );
  });
});

describe('BusinessSettingsWorkspaceRuntime', () => {
  let runtime;

  beforeEach(() => {
    runtime = createBusinessSettingsWorkspaceRuntime();
  });

  it('executes full pipeline and returns BusinessSettingsWorkspaceResult', () => {
    const result = runtime.execute(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: sampleBusinessSettings()
      })
    );
    assert.equal(result.widgets.length, 7);
    assert.equal(result.summary.success, true);
    assert.equal(result.summary.hasBusinessSettings, true);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.summaryItems.length > 0);
  });

  it('records telemetry with duration, visible sections, summary items', () => {
    const result = runtime.execute(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        businessSettings: sampleBusinessSettings()
      })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.visibleSettingsSectionCount, 6);
    assert.equal(
      result.telemetry.summaryItemCount,
      result.summaryItems.length
    );
  });

  it('filters sections by widgetIds', () => {
    const result = runtime.execute(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['business-profile', 'workspace-summary']
      })
    );
    assert.equal(result.widgets.length, 2);
    assert.deepEqual(
      result.widgets.map((w) => w.widgetId),
      ['business-profile', 'workspace-summary']
    );
    assert.equal(result.telemetry.visibleSettingsSectionCount, 1);
  });

  it('reports unavailable count for unknown widget ids', () => {
    const result = runtime.execute(
      createBusinessSettingsWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['business-profile', 'ghost']
      })
    );
    assert.equal(result.summary.unavailableCount, 1);
    assert.equal(result.widgets.length, 1);
  });

  it('exports pipeline bag key constant', () => {
    assert.equal(
      PIPELINE_BAG_BUSINESS_SETTINGS_WORKSPACE_RESULT_KEY,
      'businessSettingsWorkspaceResult'
    );
  });

  it('exposes registry via getRegistry', () => {
    assert.equal(runtime.getRegistry().count(), 7);
  });

  it('marks unsuccessful when tenantId missing', () => {
    const result = runtime.execute(
      createBusinessSettingsWorkspaceContext({ tenantId: '' })
    );
    assert.equal(result.summary.success, false);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'MISSING_TENANT_ID')
    );
  });

  it('works without businessSettings (skeleton projection)', () => {
    const result = runtime.execute(
      createBusinessSettingsWorkspaceContext({ tenantId: 'tenant-1' })
    );
    assert.equal(result.summary.hasBusinessSettings, false);
    assert.equal(result.widgets.length, 7);
    assert.ok(result.widgets.every((w) => w.projected === true));
  });
});

describe('Responsive layout skeleton', () => {
  it('exports non-empty responsive CSS with mobile breakpoint', () => {
    assert.ok(BUSINESS_SETTINGS_WORKSPACE_CSS.includes('.ib-ba-sw'));
    assert.ok(
      BUSINESS_SETTINGS_WORKSPACE_CSS.includes('@media (max-width: 640px)')
    );
  });

  it('createBusinessSettingsWorkspaceLayout builds all UI regions', () => {
    const previousDocument = globalThis.document;

    class FakeElement {
      constructor(tagName) {
        this.tagName = String(tagName).toUpperCase();
        this.className = '';
        this.textContent = '';
        this.children = [];
        this.attributes = new Map();
      }
      setAttribute(name, value) {
        this.attributes.set(name, value);
      }
      append(...nodes) {
        this.children.push(...nodes);
      }
    }

    globalThis.document = {
      createElement(tag) {
        return new FakeElement(tag);
      }
    };

    try {
      const result = createBusinessSettingsWorkspaceRuntime().execute(
        createBusinessSettingsWorkspaceContext({
          tenantId: 'tenant-1',
          businessSettings: sampleBusinessSettings()
        })
      );
      const layout = createBusinessSettingsWorkspaceLayout(result);
      assert.equal(layout.className, 'ib-ba-sw');
      assert.equal(layout.children.length, 8);
      assert.equal(layout.children[0].className, 'ib-ba-sw__header');
      assert.equal(layout.children[1].className, 'ib-ba-sw__profile');
      assert.equal(layout.children[2].className, 'ib-ba-sw__organization');
      assert.equal(layout.children[3].className, 'ib-ba-sw__branding');
      assert.equal(layout.children[4].className, 'ib-ba-sw__localization');
      assert.equal(layout.children[5].className, 'ib-ba-sw__notifications');
      assert.equal(layout.children[6].className, 'ib-ba-sw__ai');
      assert.equal(layout.children[7].className, 'ib-ba-sw__summary');
    } finally {
      globalThis.document = previousDocument;
    }
  });
});
