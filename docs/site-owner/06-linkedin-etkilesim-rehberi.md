# Bölüm 6 — LinkedIn yorum ve etkileşim rehberi

**isteBul.com** · Üçüncü taraf gönderilere profesyonel yorum · 2026

Bu rehber, isteBul marka hesabının (veya kurucu/ekip profillerinin) **başkalarının LinkedIn gönderilerine** yaptığı yorumlar içindir. Kendi paylaşım takvimi için [03-tanitim-pazarlama.md](./03-tanitim-pazarlama.md) ve [SOCIAL_MEDIA_30DAY_PLAYBOOK.md](../SOCIAL_MEDIA_30DAY_PLAYBOOK.md) dosyalarını kullanın.

**Referans kaynaklar:** `js/core/brand-voice.js`, [P4_6_BRAND_CONSISTENCY.md](../P4_6_BRAND_CONSISTENCY.md), [PHASE_3A_DECISION_CATEGORY_CARDS.md](../PHASE_3A_DECISION_CATEGORY_CARDS.md)

---

## 1. Amaç ve kapsam

LinkedIn’de global AI, teknoloji, finans, otomotiv, konut, sigorta ve B2B ekosistemindeki tartışmalara **uzman katkısı** sunmak; isteBul’u reklam gibi değil, **karar altyapısı perspektifi** taşıyan bir ses olarak konumlandırmak.

**Bu rehber ne değildir:**

- Kendi ürün paylaşımı metinleri (bunlar `SOCIAL_MEDIA_30DAY_PLAYBOOK`’ta)
- Partner satış outbound mesajları (bunlar [05-konusma-sablonlari.md](./05-konusma-sablonlari.md) ve `data/sales/outbound-sequences.json`’da)
- Kullanıcının kendi analiz özetini paylaşması (ürün içi `buildLinkedInSummaryText` — bkz. §2)

---

## 2. İki farklı LinkedIn dili

| | Ürün içi kullanıcı paylaşımı | Marka / üçüncü taraf yorumu |
|---|------------------------------|-----------------------------|
| **Kaynak** | `js/decision/decision-os-report.js` → `buildLinkedInSummaryText()` | Bu rehber |
| **Amaç** | Kullanıcı kendi karar raporunu paylaşır | Başkasının gönderisine değer katmak |
| **Ton** | Kişisel özet, emoji, skor/verdict, marka hashtag | Profesyonel, nötr, emoji minimum |
| **Marka** | Doğrudan isteBul + `#isteBul` | İlk cümlede marka yok; nadiren soft atıf |
| **Link** | Kullanıcı isterse ekler | Çoğu yorumda link yok |
| **CTA** | “isteBul ile daha bilinçli kararlar verin” | CTA yazılmaz |

**Örnek — ürün içi paylaşım dili (yorum olarak kullanmayın):**

> 🎯 isteBul AI Karar Özeti — Otomotiv  
> AI Kararı: AL  
> Karar Skoru: 78/100  
> #isteBul #AIKarar

**Örnek — üçüncü taraf yorum dili (tercih edilen):**

> Yüksek tutarlı alımlarda sohbet AI’sı iyi bir çerçeve sunar; asıl zorluk genelde toplam maliyet ve nakit akışının parçalı kalması. Skorun hangi girdilerle değiştiği görünmüyorsa güven zorlaşır — sayıları deterministik hesaplayıp açıklamayı ayrı katmanda tutmak daha sürdürülebilir bir model.

---

## 3. Konumlandırma (her yorumda koruyun)

**isteBul nedir:**

- Yüksek tutarlı alımlarda toplam maliyet, risk ve uygunluk analizi sunan **AI destekli karar destek platformu**
- İlan sitesi veya sohbet botu **değil**; **karar altyapısı**

**Teknik ayrım (değiştirmeyin):**

| Katman | Ne yapar |
|--------|----------|
| Kural / deterministik motor | Skor, TCO, risk hesaplar |
| AI katmanı | Yalnızca açıklama ve karar destek metni üretir; skoru değiştirmez |

**Standart disclaimer (gerekirse, kısa):**

> Analiz ve skorlar bilgilendirme amaçlıdır; finansal tavsiye veya getiri taahhüdü değildir.

