# config

Platform Shell yapılandırması için yer tutucu.

## Gelecek adaylar (henüz yok)

| Anahtar örneği | Amaç |
|----------------|------|
| Kabuk etkinlik bayrağı | Platform Landing / shell’i bilinçli açma (varsayılan kapalı) |
| Hub meta | Başlık, kısa açıklama (Türkçe) |
| Ürün giriş yolları | Salt yönlendirme metadata (route rewrite değil) |

## Kurallar

- PR-001’de yapılandırma dosyası veya çalışan bayrak **yoktur**.
- Varsayılan: kabuk **kapalı / bağlı değil** — kullanıcıya görünmez.
- Bu klasör `_redirects`, `wrangler.toml`, `server.cjs` veya SEO dosyalarını değiştirmez.
- Ortak kimlik / abonelik yapılandırması ileride ayrı onay ve ayrı PR ister.
