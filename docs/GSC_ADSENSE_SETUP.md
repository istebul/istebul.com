# Google Search Console & AdSense — Kurulum

Build sırasında aşağıdaki ortam değişkenleri `dist/env.js`, `ads.txt` ve HTML meta etiketlerine yazılır.

## 1. GitHub / Cloudflare secret’ları

| Secret | Örnek | Etki |
|--------|--------|------|
| `GOOGLE_SITE_VERIFICATION` | `abc123…` (GSC meta content) | Tüm public HTML `<head>` |
| `ADSENSE_PUBLISHER_ID` | `ca-pub-1234567890123456` | `ads.txt` + `/rehber/*` reklam birimleri |
| `ADSENSE_AD_SLOT` | `1234567890` (opsiyonel) | Belirli reklam birimi |

```bash
gh secret set GOOGLE_SITE_VERIFICATION -b"YOUR_META_CONTENT"
gh secret set ADSENSE_PUBLISHER_ID -b"ca-pub-XXXXXXXX"
```

Cloudflare Pages **tek başına** Git bağlantısıyla deploy ediyorsanız aynı değişkenleri Pages → Settings → Environment variables → Production ekleyin.

## 2. Search Console (sizin panel)

1. Mülk: `https://www.istebul.com`
2. Doğrulama: HTML etiketi — secret deploy sonrası otomatik
3. Sitemap: `https://www.istebul.com/sitemap.xml` → Gönder
4. URL denetimi: `/`, `/auto/`, `/rehber/arac-kredisi-hesaplama/`

## 3. AdSense

1. Site onayı için canlı `https://www.istebul.com/ads.txt` satırı gerekir (`ADSENSE_PUBLISHER_ID` dolu olmalı)
2. Reklamlar yalnızca **rehber** statik sayfalarında; ana SPA ve ödeme akışında yok
3. Kullanıcı **Kabul Et** demeden AdSense script yüklenmez

## 4. Deploy sonrası kontrol

```bash
curl -sS https://www.istebul.com/ads.txt | head -3
curl -sS https://www.istebul.com/ | grep google-site-verification
```

`ads.txt` içinde `google.com, pub-` satırı görünmeli; HTML dönmemeli.
