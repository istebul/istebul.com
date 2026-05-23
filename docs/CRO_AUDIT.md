# isteBul Conversion Rate Optimization Audit

**Tarih:** 2026-05-23  
**Mindset:** Premium B2C/B2B SaaS — güven, net değer önerisi, sürtünmesiz ana dönüşüm (Auto analiz + lead), ikincil dönüşüm (Pro abonelik).

## Executive summary

| Funnel | Birincil CTA | Kritik sızıntı | Öncelik |
|--------|--------------|----------------|---------|
| Ana sayfa → Auto | «Ücretsiz Karar Analizine Başla» | Çoklu ürün sinyali (Ev/Tatil sekmeleri), zayıf fiyat görünürlüğü (JS) | P0 |
| Auto wizard → sonuç | 7 adım + lead modal 2 adım | Bilişsel yük, `alert()` validasyon, Turnstile sessiz fail | P0 |
| Pro checkout | Stripe | Login duvarı + e-posta doğrulama döngüsü | P0 |
| Partner | Form gönder | Güven yüzeyi düşük, kişisel e-posta, `env.js` yolu | P1 |
| Kayıt / auth | Üye ol | Terms link yok, checkout sonrası kopuk akış | P0 |

**Bu PR’da uygulanan düzeltmeler** aşağıda «Implemented fixes» bölümünde listelenmiştir.

---

## 1. Trust leaks

| Bulgu | Etki | Öneri / durum |
|-------|------|----------------|
| Hero’da Ev/Tatil önizleme sekmeleri, CTA yalnızca `/auto` | Yanlış ürün vaadi, güven kaybı | Sekmeler kaldırıldı; tek odak «Araç» |
| «Bu ay birçok kullanıcı…» sosyal kanıt belirsiz | Zayıf kanıt | Sayı veya «Beta» şeffaflığı eklenebilir (gelecek) |
| Partner sayfasında KVKK/trust rail yok | B2B güven düşük | Trust rail + kurumsal iletişim |
| Kişisel Gmail partner footer’da | Kurumsal algı zayıflar | Kaldırıldı → `/iletisim.html` |
| Cookie reddi → analytics kapalı | Ölçüm kör; CRO optimizasyonu zor | Banner metni iyileştirildi; funnel için minimal event stratejisi dokümante |

## 2. CTA weakness

| Konum | Sorun | İyileştirme |
|-------|--------|-------------|
| Nav | «Üye Ol» birincil, değer «Analiz» değil | Auto analiz vurgusu, sticky mobil CTA |
| Hero | 3 CTA eşit ağırlık | Birincil: analiz; ikincil: nasıl çalışır |
| Auto Pro strip | `/profil/?upgrade` detour | `/#pricing` + checkout intent |
| Pricing | JS olmadan plan yok | `<noscript>` fallback fiyat özeti |
| Lead modal | «Devam et» ekstra tıklama | Tek adımlı form + güven maddeleri |

## 3. Form friction

| Form | Sürtünme | İyileştirme |
|------|----------|-------------|
| Auto wizard | 7 adım | İleride 5’e indirgeme (bütçe+kullanım birleşik) — backlog |
| Lead modal | 2 modal adımı | Tek ekran |
| Kayıt | 4 alan + şifre x2 | Terms/KVKK linkleri, şifre ipucu |
| Partner | Uzun form | Trust + env düzeltmesi |

## 4. Abandonment points

```
Landing → Hero scroll → Pricing (boş/no-JS) → DROP
Auto → Wizard step 3-4 → DROP (ölçüm: auto_wizard_dropoff)
Auto → Sonuç → Pro strip → profil redirect → DROP
Pricing → Checkout → Login → Register → Email verify → DROP
```

**Ölçüm:** `analytics.js` — `auto_wizard_step`, `auto_wizard_dropoff`, `checkout_started`, `auth_*`, `auto_lead_submit`.

## 5. Hesitation triggers

