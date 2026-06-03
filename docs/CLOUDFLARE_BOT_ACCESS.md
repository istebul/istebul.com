# Cloudflare Bot & Monitor Erişimi

## Sorun

Bazı User-Agent / IP kombinasyonları ana sayfada **403 Cloudflare challenge** alırken, `isteBul-production-smoke/1.0` UA ile 200 dönebilir. Bu durum:

- Uptime monitor false alarm
- Googlebot / Bingbot indexleme riski
- Rastgele kullanıcı oturumlarında kötü UX

## Otomatik WAF kuralları (repo)

Production deploy sonrası (Cloudflare Pages başarılıysa) WAF skip kuralları uygulanır:

```bash
# Dry-run (mevcut kuralları listeler)
node scripts/apply-cloudflare-bot-access.cjs

# Canlı uygulama (GitHub Actions veya yerel)
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
  node scripts/apply-cloudflare-bot-access.cjs --apply
```

Oluşturulan kurallar ve `--apply` ile **Bot Fight Mode kapatma** (`fight_mode=false`):

**Gerekli API token izinleri:** `Zone WAF Write`, `Bot Management Write`.

`ISTEBUL_KEEP_BOT_FIGHT_MODE=1` ile BFM kapatma atlanır (yalnızca WAF skip kuralları uygulanır).

| ref | ifade | Amaç |
|-----|--------|------|
| `istebul_skip_verified_bots` | `(cf.client.bot)` | Googlebot / Bingbot vb. |
| `istebul_skip_production_smoke` | UA contains `isteBul-production-smoke` | CI smoke + uptime |

## Bot Fight Mode (Free plan)

**Bot Fight Mode**, WAF custom rules ile **atlanamaz** (Ruleset Engine dışında çalışır). Skip kuralları **Super Bot Fight Mode** (Pro+) ve managed WAF için geçerlidir.

BFM açıksa ve Googlebot hâlâ 403 alıyorsa:

1. **Security → Settings → Bot traffic** — Bot Fight Mode'u kapatın **veya**
2. Pro+ planda **Super Bot Fight Mode** açın, Verified bots = Allow, smoke UA için skip kuralı ekleyin

## Manuel dashboard ayarları

Cloudflare Dashboard → **isteBul.com** → **Security** → **WAF** / **Bots**

1. **Verified Bots** — Allow (Googlebot, Bingbot, Applebot)
2. **Bot Fight Mode** — BFM kullanıyorsanız smoke/monitor için kapatmayı veya SBFM'e geçmeyi değerlendirin
3. **Custom rule (skip)** — önerilen ifadeler:
   - `(http.user_agent contains "isteBul-production-smoke")` → Skip all remaining rules + SBFM
   - `(cf.client.bot)` → Skip (Verified Bots)
4. **Rate limiting** — `/api/*` için ayrı; statik HTML için geniş limit

## Repo içi doğrulama

```bash
node scripts/verify-bot-access.cjs https://www.istebul.com
```

Production deploy workflow (`smoke-live`) smoke UA kullanır. `verify-bot-access` CI'da uyarı üretir; Googlebot 403 ise dashboard veya `--apply` script kontrol edin.

## Referans

- `scripts/apply-cloudflare-bot-access.cjs` — WAF skip kuralları (API)
- `scripts/smoke-live.cjs` — smoke UA tanımı
- `.github/workflows/production-deploy.yml` — post-deploy smoke + bot access job
