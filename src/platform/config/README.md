# config

Platform Shell yapılandırması ve platform kimliği.

## Bu PR’da (PR-002)

| Dosya | İçerik |
|-------|--------|
| `platform-identity.ts` | `PLATFORM_IDENTITY`, `PLATFORM_CATALOG` (`wiredToRuntime: false`) |

## Kurallar

- Varsayılan: katalog **çalışma zamanına bağlı değildir**.
- Bu klasör `_redirects`, `wrangler.toml`, `server.cjs` veya SEO dosyalarını değiştirmez.
- Etkin UI bağlantısı ayrı onaylı PR ister.
