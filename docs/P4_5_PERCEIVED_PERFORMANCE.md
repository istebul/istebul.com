# P4.5 — Performance & perceived speed

Audit-driven improvements for bundle discipline, render path, lazy media, route feel, and loading feedback — without changing product behavior or SEO surfaces.

## Audit summary

| Area | Finding | Action |
|------|---------|--------|
| Bundle | Main SPA ~756 KB (app + chunks); Supabase in async chunk | Keep splitting; modulepreload on app bundle |
| Render blocking | Duplicate CSS on `index.html` (already in `style.css` @import) | Removed extra `<link>` tags |
| CSS preload | Preload `v=51` mismatched live `v=55` | Aligned dev preload; prod injects hashed preload |
| Lazy loading | Auto/comparison had `loading="lazy"`; listings grid did not | Added lazy + `decoding="async"` on listing images |
| Auto flow | Loading step interval 520ms | Reduced to 400ms |
| Route transitions | Instant section swap | `ib-route-enter` + fast main opacity pulse |
| Skeletons | `.ib-skeleton` unused in listings | `loading-skeleton.js` + grid skeleton in `showLoading` |
| Caching | SW v49; hashed assets cache-first | Bumped to v50; image stale-while-revalidate |

## Modules

- `js/core/loading-skeleton.js` — listing / panel skeleton HTML
- `js/runtime/perceived-performance.js` — route paint, Auto prefetch on intent
- `css/p4-5-perceived-performance.css` — transitions + skeleton layout

## SEO / features

- Route bootstrap and `data-ib-route` unchanged (crawler-safe HTML).
- No removal of structured data or canonical/meta pipeline.
- Feature code paths unchanged; only copy/UX timing and asset hints.

## Verify

```bash
npm test
node scripts/p4-perceived-performance-audit.cjs
```
