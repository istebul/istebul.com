/** Route-scoped lazy loaders — keep homepage bundle lean. */
let revenueModule = null;
let revenuePending = null;
let accountModule = null;
let accountPending = null;
let catalogModule = null;
let catalogPending = null;
let upsellModule = null;
let upsellPending = null;
let trustPanelModule = null;
let trustPanelPending = null;

export function getRevenueManager() {
  return revenueModule?.revenueManager || null;
}

export async function ensureRevenueManager() {
  if (revenueModule?.revenueManager) return revenueModule.revenueManager;
  if (!revenuePending) {
    revenuePending = import('../features/monetization/revenue-manager.js').then((mod) => {
      revenueModule = mod;
      return mod.revenueManager;
    });
  }
  return revenuePending;
}

export async function ensureAccountManager(ui, auth) {
  if (accountModule?.manager) return accountModule.manager;
  if (!accountPending) {
    accountPending = import('../features/account/account.js').then((mod) => {
      const manager = new mod.default(ui, auth);
      accountModule = { manager, AccountManager: mod.default };
      return manager;
    });
  }
  return accountPending;
}

export async function ensureCatalogData() {
  if (catalogModule) return catalogModule;
  if (!catalogPending) {
    catalogPending = Promise.all([
      import('../data/catalog.js'),
      import('../data/market-data.js')
    ]).then(([catalog, marketData]) => {
      catalogModule = { catalog, marketData };
      return catalogModule;
    });
  }
  return catalogPending;
}

export async function ensureUpsellEngine() {
  if (upsellModule) return upsellModule;
  if (!upsellPending) {
    upsellPending = import('../features/monetization/upsell-engine.js');
  }
  upsellModule = await upsellPending;
  return upsellModule;
}

export async function renderTrustLayerCompact(surface) {
  if (!trustPanelModule) {
    trustPanelPending =
      trustPanelPending ||
      import('../features/moat/decision-insight-panels.js').then((mod) => {
        trustPanelModule = mod;
        return mod;
      });
    trustPanelModule = await trustPanelPending;
  }
  return trustPanelModule.renderTrustLayerCompact(surface);
}

export async function renderHomePricingTeaser(revenueManager) {
  const { renderHomePricingTeaser: renderTeaser } = await import(
    '../features/monetization/pricing-home-teaser.js'
  );
  return renderTeaser(revenueManager);
}