- **Fiyat:** ₺299/ay net değil (JS render) → noscript + risk reversal metni
- **Taahhüt:** «İptal» belirsiz → Stripe + 7 gün deneme vurgusu
- **Veri:** KVKK var; lead’de checkbox iyi — ana kayıtta link eksikti → düzeltildi
- **Zorunlu satın alma:** Lead’de «Zorunlu satın alma yoktur» — korundu

## 6. Cognitive overload

- Ana sayfa: karar asistanı bölümü `hidden`, kategoriler dinamik — odak `/auto` ile sadeleştirildi
- Wizard: 7 adım + gizli `#auto-form` — sync korunuyor; validasyon inline’a alındı
- Önizleme metrikleri: jargon (TCO) — hero’da düz Türkçe açıklama önerilir (copy test)

## 7. Weak messaging / value proposition

**Mevcut:** «Veriye dayalı karar» — soyut.  
**Hedef formül:** [Sonuç] + [Süre] + [Risk azaltma] + [Fiyat çerçevesi]

Örnek: «2 dakikada bütçenize uygun araçları toplam maliyetle karşılaştırın — ücretsiz, KVKK uyumlu.»

**Uygulandı:** Hero alt metin ve proof satırı güçlendirildi.

## 8. Pricing hesitation

| Faktör | Durum |
|--------|--------|
| Plan karşılaştırması | Free vs Pro kartları |
| «3 karşılaştırma» vs limit 2 | Copy düzeltildi → 2 |
| Trial | 7 gün — checkout CTA’da |
| Yıllık tasarruf | %20 — toggle var |
| Ödeme güveni | Stripe metni + risk reversal strip |

## 9. Signup friction

| Adım | Sorun | Fix |
|------|--------|-----|
| Checkout tık | Login modal + hata toast | Register-first gate + `checkout_intent` session |
| Kayıt sonrası | 2sn sonra login’e at | Checkout intent varsa otomatik devam (oturum açıksa) |
| E-posta doğrulama | Stripe blok | Mesaj: ücretsiz analiz `/auto` yolu açık |

---

## Implemented fixes (PR)

1. Checkout intent persistence + register-first auth gate  
2. Login sonrası otomatik checkout resume  
3. Lead modal tek adım  
4. Wizard `alert()` → inline hata banner  
5. Auto Pro CTA → `/#pricing` + checkout intent  
6. Plan copy: 2 karşılaştırma  
7. Pricing risk reversal + noscript fallback  
8. Hero: Ev/Tatil sekmeleri kaldırıldı, değer önerisi güçlendirildi  
9. Mobil sticky CTA  
10. Auth: KVKK/kullanım şartları linkleri, şifre ipucu  
11. Partner: trust rail, env path, kişisel e-posta kaldırıldı  
12. `data-analytics-cta` birincil CTA’larda  
13. Cookie banner: daha net değer değişimi metni  

## Backlog (yüksek etki)

- [ ] Wizard 7 → 5 adım (A/B test)  
- [ ] Post-register magic link / OTP ile anında checkout  
- [ ] Sosyal kanıt: gerçek metrik veya partner logoları  
- [ ] Pricing’de «En popüler» yanında ROI hesaplayıcı widget  
- [ ] Auto’da sonuç sayfasında tek tık WhatsApp (niyet yüksek)  
- [ ] Consent Mode v2 + conversion API (Meta/Google)  
- [ ] Exit-intent modal (desktop) — dikkatli, premium his kaybettirmez  

## KPI önerileri

| Metrik | Tanım |
|--------|--------|
| `auto_start_rate` | `/auto` ziyaret → `auto_form_started` |
| `wizard_completion` | step 1 → `auto_results_rendered` |
| `lead_submit_rate` | sonuç görüntüleme → `auto_lead_submit` |
| `checkout_start_rate` | pricing görünüm → `checkout_started` |
| `paid_conversion` | `checkout_completed` / checkout_started |

---

*Sonraki iterasyon: Search Console / Hotjar / session replay ile abandonment heatmap doğrulaması.*
