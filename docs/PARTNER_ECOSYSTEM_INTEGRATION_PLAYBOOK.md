# isteBul — Partner Ekosistemi Entegrasyon ve Outreach Playbook

**Amaç:** Stripe sonrası gelir çeşitlendirme — taşıt kredisi, sigorta/kasko, değerleme, ilan, ekspertiz ve alternatif ödeme (iyzico, PayTR, Param) partnerlerine **adım adım** başvuru, teknik bağlantı ve ikna.

**Mevcut altyapı (değiştirmeyin):** Partner webhook (`partner-onboarding`, `partner-application`), HMAC dispatch, admin CRM, Auto lead skoru. Yeni entegrasyonlar bu hatta **yeni `partner_route` / kategori** olarak eklenir.

---

## 1) Ortak hazırlık (sizin taraf)

| Adım | Ne yapın |
|------|----------|
| 1 | `https://www.istebul.com/partner-docs.html` ve `/partner-basvuru.html` — canlı demo |
| 2 | 1 sayfalık “Pilot teklif”: ilk 5 hot lead ücretsiz, HMAC webhook, KVKK özeti |
| 3 | Örnek payload + imza konsolu (docs sayfası) — IT’ye gönderin |
| 4 | Admin’de test partner endpoint + dispatch log ekran görüntüsü |
| 5 | Outcome geri besleme: kapanan satış / red — model kalibrasyonu anlatın |

**İkna cümlesi:** “Liste sitesi değiliz — skorlu, TCO bağlamlı talep. Sizin CRM’inize imzalı JSON; spam form değil.”

---

## 2) Taşıt kredisi — bankalar

### Hedef kurumlar
- Garanti BBVA, Akbank, İş Bankası, QNB, Yapı Kredi (taşıt / tüketici kredisi dijital kanalları)

### Başvuru kanalı (sıra)
1. **Kurumsal / fintech partner portalı** — “API partner”, “open banking”, “marketplace lending”
2. **Dijital kanal / mobil bankacılık ürün** — tüketici kredisi PM
3. **Bayi / otomotiv finansman** birimi — galeri lead programları
4. LinkedIn: “Head of Automotive Finance”, “Digital Lending Partnerships”

### Teknik bağlantı (genel model)
| Banka tipi | Tipik yol | isteBul tarafı |
|------------|-----------|----------------|
| Büyük banka | REST lead API veya SFTP + şema | Webhook payload’ı banka şemasına map; ayrı `partner_route: finance_*` |
| Orta ölçek | E-posta + portal | Pilot: webhook → middleware → manuel upload (geçici) |
| Open API | OAuth2 client credentials | Supabase Edge Function’da token refresh + rate limit |

**Adımlar:**
1. NDA + KVKK veri işleme sözleşmesi (DPA).
2. Sandbox URL + test secret (`partner-docs` HMAC akışı).
3. Alan eşlemesi: `budget`, `loan`, `vehicle`, `lead_score`, `priority`, `city`.
4. UAT: 10 test lead, 2xx + imza doğrulama.
5. Prod: IP allowlist (banka çıkış IP) + prod secret admin’de.

### İkna
- “Finansman **bağlamında** lead — ham form değil; bütçe ve araç tipi var.”
- “Hot/very_hot öncelik — satış ekibi SLA’sına uygun.”
- “Outcome callback ile dönüş oranı görünür — CPL optimizasyonu.”

### Reddedilirse
- Daha küçük dijital kredi fintech (Moneypay, Figo vb.) ile pilot → bankaya referans.

---

## 3) Sigorta / Kasko

### Hedef
Allianz, Anadolu Sigorta, Aksigorta, Sompo, Quick Sigorta, HDI — **dijital partner / aggregator** ekipleri

### Başvuru
- “Insurance API partnership” / “embedded insurance” / “auto insurance lead”
- Otomotiv dikey satış kanalı

### Teknik
- Çoğu: REST quote/bind API veya lead POST.
- isteBul: `interest_type: insurance` / `insurance_partner` route; payload’a `vehicle`, `usage`, `city`, skor.
- KVKK: açık rıza metni Auto sonrası lead capture’da.

### İkna
- “Kasko/trafik cross-sell, TCO analizi sonrası — intent yüksek.”
- “Skor düşükse lead göndermeyin — itibar koruma.”

---

## 4) Araç değerleme

### Hedef
Arabam.com, VavaCars, Otokoç 2. El, DOD, Borusan Next

