# Bölüm 4 — Canlı veri ve iş ortaklığı rehberi

Bu bölüm, sitenin **%90–95 tamamlanmış** olup yalnızca **canlı veri bağlantılarının** eksik olduğu aşamada iş geliştirme ve görüşme disiplinini anlatır.

---

## 1. “Canlı veri” ne demek?

| Tür | Örnek | Kim bağlar |
|-----|--------|------------|
| **Piyasa verisi** | Faiz oranı, katalog fiyatı, sigorta bandı | Teknik ekip + veri sağlayıcı API |
| **Operasyonel veri** | Lead, ödeme, analitik | Zaten Supabase’de; panelden izlenir |
| **Partner teslimatı** | Webhook ile CRM’e skorlu JSON | Siz + partner IT + teknik ekip |

**Altın kural:** Admin’de **“Canlı sağlayıcı modu”** yalnızca gerçek feed çalışıyorsa açılır. Açıkken feed yoksa — yanıltıcı reklam riski.

---

## 2. Hangi ortaklıklar öncelikli?

### A) Veri ortakları (canlı rakam için)

| Sektör | Örnek kurumlar | Ne istenir |
|--------|----------------|------------|
| Finans / faiz | Hangikredi, banka open API | Güncel faiz veya teklif bandı |
| Otomotiv katalog | Üretici / aggregator API | Liste fiyatı, segment (read-only) |
| Sigorta | Dijital partner ekipleri | Prim bandı veya quote API |
| Konut | Emlak veri sağlayıcıları | Bölge ortalama (anonim istatistik) |

### B) Lead / gelir ortakları

| Sektör | Örnek | Değer |
|--------|--------|--------|
| Taşıt kredisi | Bankalar, dijital kredi | Skorlu, bütçeli talep |
| Sigorta / kasko | Allianz, Anadolu, Quick… | Yüksek niyet cross-sell |
| Galeri / 2. el | Bayi zincirleri | Karar sonrası yönlendirme |
| Tatil | OTA, acente | Senaryolu bütçe lead |

### C) Ödeme (Türkiye)

- **iyzico** (öncelik), PayTR, Param — Pro abonelik tahsilatı  
- Başvuru: şirket evrakları + site URL + faaliyet: *“yazılım / karar platformu”*

---

## 3. Görüşmeye nasıl hazırlanırsınız?

### 3.1 Çanta içeriği (dijital)

1. https://www.istebul.com/partner-docs.html  
2. https://www.istebul.com/partner-guven.html  
3. Admin **teslimat logları** ekran görüntüsü (test lead)  
4. Örnek JSON payload (dokümantasyondaki)  
5. Bu broşürün Bölüm 2 özeti (PDF)

### 3.2 Pilot teklif (standart)

- **İlk 5 hot lead ücretsiz**  
- Webhook HMAC + retry  
- KVKK özeti ve DPA süreci  
- **14 gün** hedef canlı entegrasyon (IT’ye bağlı)

---

## 4. Görüşme akışı (30 dakika)

| Dakika | Siz | Karşı taraf |
|--------|-----|-------------|
| 0–5 | Teşekkür + tek cümle konumlandırma | Dinler |
| 5–12 | Demo: Auto → skor → lead örneği (canlı veya kayıt) | Soru |
| 12–20 | Teknik: webhook, alanlar, KVKK onayı | IT / hukuk |
| 20–25 | Pilot şartları, SLA (≤15 dk dispatch Starter) | Ticari |
| 25–30 | Sonraki adım: NDA, test URL, kickoff tarihi | Takvim |

---

## 5. Ne söylemeli? (ortaklık türüne göre)

### Veri sağlayıcısına

> “Kullanıcılarımız karar verirken tahmin değil, **kaynak doğrulanmış** rakam görmek istiyor. Sizin API veya lisanslı feed’iniz skor motorumuzun ‘truth layer’ına girer; karşılığında trafik ve markalı kaynak gösterimi sunarız. İlan çekmiyoruz; karar sonrası yönlendirme yapıyoruz.”

**Sorulacak:** Sandbox URL, kota, fiyat, yenileme sıklığı, ticari kullanım lisansı.

### Banka / krediye

> “Form dolduran değil — **bütçe, araç tipi, finansman yükü ve skor** ile gelen talep. Hot öncelikli webhook; spam değil. Outcome geri bildirimi ile CPL’yi birlikte optimize ederiz.”

### Sigortaya

> “Kasko/trafik, TCO analizi sonrası — intent yüksek. Düşük skorlu talebi göndermeyebiliriz; itibar koruma.”

### Ödeme kuruluşuna (iyzico vb.)

> “SaaS abonelik; yüksek chargeback riski yok; KVKK ve iade politikası sitede yayında. Aylık tekrarlayan Pro hacmi hedefimiz [gerçekçi rakam].”

---

## 6. Ne söylememelisiniz?

- “Kesin onaylanır”, “garanti en düşük faiz”  
- “SOC2 sertifikalıyız” (yoksa)  
- “Sahibinden’in yerini alıyoruz” (agresif ve yanlış konum)  
- Henüz bağlı olmayan API için “canlı” iddiası  

---

## 7. Reddedilirse / ertelenirse

| Durum | Plan B |
|-------|--------|
| Büyük banka red | Dijital kredi fintech pilotu → referans |
| API yok | Geçici: güvenilir CSV + haftalık güncelleme (teknik) |
| Uzun hukuk süreci | Pilot MOU + anonim test verisi |

---

## 8. Teknik ekip için sizin iletmeniz gereken bilgi

Görüşme sonrası tek mesajda:

1. Kurum adı, muhatap, e-posta  
2. API doküman linki veya “e-posta lead”  
3. Ticari model (CPL, rev share, veri lisansı)  
4. Hedef `partner_route` adı (ör. `finance_garanti`)  
5. Hukuk: DPA imza durumu  

Teknik ekip: webhook, secret, admin kanal kaydı, UAT 10 lead.

---

## 9. 30 günlük geçiş (özet)

| Hafta | Odak |
|-------|------|
| 1 | Ödeme sandbox + deploy güveni |
| 2 | Lead + analitik 7 gün kesintisiz |
| 3 | İlk canlı feed + admin bayrak |
| 4 | 1 partner pilot + pazarlama onayı |

Detay teknik liste: repo içi `docs/LIVE_DATA_30DAY_CHECKLIST.md` (geliştirici ile paylaşın).

---

## 10. Başarı kriterleri

- [ ] En az 1 canlı feed admin’de kayıtlı ve test edildi  
- [ ] `live_providers_enabled` açık **ve** UI’da doğru etiket  
- [ ] 1 partner webhook %98+ 2xx  
- [ ] 1 outcome geri bildirimi (kazanıldı / kaybedildi)  
- [ ] Pazarlama metni hukuk + teknik ile uyumlu  

---

*Hazır konuşma metinleri: [05-konusma-sablonlari.md](./05-konusma-sablonlari.md)*
