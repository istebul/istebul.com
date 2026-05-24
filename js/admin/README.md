# Admin modules

**Canonical admin:** `admin-panel.html` + `js/admin-panel.js` (CMS, CRM, partners, analytics).

| File | Status |
|------|--------|
| `js/admin-panel.js` | **Production** |
| `js/admin/crm.js` | Deprecated experiment — not imported |
| `js/app.js` `/admin` route | In-app market config editor only |

Mutations and privileged reads go through the `admin-action` edge function (`js/core/admin-client.js`).
