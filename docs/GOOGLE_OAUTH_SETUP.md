# Google OAuth — Kurulum checklist

isteBul kodu hazır: `GOOGLE_OAUTH_ENABLED=true` iken giriş modalında **Google ile devam et** görünür. Aşağıdaki adımlar Supabase + Google Cloud içindir.

## 1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → proje seçin veya oluşturun.
2. **APIs & Services → OAuth consent screen**
   - User type: External (veya Internal kurumsal workspace)
   - App name: `isteBul`
   - Support email, logo (opsiyonel), scopes: `email`, `profile`, `openid`
3. **Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `https://www.istebul.com`
     - `https://istebul.com`
     - `http://localhost:3000` (yerel test)
   - Authorized redirect URIs:
     - `https://hjfrcdstbyonmgatgwcc.supabase.co/auth/v1/callback`
     - (Supabase Dashboard → Auth → URL Configuration’daki callback URL ile birebir aynı olmalı)
4. **Client ID** ve **Client Secret** kopyalayın.

## 2. Supabase Dashboard

1. **Authentication → Providers → Google** → Enable.
2. Client ID / Secret yapıştırın.
3. **Authentication → URL Configuration**
   - Site URL: `https://www.istebul.com`
   - Redirect URLs (allow list):
     - `https://www.istebul.com/**`
     - `https://www.istebul.com`
     - `http://localhost:3000/**` (geliştirme)
4. **Authentication → Providers → Email** — e-posta ile giriş açık kalsın (fallback).

## 3. Cloudflare Pages (production build)

**Settings → Environment variables → Production:**

| Variable | Değer |
|----------|--------|
| `GOOGLE_OAUTH_ENABLED` | `true` |
| `SUPABASE_URL` | (mevcut) |
| `SUPABASE_ANON_KEY` | (mevcut) |

`env.js` build sırasında `GOOGLE_OAUTH_ENABLED` değerini alır.

## 4. Doğrulama

1. https://www.istebul.com → **Giriş Yap**
2. **Google ile devam et** → Google hesabı → siteye dönüş
3. Oturum açık: header’da Dashboard / Seçeneklerim (giriş sonrası nav)
4. `/profil/` erişilebilir
5. URL’de `#access_token` veya `?code=` kalmamalı (temizlenir)

## 5. Sorun giderme

| Belirti | Çözüm |
|---------|--------|
| Buton görünmüyor | `GOOGLE_OAUTH_ENABLED` production’da `true` mu? Yeni deploy alındı mı? |
| redirect_uri_mismatch | Google Console redirect URI = Supabase callback URL |
| Oturum açılmıyor | Site URL / Redirect URLs Supabase’te eksik |
| 403 / CORS | Origins listesine `www` ve apex domain ekleyin |

## Kod referansları

- `js/features/auth/auth.js` — `signInWithGoogle()`, `getGoogleOAuthBlock()`
- `js/runtime/auth-oauth-callback.js` — dönüş URL temizliği
- `js/core/supabase.js` — `detectSessionInUrl: true`