### Başvuru
- İş geliştirme / veri / API product
- “Decision intelligence” konumlandırma — rakip ilan değil, **ön karar** partneri

### Teknik
- Değerleme API veya batch fiyat bandı → Auto skor katmanına “truth” maliyet.
- Lead karşılığı: değerleme hizmeti veya CPL.

### İkna
- “Kullanıcı karar vermeden önce sizin verinizle TCO — satış öncesi huni.”

---

## 5) İlan partnerleri

### Hedef
sahibinden, arabam (liste / API iş birlikleri)

### Başvuru
- Developer / business API programları
- “Lead quality” veya “affiliate” değil — **karar motoru** OEM

### Teknik
- İlan API read-only → referans; canlı fiyat teklif değil (mevcut ürün diliyle uyumlu).
- Deep link veya UTM’li geri yönlendirme.

### İkna
- “Siz envanter, biz karar skoru — kullanıcı önce isteBul, sonra ilan.”

---

## 6) Ekspertiz

### Hedef
Pilot Garage, Dynobil, TÜV SÜD partner ağı

### Başvuru
- Kurumsal satış / bayi ağı yöneticileri
- Paket: “Auto sonucu + ekspertiz randevu” bundle

### Teknik
- Randevu API veya webhook (lead → bayi atama).
- `partner_route: inspection_partner`

---

## 7) Ödeme — Stripe sonrası iyzico, PayTR, Param

### Neden
- Türkiye’de kart saklama / taksit / yerel acquiring tercihi
- Pro abonelik + ileride marketplace ödeme

### Başvuru sırası
| Sağlayıcı | Başvuru | Tipik süreç |
|-----------|---------|-------------|
| **iyzico** | [iyzico.com](https://www.iyzico.com) → Üye işyeri başvurusu | Şirket evrakları, web sitesi, faaliyet tanımı “yazılım / karar platformu” |
| **PayTR** | paytr.com mağaza başvurusu | Benzer KYC; API dokümanı mağaza panelinde |
| **Param** | param.com.tr kurumsal | POS / sanal POS + API |

### Teknik entegrasyon (mimariyi bozmadan)
1. **Stripe kalır** — mevcut Pro checkout.
2. Yeni: `functions/create-local-checkout` veya checkout sayfasında **ödeme yöntemi seçici**.
3. Webhook’lar ayrı secret: `IYZICO_*`, `PAYTR_*` — Stripe webhook ile karıştırmayın.
4. Supabase `subscriptions` tablosuna `provider` kolonu (migration + RLS aynı user scope).

### İkna (ödeme kuruluşuna)
- “SaaS + dijital hizmet; yüksek chargeback riski yok; net KVKK ve iade politikası.”
- “Aylık tekrarlayan Pro abonelik hacmi hedefi: X (gerçekçi rakam).”

### Kullanıcıya ikna
- “Kartınız Stripe/iyzico altyapısıyla güvenli işlenir” — footer’da sağlayıcı logosu (sözleşme sonrası).

---

## 8) Outbound e-posta şablonu (kısa)

**Konu:** Skorlu otomotiv talep — webhook pilot (isteBul)

Merhaba [İsim],

isteBul, araç alımında TCO ve uyum skoruna dayalı karar platformu. İlan listesi değil; **nitelikli B2B lead** webhook ile CRM’inize düşer (HMAC, retry, log).

- Pilot: 5 hot lead ücretsiz  
- Dokümantasyon: https://www.istebul.com/partner-docs.html  
- Başvuru: https://www.istebul.com/partner-basvuru.html  

15 dk teknik görüşme için uygun musunuz?

---

## 9) Başarı metrikleri (partner başına)

| Metrik | Hedef (pilot) |
|--------|----------------|
| Webhook 2xx oranı | > %98 |
| Medyan yanıt süresi | < 3 sn |
| Lead → görüşme | Partner bildirir (callback) |
| Lead → satış | 30 gün içinde outcome |
| CPL / CAC | Birim ekonomi tablosunda |

---

## 10) Yasal kontrol listesi

- [ ] KVKK DPA imzalı  
- [ ] Açık rıza metni lead alanlarında  
- [ ] Bağlayıcı teklif / getiri vaadi yok (mevcut copy ile uyumlu)  
- [ ] Banka/sigorta reklam kuralları (varsa onay)  

---

*Bu playbook ürün koduna dokunmadan iş geliştirme ve entegrasyon planlaması içindir. Teknik referans: `docs/partner-webhook-integration.md`.*
