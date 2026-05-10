# Kalite, Güvenlik ve Yayın Kontrol Listesi

## Test ve kalite kontrol

- Unit test: `npm run test:unit`
- Smoke test: `npm run test:smoke`
- E2E test: `npm run test:e2e`
- Cross-browser: Playwright `chromium`, `firefox`, `webkit`, `mobile-chrome` projeleri
- Build doğrulama: `npm run build && npm run build:check`

## Performans hedefleri

- Lighthouse Performance: 90+
- Lighthouse Accessibility: 90+
- Lighthouse Best Practices: 90+
- Lighthouse SEO: 90+
- Büyük görsellerde `loading="lazy"`, `decoding="async"`
- İlan listelerinde sayfalama veya infinite scroll uygulanmalı
- Bundle büyümesi `npm run analyze:bundle` çıktısıyla izlenmeli

## OWASP kontrolleri

- XSS: HTML çıktılarını `escapeHtml` ve URL çıktısını `safeUrl` ile üret
- Injection: Supabase arama terimlerini sanitize et
- Auth: Netlify fonksiyonlarında Bearer token zorunlu olmalı
- Authorization: İlan güncelleme/silme işleminde `user_id` sahipliği kontrol edilmeli
- Rate limiting: AI ve upload gibi pahalı uçlarda limit uygulanmalı; üretimde paylaşımlı Redis/Upstash, Netlify KV/Blobs veya Supabase sayaç tercih edilmeli
- Secrets: `SUPABASE_SERVICE_ROLE_KEY` ve `CLAUDE_API_KEY` sadece Netlify env içinde tutulmalı

## KVKK/GDPR

- Cookie/analytics consent açık rıza ile alınmalı
- Analytics scriptleri kullanıcı kabulünden önce yüklenmemeli
- Kullanıcıya veri silme ve destek kanalı açıklanmalı
- Analytics araçları IP anonimleştirme ve minimum veri prensibiyle yapılandırılmalı
- Kullanıcı verileri Supabase RLS politikalarıyla korunmalı

## Monitoring

- Üretimde Sentry veya LogRocket DSN env ile etkinleştirilmeli
- Hata raporlarında PII maskelenmeli
- Netlify function logları 5xx ve 429 oranları için izlenmeli

## Beta ve release

- Gerçek kullanıcı beta turu yapılmalı
- A/B test metrikleri: CTA tıklama, karar asistanı tamamlama, ilan formu tamamlama
- Destek geri bildirimi issue veya ürün panosuna işlenmeli

## Production öncesi kalan teknik işler

- `npm audit` bulguları direct/transitive ve dev/prod etkisine göre sınıflandırılmalı
- Playwright E2E için ayrı Supabase test projesi, test kullanıcısı ve seed ilan verisi hazırlanmalı
- Lighthouse CI gerçek deploy URL üzerinde çalıştırılıp 90 altı skorlar için aksiyon alınmalı
- Rate limiting in-memory guardrail olmaktan çıkarılıp paylaşımlı store ile kalıcı hale getirilmeli
- Sentry veya LogRocket DSN üretim ortam değişkeniyle etkinleştirilmeli