**Pilot dürüstlüğü:** Canlı veri feed’i yoksa “tüm bankalar canlı” veya “anlık ilan” demeyin. Erken erişim / pilot dili kullanın ([03-tanitim-pazarlama.md](./03-tanitim-pazarlama.md) §4).

---

## 4. Reklam gibi görünmeme kuralları

### 4.1 Zorunlu kurallar

| Kural | Açıklama |
|-------|----------|
| İlk cümlede marka adı yok | “isteBul olarak…” ile başlamayın |
| Her yorumda link yok | Link en fazla 10 yorumda 1; organik bağlam şart |
| Hashtag minimum | Kullanmayın veya en fazla 1 nötr hashtag (#TCO) |
| CTA yok | “Deneyin”, “Kaydolun”, “Link bio’da” yazmayın |
| Satış dili yok | Pilot teklifi, fiyat, Pro plan, partner başvurusu yok |
| Uzman katkısı | Post sahibinin konusuna somut değer ekleyin |
| Emoji minimum | Ürün paylaşım tonunu yorumda kullanmayın |

### 4.2 Kaçınılacak ifadeler

- “Garanti tasarruf”, “kesin kazanç”, “en iyi kararı verir”
- “En ucuz araç burada”, “flaş fırsat”, “son dakika”
- Finansal, hukuki veya yatırım tavsiyesi (“şu krediyi alın”, “bu evi alın”)
- Rakip ismiyle aşağılayıcı karşılaştırma
- Şişirilmiş kullanıcı sayısı veya kanıtlanmamış “canlı” iddialar

### 4.3 Tercih edilen dil

- TCO, toplam maliyet, nakit akışı, uyum skoru, metodoloji
- “Karar destek”, “bilgilendirme amaçlı”, “kural tabanlı skor”
- “Generic AI fikir verir; sayılar denetlenebilir motorla üretilir” (satışsız çerçeve)

### 4.4 Link stratejisi (verilecekse)

**Organik hedefler (tercih sırası):**

1. `https://www.istebul.com/metodoloji/` — skor ve süreç şeffaflığı
2. `https://www.istebul.com/rehber/{slug}/` — konuya uygun karar rehberi (ör. TCO, kredi hesaplama)

**Kaçının:**

- Doğrudan `/auto/`, `/planlar`, `/partner-olun.html` — satış sayfası algısı yaratır
- UTM’li kampanya linkleri — yorumda reklam kokusu verir

**Link verme formatı (nadir):**

> Bu ayrımı metodoloji tarafında şeffaf tutmaya çalışıyoruz; skor kural tabanlı, AI yalnızca gerekçe — detay: istebul.com/metodoloji

Linki yalnızca biri “nasıl hesaplanıyor?” veya “kaynak/metodoloji?” diye sorduğunda veya thread derinleştiğinde ekleyin.

---

## 5. Yorum yazma akışı

1. **Gönderiyi okuyun** — post sahibinin asıl argümanını tespit edin
2. **Kategori seçin** — aşağıdaki matrislerden uygun olanı
3. **1–3 cümle katkı** — somut kavram (TCO, DTI, prim bandı vb.)
4. **Marka/link kontrolü** — §4 listesini geçirin
5. **Yayınlayın** — tartışmayı genişletin, kapatmayın

**Sıklık önerisi:** Günde 1–3 kaliteli yorum; her gönderiye değil, yalnızca gerçek katkı sağlayabileceğiniz thread’lere.

---

## 6. Global AI sağlayıcı gönderilerine yorum örnekleri

Anthropic, OpenAI, Claude, ChatGPT ve benzeri hesapların paylaşımlarına **ürün satmadan**, sektör perspektifi ekleyin.

### 6.1 Model lansmanı / yetenek duyurusu

**Ne zaman:** Yeni model, reasoning, multimodal veya agent özelliği duyurulduğunda.

**TR:**

> Reasoning ve bağlam penceresindeki ilerleme gerçek; yüksek tutarlı satın alma kararlarında asıl mesele genelde “doğru cevap” değil, sayıların hangi girdilerle değiştiğinin denetlenebilir olması. Sohbet katmanı fikir üretir; skor, TCO ve risk sinyalleri ayrı, kural tabanlı bir motorda kalmalı — AI yalnızca gerekçeyi anlatmalı.

**EN:**

> Progress on reasoning and context is real. For high-stakes purchases, the harder problem is rarely “a good answer” — it’s whether users can audit what inputs changed the recommendation. A conversational layer can frame the question; scores, TCO, and risk signals should stay in a separate, rule-based engine with AI limited to explanation.

### 6.2 AI güvenliği / responsible AI

**TR:**

> Güvenlik ve hizalama kritik; tüketici finansman ve otomotiv gibi dikeylerde bir adım daha var: halüsinasyon riski fiyat ve taksit gibi somut çıktılara yansıyor. Karar destek sistemlerinde “AI skoru değiştirmez, yalnızca açıklar” ayrımı hem regülasyon hem kullanıcı güveni için temel bir mimari tercih.

**EN:**

> Safety and alignment matter; in consumer finance and automotive there’s an extra layer — hallucination risk shows up in concrete outputs like prices and installments. A clear split where AI explains but does not alter deterministic scores is a baseline architecture choice for decision-support, not just a product detail.

### 6.3 Enterprise AI / agent workflow

**TR:**

> Agent workflow’ları operasyonel verimlilik için güçlü. Satış öncesi yüksek tutarlı kararlarda (araç, konut, kredi) değer genelde ham lead hacminde değil; karar öncesi bağlamda — TCO, uyum skoru, nitelikli talep. CRM’e düşen sinyalin skorlu ve bağlamlı olması conversion’ı ölçülebilir kılar.

**EN:**

> Agent workflows are strong for operational efficiency. In pre-sale, high-ticket decisions (auto, housing, credit), value often isn’t raw lead volume — it’s pre-decision context: TCO, fit score, qualified intent. Signals that reach CRM with score and context make conversion measurable.

### 6.4 “AI her şeyi değiştirecek” genel vizyon postları

**TR:**

> En büyük fırsat genel sohbetin yaygınlaşması değil; yüksek consideraton kararlarda parçalı araçların (ilan, banka tablosu, hesap makinesi) tek denetlenebilir akışta birleşmesi. Generic AI fikir verir; toplam maliyet ve risk hesabı şeffaf metodoloji ister.

**EN:**

> The bigger opportunity isn’t generic chat everywhere — it’s unifying fragmented tools (listings, bank tables, calculators) into one auditable flow for high-consideration decisions. General-purpose AI helps frame questions; total cost and risk need transparent methodology.

---

## 7. Kategori bazlı yorum matrisleri

Her kategori için: ne zaman yorum yapılır, hangi açıdan katkı verilir, kaçınılacak dil, TR/EN örnek yorum.

Sinyal sözlüğü: `decision-category-card-signals.js` ve [PHASE_3A_DECISION_CATEGORY_CARDS.md](../PHASE_3A_DECISION_CATEGORY_CARDS.md).

---

### 7.1 Generic AI / LLM

| | |
|---|---|
| **Ne zaman yorum yapılır?** | ChatGPT/Claude/Gemini ile alışveriş, kredi, araç veya ev tavsiyesi; “AI advisor” tartışmaları; halüsinasyon ve güven thread’leri |
| **Hangi açıdan katkı?** | Generic AI vs deterministik skor; sayı üreten motor + açıklayan AI ayrımı; denetlenebilirlik |
| **Kaçınılacak dil** | “Bizim AI’mız daha iyi”, rakip model aşağılama, “ChatGPT yanlış” diye genelleme |

**Türkçe örnek:**

> Sohbet AI’sı “hangi soruları sormam lazım” kısmında çok iyi. Ama araç veya konut gibi kararlarda liste fiyatı, taksit ve 5 yıllık toplam maliyet aynı tabloda değilse öneri güvenilir hissettirmez. Sayıları kural motorunda tutup AI’yı yalnızca gerekçe katmanında kullanmak bu boşluğu kapatır.

**English example:**

> Conversational AI is excellent for “what questions should I ask.” For auto or housing decisions, if list price, installment, and five-year total cost aren’t in one auditable view, recommendations feel fragile. Keeping numbers in a rule engine and AI strictly in the explanation layer closes that gap.

---

### 7.2 Otomotiv

| | |
|---|---|
| **Ne zaman yorum yapılır?** | Araç alımı, TCO, elektrikli araç, ikinci el, galeri dijitalleşme, otomotiv AI |
| **Hangi açıdan katkı?** | Aylık maliyet, yakıt/enerji, ikinci el/değer kaybı, uygunluk; liste fiyatı ≠ TCO |
| **Kaçınılacak dil** | “En ucuz araç”, “garanti tasarruf”, ilan sitesi tonu (“piyasa”, “ilan yayınla”) |

**Türkçe örnek:**

> Kampanyalı taksit cazip görünür; asıl kırılım çoğu zaman yakıt, bakım, sigorta ve değer kaybında. Aylık taksit düşük diye araç “ucuz” sanılmaması için 12–60 ay TCO’ya bakmak gerekir — skor da bu girdilerle birlikte okunmalı, tek başına etiket fiyatıyla değil.

**English example:**

> Promotional installments look attractive; the break often sits in fuel, maintenance, insurance, and depreciation. A low monthly payment doesn’t mean a cheap car — 12–60 month TCO matters, and any score should be read with those inputs, not list price alone.

---

### 7.3 Konut

| | |
|---|---|
| **Ne zaman yorum yapılır?** | Konut kredisi, m² fiyatı, kira vs satın alma, emlak AI, bölge seçimi |
| **Hangi açıdan katkı?** | Aylık/toplam etki, DTI, aidat/vergi/bakım; m² fiyatı ≠ taşıma kapasitesi |
| **Kaçınılacak dil** | “Bu mahalle kesin değerlenir”, yatırım tavsiyesi, getiri taahhüdü |

**Türkçe örnek:**

> m² fiyatı tek başına yeterli değil; ipotek taksiti, aidat, vergi ve bakım aylık nakit akışını belirler. DTI ve toplam etki sinyalleri birlikte okunmadan “uygun ev” tartışması eksik kalır — karar destek burada parçalı tabloları tek çerçevede toplamayı hedefler.

**English example:**

> Price per square meter alone isn’t enough — mortgage, fees, tax, and maintenance drive monthly cash flow. Without reading DTI and total impact together, “affordable home” debates stay incomplete. Decision support here means one frame instead of scattered spreadsheets.

---

### 7.4 Finansman

| | |
|---|---|
| **Ne zaman yorum yapılır?** | Faiz, kredi, BNPL, dijital lending, bankacılık AI |
| **Hangi açıdan katkı?** | Aylık ödeme, nakit baskısı, finansman uyumu, toplam geri ödeme; en düşük faiz ≠ doğru ürün |
| **Kaçınılacak dil** | “Şu krediyi alın”, kredi onayı iddiası, banka gibi konuşma |

**Türkçe örnek:**

> Faiz tablosu karşılaştırması başlangıç noktası; asıl soru nakit akışına göre taşınabilir aylık yük. Kredi onayı bankanın kararı — karar destek tarafında toplam geri ödeme ve finansman uyumu sinyallerini birlikte görmek daha sağlıklı bir çerçeve.

**English example:**

> Rate tables are a starting point; the real question is affordable monthly load relative to cash flow. Credit approval sits with the bank — decision support works better when total repayment and finance-fit signals are viewed together, not as a single “lowest rate” pick.

---

### 7.5 Tatil

| | |
|---|---|
| **Ne zaman yorum yapılır?** | Seyahat bütçesi, paket tur, erken rezervasyon, seyahat AI |
| **Hangi açıdan katkı?** | Tahmini maliyet, bütçe uyumu, profil/uygunluk; paket fiyatı ≠ toplam seyahat maliyeti |
| **Kaçınılacak dil** | “En ucuz tatil”, destinasyon garantisi, acente satış dili |

**Türkçe örnek:**

> Paket fiyatı uçak, transfer, ek harcama ve sezon farkını içermeyebilir. Gitmeden önce 7 günlük senaryo ile bütçe uyumunu netleştirmek, sonradan sürpriz maliyeti azaltır — uygunluk skoru da profil ve bütçe bandıyla birlikte okunmalı.

**English example:**

> Package price may exclude flights, transfers, extras, and seasonality. Clarifying budget fit with a seven-day scenario before booking reduces surprise spend — suitability reads best alongside profile and budget band, not headline price alone.

---

### 7.6 Sigorta

| | |
|---|---|
| **Ne zaman yorum yapılır?** | Prim artışı, teminat, dijital sigorta, AI underwriting tartışmaları |
| **Hangi açıdan katkı?** | Prim bandı, koruma, teminat, verimlilik, genel risk dengesi |
| **Kaçınılacak dil** | “En ucuz poliçe”, bağlayıcı teminat tavsiyesi, poliçe satış CTA |

**Türkçe örnek:**

> Prim tek başına yeterli metrik değil; teminat kapsamı ve koruma seviyesi birlikte değerlendirilmeli. Karar destek tarafında prim bandı ile genel risk sinyalini yan yana görmek, “ucuz ama yetersiz koruma” tuzağını görünür kılar — bilgilendirme amaçlı analiz, poliçe tavsiyesi değil.

**English example:**

> Premium alone isn’t enough; coverage and protection level need to be read together. In decision support, placing premium band next to overall risk makes the “cheap but underinsured” trap visible — informational analysis, not policy advice.

---

### 7.7 Kasko

| | |
|---|---|
| **Ne zaman yorum yapılır?** | Kasko primi, onarım maliyeti, hasar, filo sigortası |
| **Hangi açıdan katkı?** | Prim bandı, teminat, onarım riski, prim verimliliği |
| **Kaçınılacak dil** | “Mutlaka full kasko”, hasar garantisi, ekspertiz yerine geçen AI iddiası |

**Türkçe örnek:**

> Kasko kararında prim ile onarım riski ters yönde hareket edebilir — düşük prim, yüksek muafiyet veya kısıtlı servis ağı anlamına gelebilir. Teminat ve prim verimliliği sinyallerini birlikte okumak, toplam sahip olma maliyetinin sigorta kalemini netleştirir.

**English example:**

> In comprehensive (kasko) decisions, premium and repair risk can move in opposite directions — lower premium may mean higher deductibles or limited repair networks. Reading coverage and premium efficiency together clarifies the insurance slice of total ownership cost.

---

### 7.8 B2B / partner / CRM

| | |
|---|---|
| **Ne zaman yorum yapılır?** | Lead kalitesi, automotive CRM, webhook, dealer dijitalleşme, CPL tartışmaları |
| **Hangi açıdan katkı?** | Skorlu/bağlamlı talep vs ham form trafiği; karar öncesi niyet; ölçülebilir outcome |
| **Kaçınılacak dil** | “Partner olun”, pilot teklifi, fiyat/CPL tablosu, webhook satış pitch |

**Türkçe örnek:**

> Otomotiv dikeyinde CRM’e düşen lead’in hacmi kadar bağlamı da önemli: bütçe bandı, TCO sinyali ve karar öncesi niyet webhook ile birlikte gelirse callback verimi ölçülebilir hale gelir. Envanter trafiği ile karar öncesi talep aynı metrik değil.

**English example:**

> In automotive, what hits CRM matters as much as volume — budget band, TCO signals, and pre-decision intent make callback yield measurable when delivered with context. Inventory traffic and pre-decision demand aren’t the same metric.

---

### 7.9 KVKK / güven / AI halüsinasyonu

| | |
|---|---|
| **Ne zaman yorum yapılır?** | Veri gizliliği, KVKK/GDPR, AI hallucination, fiyat uydurma haberleri |
| **Hangi açıdan katkı?** | Veri minimizasyonu, açık rıza, denetlenebilir skor; AI’nın sayı üretmemesi |
| **Kaçınılacak dil** | Sertifika iddiası (kanıtsız), “%100 güvenli”, rakip veri skandalı üzerinden satış |

**Türkçe örnek:**

> Halüsinasyon riski yüksek consideraton kararlarda daha görünür — uydurma faiz veya fiyat doğrudan kullanıcı zararına gider. Skorları kural motorunda tutup AI’yı yalnızca açıklama katmanında sınırlamak, hem KVKK tarafında veri minimizasyonu hem denetlenebilirlik açısından tutarlı bir çizgi.

**English example:**

> Hallucination risk is more visible in high-stakes decisions — invented rates or prices map directly to user harm. Keeping scores in a rule engine and limiting AI to explanation aligns with data minimization and auditability, not just model quality headlines.

---

## 8. Ek senaryo şablonları

### 8.1 Soru sorulduğunda (thread devamı)

Biri “Peki pratikte nasıl?” diye sorarsa — yine satışsız, metodoloji/rehber yönlendirmesi mümkün.

**TR:**

> Skor girdileri ve varsayımlar metodoloji sayfasında adım adım anlatılıyor; TCO tarafında araç kredisi ve toplam sahip olma maliyeti rehberleri de aynı çerçeveyi kullanıyor — isterseniz paylaşırım.

**EN:**

> Inputs and assumptions are walked through on the methodology page; TCO guides for auto credit and total ownership use the same frame — happy to share if useful.

*(Link yalnızca istendiğinde: `/metodoloji/` veya ilgili `/rehber/...`)*

### 8.2 Anlaşmaya katılıp derinleştirme

**TR:**

> Katılıyorum — özellikle “AI skoru tek başına değiştirmez” ayrımı bu alanda güvenin omurgası. Üzerine TCO ve nakit akışı perspektifi eklenince karar yorgunluğu da azalıyor.

**EN:**

> Agree — especially the split where AI doesn’t alter the score on its own; that’s the trust backbone in this space. Adding TCO and cash-flow perspective on top reduces decision fatigue too.

### 8.3 Nazik ayrışma (yanlış çerçeve)

**TR:**

> Burada mesele genelde “daha akıllı chatbot” değil; yüksek tutarlı alımda parçalı hesapların tek denetlenebilir akışta birleşmesi. İlan listesi veya sohbet botu yerine karar destek altyapısı dili daha net oturuyor.

**EN:**

> The issue here usually isn’t “a smarter chatbot” — it’s unifying fragmented calculations into one auditable flow for high-ticket purchases. Decision-support infrastructure language fits better than listings or generic chat framing.

---

## 9. Ölçüm (isteğe bağlı)

LinkedIn yorumları doğrudan dönüşüm hunisi değil; marka bilinirliği ve uzman konumlandırma içindir.

| Sinyal | Ne izlenir |
|--------|------------|
| Thread etkileşimi | Beğeni, yanıt, takip |
| Profil ziyareti | Haftalık trend |
| Organik trafik | `/metodoloji/` ve `/rehber/*` referrer (LinkedIn) |

Satış metriği (lead, analiz başlatma) bu kanaldan beklenmemeli; asıl dönüşüm kendi paylaşımlarınız ve SEO rehberlerinden gelir.

---

## 10. Hızlı Kullanım Kontrol Listesi

Yorumu göndermeden önce:

- [ ] Post sahibinin konusuna **somut değer** ekledim (TCO, skor, risk, metodoloji vb.)
- [ ] İlk cümlede **isteBul / marka adı yok**
- [ ] **CTA, satış dili, fiyat, pilot teklifi** yok
- [ ] **Finansal / hukuki / yatırım tavsiyesi** yok
- [ ] “Garanti tasarruf”, “kesin kazanç”, “en iyi karar” **yok**
- [ ] **Emoji minimum** (ürün paylaşım tonu kullanılmadı)
- [ ] **Hashtag yok** veya en fazla 1 nötr (#TCO)
- [ ] **Link yok** — veya nadiren `/metodoloji/` / `/rehber/*` (satış sayfası değil)
- [ ] Konumlandırma korundu: **ilan sitesi değil, sohbet botu değil, karar destek platformu**
- [ ] **Skor/TCO/risk = deterministik motor; AI = yalnızca açıklama** ayrımı ihlal edilmedi
- [ ] Canlı veri / pilot iddiası **gerçeğe uygun** ([03-tanitim-pazarlama.md](./03-tanitim-pazarlama.md) §4)
- [ ] Gerekirse kısa disclaimer: **bilgilendirme amaçlı, finansal tavsiye değil**

---

*İlgili bölümler: [03-tanitim-pazarlama.md](./03-tanitim-pazarlama.md) · [05-konusma-sablonlari.md](./05-konusma-sablonlari.md) · Tam paket: [ISTEBUL-SITE-SAHIBI-TAM-PAKET.md](./ISTEBUL-SITE-SAHIBI-TAM-PAKET.md)*
