'use strict';

const { getLongformSections } = require('./seo-guide-longform.cjs');

/**
 * Rich SEO body expansions merged into landing-pages at build time.
 * Target: 1200+ Turkish words per /rehber/ page.
 */

const SHARED_FAQ_TAIL = [
  {
    q: 'isteBul analizi finansal tavsiye midir?',
    a: 'Hayır. Sonuçlar bilgilendirme amaçlıdır; bağlayıcı kredi onayı veya satış taahhüdü değildir. Nihai karar ve sözleşme size aittir.'
  },
  {
    q: 'Ücretsiz analiz ne kadar sürer?',
    a: 'Rehberli Auto akışı birkaç dakikada tamamlanır; TCO ve skor özeti anında üretilir.'
  }
];

function wordCount(parts) {
  return parts
    .flat()
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

const EXPANSIONS = {
  'suv-mi-sedan-mi': {
    comparisonTable: {
      caption: 'SUV ve sedan karşılaştırması (özet)',
      headers: ['Kriter', 'SUV', 'Sedan'],
      rows: [
        ['Şehir içi manevra', 'Orta–Zor (büyük gövde)', 'Kolay'],
        ['Yakıt / enerji', 'Genelde daha yüksek', 'Genelde daha düşük'],
        ['Bagaj / aile', 'Yüksek tavan, bebek koltuğu', 'Bagaj hacmi modele bağlı'],
        ['Uzun yol konforu', 'Yüksek oturma, iyi görüş', 'Sessiz kabin, stabil'],
        ['Park / garaj', 'Daha fazla alan gerekir', 'Kompakt modeller avantajlı'],
        ['TCO (5 yıl)', 'Bakım ve lastik maliyeti yüksek olabilir', 'Segmente göre dengeli']
      ]
    },
    advantages: [
      'Yüksek oturma ve geniş iç hacim',
      'Kötü yol koşullarında daha yüksek yerden yükseklik (modele göre)',
      'Çocuklu aileler için pratik erişim',
      'Çekme kapasitesi (bazı modellerde)'
    ],
    disadvantages: [
      'Şehir içinde daha yüksek tüketim ve park zorluğu',
      'Rüzgar direnci nedeniyle uzun vadede TCO artışı',
      'Büyük SUV’lerde görüş ölü noktaları',
      'Bazı otopark ve köprü sınıflarında ek maliyet riski'
    ],
    extraSections: [
      {
        heading: 'Aile büyüklüğü ve bagaj ihtiyacı',
        body: 'Üç çocuklu ailelerde üçlü koltuk sırası ve bagaj hacmi kritik hale gelir. Kompakt SUV bu dengeyi sağlarken, C segment sedan daha düşük tüketimle yetinebilir. Hafta sonu uzun yol sıklığınız yüksekse SUV’nin konforu öne çıkar; günlük 20 km şehir içi kullanımda sedan’ın işletme maliyeti genelde daha düşüktür. isteBul analizi, yıllık kilometre ve yakıt fiyatı varsayımlarıyla bu farkı sayıya döker.',
        subsections: [
          {
            heading: 'Bebek koltuğu ve ISOFIX',
            body: 'Kapı açıklığı ve arka diz mesafesi segment seçimini belirler. Broşürdeki litre değeri yerine gerçek kurulum testi yapın.'
          },
          {
            heading: 'Köpek taşıma ve hobi ekipmanı',
            body: 'SUV bagaj eşiği ve yüksekliği bisiklet veya kamp ekipmanı için avantaj sağlayabilir; sedan station wagon alternatifini de değerlendirin.'
          }
        ]
      },
      {
        heading: 'Yakıt ve enerji maliyeti karşılaştırması',
        body: 'Aynı motor gücünde SUV ağırlığı nedeniyle tüketim artar. Hibrit SUV bu farkı kısmen kapatır; maliyeti TCO tablosunda 5 yıla yayarak okuyun. Elektrikli SUV menzil ve şarj altyapısı planınızla uyumlu değilse sedan EV daha verimli olabilir.',
        subsections: [
          {
            heading: 'Lastik ve bakım',
            body: 'SUV lastikleri genelde daha pahalıdır; rot balansı ve fren aşınması kullanım tipine bağlıdır.'
          }
        ]
      },
      {
        heading: 'Güvenlik ve sürüş dinamiği',
        body: 'Modern SUV ve sedan modelleri benzer ADAS paketleri sunar. Ağırlık merkezi sedan’da daha alçak olabilir; agresif virajda sedan avantajlıdır. Kar ve buzda dört çeker SUV güven hissi verir; lastik kalitesi her iki gövdede de belirleyicidir.',
        subsections: []
      }
    ],
    extraFaqs: [
      {
        q: 'Crossover SUV sedan sayılır mı?',
        a: 'Pazarlama sınıflandırması değişir; TCO ve boyut için B-SUV ile C sedan’ı ayrı satırlarda kıyaslayın.'
      },
      {
        q: 'İkinci elde SUV mu daha değer kaybeder?',
        a: 'Model ve talebe bağlıdır; popüler SUV’ler likiditesi yüksek kalabilir. Segment bazlı piyasa verisiyle doğrulayın.'
      },
      {
        q: 'isteBul hangi segmenti önerir?',
        a: 'Bütçe, km ve aile ihtiyacınıza göre skor üretir; tek «doğru» gövde yoktur.'
      }
    ],
    conclusion:
      'SUV ve sedan seçimi «moda» değil kullanım verisine dayanmalıdır. Şehir içi kısa mesafe ve düşük park alanı sedan lehine; yüksek bagaj, çocuk ve kötü yol SUV lehine çalışır. Karşılaştırma tablosunu kendi kilometre ve yakıt fiyatınızla doldurun; isteBul Auto ile TCO farkını sayısal görün ve kararınızı güven skoru ile birlikte değerlendirin.'
  },
  'elektrikli-arac-alirken': {
    comparisonTable: {
      caption: 'Benzinli, hibrit ve tam elektrikli (BEV) özet',
      headers: ['Kriter', 'Benzinli', 'Hibrit', 'Tam elektrik (BEV)'],
      rows: [
        ['Şarj / yakıt altyapısı', 'Yaygın', 'Yakıt + sınırlı şarj', 'Ev/iş şarjı planı şart'],
        ['Şehir içi TCO', 'Orta', 'Düşük–orta', 'Düşük (yüksek km ile)'],
        ['Uzun yol', 'Kolay', 'Kolay', 'Planlı DC şarj gerekir'],
        ['Bakım', 'Periyodik yağ vb.', 'Orta', 'Daha az hareketli parça'],
        ['İkinci el değer', 'Olgun piyasa', 'Model bazlı', 'Batarya garantisi kritik']
      ]
    },
    advantages: [
      'Düşük enerji birimi maliyeti (doğru şarj planıyla)',
      'Sessiz sürüş ve sıfır egzoz (şehir içi)',
      'Azaltılmış bakım kalemleri',
      'Teşvik ve vergi avantajları (döneme göre değişir)'
    ],
    disadvantages: [
      'Şarj altyapısı ve menzil kaygısı',
      'Kış menzili düşüşü',
      'Batarya değişim maliyeti riski (garanti sonrası)',
      'Yüksek başlangıç fiyatı bazı segmentlerde'
    ],
    extraSections: [
      {
        heading: 'Şarj altyapısı planlaması',
        body: 'Ev tipi AC şarj, iş yeri desteği ve sık kullandığınız güzergahtaki DC istasyon haritası satın alma öncesi netleştirilmelidir. Apartman yönetimi ve elektrik panosu kapasitesi kurulum maliyetini etkiler. Haftada bir şehirlerarası 500 km sürüş varsa menzil tamponu ve fast-charge süreleri TCO hesabına girer.',
        subsections: [
          { heading: 'Wallbox maliyeti', body: 'Montaj, kablo ve sayaç ayrımı toplam sahip olma maliyetine eklenmelidir.' },
          { heading: 'Halka açık şarj fiyatları', body: 'kWh başına ücret operatöre göre değişir; yıllık projeksiyonda güncel tarifeyi kullanın.' }
        ]
      },
      {
        heading: 'Batarya garantisi ve ikinci el',
        body: 'Üretici batarya garantisi (yıl / km) ikinci el değerini destekler. Sağlık raporu veya SOH ölçümü mümkünse ekspertize ekleyin. Hızlı şarjın uzun vadeli kapasite etkisini broşürdeki limitlerle değerlendirin.',
        subsections: []
      },
      {
        heading: 'TCO ile benzinli alternatif',
        body: 'Aynı segmentte benzinli araçla 5 yıllık TCO kıyaslaması yapmadan EV alımı risklidir. Yüksek yıllık km EV lehine; düşük km ve pahalı şarj EV’i dezavantajlı kılabilir. isteBul enerji birimi ve kullanım profilinizi birleştirerek bu tabloyu üretir.',
        subsections: []
      }
    ],
    extraFaqs: [
      { q: 'Elektrikli araç kışın kullanılır mı?', a: 'Evet; menzil düşer. Isıtma için ön conditioning ve planlı şarj önerilir.' },
      { q: 'Hibrit mi tam elektrik mi?', a: 'Şarj erişiminiz yoksa hibrit geçiş çözümü olabilir; TCO ile kıyaslayın.' }
    ],
    conclusion:
      'Elektrikli araç alımı teknoloji değil altyapı kararıdır. Şarj planı, menzil tamponu, batarya garantisi ve 5 yıllık TCO birlikte okunmalıdır. isteBul ile benzinli/hibrit senaryolarını aynı panelde görün; finansman ve sigorta kalemlerini de ekleyerek gerçek aylık yükü hesaplayın.'
  },
  'arac-finansman-secenekleri': {
    comparisonTable: {
      caption: 'Peşin, taşıt kredisi ve finansal kiralama',
      headers: ['Kriter', 'Peşin', 'Taşıt kredisi', 'Finansal kiralama'],
      rows: [
        ['Nakit akışı', 'Yüksek tek çıkış', 'Aylık taksit', 'Aylık kira'],
        ['Toplam faiz', 'Yok', 'Vadeye bağlı', 'Sözleşmeye bağlı'],
        ['Mülkiyet', 'Anında sizde', 'Kredi bitince', 'Sözleşme sonu seçenekli'],
        ['Vergi (KOBİ)', 'Muhasebeye bağlı', 'Muhasebeye bağlı', 'Amortisman avantajı olabilir'],
        ['Erken kapama', '—', 'Banka koşulu', 'Cezai şart olabilir']
      ]
    },
    advantages: [
      'Peşin: toplam faiz yok, pazarlık gücü',
      'Kredi: nakit rezervi koruma',
      'Leasing: filo yenileme ve öngörülebilir gider (KOBİ)'
    ],
    disadvantages: [
      'Peşin: likidite riski',
      'Kredi: toplam geri ödeme yüksek olabilir',
      'Leasing: km ve hasar sınırları, son balon ödeme'
    ],
    extraSections: [
      {
        heading: 'Taşıt kredisi hesaplama mantığı',
        body: 'Faiz, dosya masrafı, hayat sigortası (varsa) ve vade toplam geri ödemeyi belirler. Yalnızca aylık takside bakmak yanıltıcıdır. Peşinat artışı faizi düşürür; vade uzadıkça toplam maliyet artar. Bankalar arası karşılaştırmayı aynı peşinat ve vade ile yapın.',
        subsections: [
          { heading: 'Sabit vs değişken faiz', body: 'Öngörülebilirlik için sabit tercih edilir; piyasa düşüşünde değişken avantajlı olabilir — her iki senaryoyu hesaplayın.' }
        ]
      },
      {
        heading: 'Leasing ve operasyonel kiralama',
        body: 'KOBİ filolarında leasing nakit akışını düzleştirir. Bireysel kullanıcıda sınırlıdır. Sözleşme sonunda araç iadesi veya satın alma opsiyonunu TCO’ya dahil edin.',
        subsections: []
      },
      {
        heading: 'Finansman + TCO birleşik okuma',
        body: 'Düşük taksitli uzun vade, yüksek faizli kısa vadeden daha pahalı olabilir. Aynı anda yakıt, sigorta ve bakımı ekleyerek «aylık taşıma maliyeti» üretin.',
        subsections: []
      }
    ],
    extraFaqs: [
      { q: 'Kredi onayı almadan araç seçmeli miyim?', a: 'Önce bütçe bandını netleştirin; onay sonrası model daraltın.' },
      { q: 'Dosya masrafı düşürülebilir mi?', a: 'Banka kampanyalarına bağlıdır; toplam maliyete ekleyin.' }
    ],
    conclusion:
      'Finansman aracı seçimi gelir düzeninize ve kullanım sürenize bağlıdır. Peşin, kredi ve leasing’i toplam geri ödeme ve TCO ile kıyaslayın; isteBul Auto bu senaryoları profilinize göre özetler.'
  },
  'arac-toplam-sahiplik-maliyeti': {
    comparisonTable: {
      caption: 'TCO kalemleri (örnek yapı)',
      headers: ['Kalem', 'Açıklama', 'Tipik pay'],
      rows: [
        ['Satın alma / finansman', 'Peşinat, faiz, leasing', 'Yüksek'],
        ['Yakıt veya enerji', 'Km ve tüketim', 'Orta–yüksek'],
        ['Sigorta', 'Trafik + kasko', 'Orta'],
        ['Bakım ve lastik', 'Periyodik servis', 'Düşük–orta'],
        ['Vergi', 'MTV vb.', 'Düşük'],
        ['Değer kaybı', 'İkinci el satış farkı', 'Gizli maliyet']
      ]
    },
    advantages: [
      'Gerçek bütçeyi görmenizi sağlar',
      'Benzer fiyatlı modelleri ayırt eder',
      'Finansman senaryolarını test etmenize imkan verir'
    ],
    disadvantages: [
      'Varsayımlara duyarlıdır (km, yakıt fiyatı)',
      'Bölgesel sigorta primi değişkenliği',
      'Beklenmedik onarım her zaman modellenemez'
    ],
    extraSections: [
      {
        heading: 'Değer kaybını hesaba katmak',
        body: 'Sıfır araçta ilk yıl kayıp yüksektir; ikinci elde model talebi belirleyicidir. 3–5 yıl sonra satış fiyatı tahmini TCO’yu tamamlar. Popüler filo modelleri likiditesi yüksek kalabilir.',
        subsections: [
          { heading: 'EV batarya etkisi', body: 'Garanti bitişi ikinci el fiyatını etkiler; SOH bilgisi alıcı güvenini artırır.' }
        ]
      },
      {
        heading: 'Aylık taşıma maliyeti',
        body: 'Taksit + yakıt + sigorta + bakım + otopark toplamı, bankanın onayladığı taksit tavanından ayrı düşünülmelidir. Sürdürülebilir bütçe için gelirin sabit bir yüzdesini üst sınır kabul edin.',
        subsections: []
      },
      {
        heading: 'isteBul TCO motoru',
        body: 'Kullanım tipi, segment ve finansman girdileri birleştirilerek 12–60 ay projeksiyon üretilir. Sonuçlar bilgilendirme amaçlıdır; bayi teklifini doğrulama adımı olarak kullanın.',
        subsections: []
      }
    ],
    extraFaqs: [
      { q: 'TCO ile aylık taksit aynı şey mi?', a: 'Hayır. TCO tüm sahiplik kalemlerini kapsar; taksit yalnızca finansman dilimidir.' },
      { q: 'Sigorta her yıl artar mı?', a: 'Hasar ve piyasa koşullarına bağlıdır; yıllık güncelleme önerilir.' }
    ],
    conclusion:
      'Etiket fiyatına değil TCO’ya göre karar vermek uzun vadede tasarruf sağlar. Kalemleri tabloda ayrıştırın; isteBul ile segment karşılaştırması yapın ve finansman senaryolarını aynı grafikte görün.'
  },
  'ikinci-el-arac-alirken': {
    comparisonTable: {
      caption: 'İkinci el risk kontrol listesi',
      headers: ['Kontrol', 'Neden önemli', 'Risk'],
      rows: [
        ['Tramer / hasar kaydı', 'Gizli kaza geçmişi', 'Yüksek'],
        ['Ekspertiz', 'Mekanik ve kaporta', 'Yüksek'],
        ['Km ve yağ değişim', 'Bakım disiplini', 'Orta'],
        ['Fatura ve servis geçmişi', 'Doğrulanabilirlik', 'Orta'],
        ['Piyasa fiyat bandı', 'Aşırı ucuz tuzak', 'Yüksek']
      ]
    },
    advantages: [
      'Düşük giriş fiyatı',
      'Yavaşlayan ilk yıl değer kaybı',
      'Geniş model seçeneği'
    ],
    disadvantages: [
      'Gizli hasar ve mekanik risk',
      'Kısıtlı garanti',
      'Finansman faizi bazen daha yüksek'
    ],
    extraSections: [
      {
        heading: 'Ekspertiz süreci',
        body: 'Bağımsız ekspertiz motor, şanzıman, süspansiyon ve elektronik testlerini kapsamalıdır. Boya kalınlığı ölçümü değişen parça tespiti için kullanılır. Sonuçları fiyat pazarlığına veri olarak taşıyın.',
        subsections: [
          { heading: 'Test sürüşü', body: 'Vites geçişleri, fren, titreşim ve klima kontrolü yapın.' }
        ]
      },
      {
        heading: 'Belge ve hukuki kontrol',
        body: 'Rehin, haciz, vergi borcu ve yetki belgesi sorguları satış öncesi zorunludur. Yetkili satıcılar süreci kolaylaştırır; bireysel satışta noter ve EGM adımlarına dikkat edin.',
        subsections: []
      },
      {
        heading: 'Fiyat doğrulama',
        body: 'Aynı model-yıl-km bandında en az beş ilan referansı alın. Çok düşük fiyatlı ilanlarda risk primi yüksektir. isteBul önce bütçe bandınızı netleştirir; sonra ilan filtrelemenizi kolaylaştırır.',
        subsections: []
      }
    ],
    extraFaqs: [
      { q: 'Garantili ikinci el mantıklı mı?', a: 'Yetkili garanti riski düşürür; maliyeti TCO’ya ekleyerek kıyaslayın.' },
      { q: 'Km düşükse yeterli mi?', a: 'Hayır; bakım geçmişi ve hasar kaydı birlikte okunmalıdır.' }
    ],
    conclusion:
      'İkinci el alımında fiyat kadar şeffaflık önemlidir. Kontrol listesini eksiksiz uygulayın; isteBul ile bütçe ve segment uyumunu önce hesaplayın, ekspertiz sonrası nihai teklifi verin.'
  }
};

/** Default expansion blocks for guides without bespoke content */
function defaultExpansion(slug, h1) {
  return {
    comparisonTable: {
      caption: `${h1} — karar kriterleri özeti`,
      headers: ['Kriter', 'Dikkat', 'isteBul sinyali'],
      rows: [
        ['Bütçe', 'Peşinat + aylık taşıma', 'Bütçe uyumu skoru'],
        ['Kullanım', 'Km, şehir/otoyol', 'Segment önerisi'],
        ['Finansman', 'Vade, faiz', 'Senaryo karşılaştırma'],
        ['TCO', '5 yıl projeksiyon', 'Maliyet bandı'],
        ['Risk', 'Likidite, bakım', 'Risk seviyesi']
      ]
    },
    advantages: [
      'Karar öncesi yapılandırılmış analiz',
      'Toplam maliyet görünürlüğü',
      'Tarafsız skorlama (tek marka önceliği yok)',
      'KVKK uyumlu veri işleme'
    ],
    disadvantages: [
      'Bilgilendirme amaçlı — bağlayıcı teklif değil',
      'Ekspertiz ve hukuki adımlar kullanıcı sorumluluğunda',
      'Piyasa verileri varsayıma dayalı olabilir'
    ],
    extraSections: [
      {
        heading: 'Türkiye pazarına özel değerlendirme',
        body: `${h1} konusunda Türkiye’de faiz, sigorta primi, yakıt fiyatı ve ikinci el likiditesi kararı doğrudan etkiler. Sezonluk kampanyalar kısa vadeli cazip görünse de 36 ay TCO ile test edin. Bölgesel farklar (İstanbul trafiği, dağlık yol, kurumsal filo) kullanım profilinize göre modele yansıtılmalıdır.`,
        subsections: [
          {
            heading: 'Vergi ve harçlar',
            body: 'MTV, tescil ve opsiyonel harçları satın alma planına dahil edin.'
          }
        ]
      },
      {
        heading: 'Finansman ve nakit akışı',
        body: 'Bankanın onayladığı taksit ile sürdürülebilir bütçe farklıdır. Beklenmedik bakım payı için aylık giderde %10–15 tampon önerilir. Peşinat artışı toplam faizi düşürür; vade uzatma toplam maliyeti artırır.',
        subsections: [
          {
            heading: 'Kredi vs peşin',
            body: 'Peşin alım faiz sıfırlar; kredi likidite korur. Her iki senaryoyu TCO tablosunda yan yana görün.'
          }
        ]
      },
      {
        heading: 'Karşılaştırma ve sonraki adım',
        body: 'En az iki alternatifi aynı km ve finansman varsayımıyla kıyaslayın. Karar skoru düşük olsa bile güven skoru yüksekse girdi tutarlıdır; tersi durumda soruları gözden geçirin. Partner teklifleri yalnızca onayınızla paylaşılır.',
        subsections: []
      }
    ],
    extraFaqs: [
      {
        q: `${h1} için hangi belgeler gerekir?`,
        a: 'Satın alma aşamasında kimlik, finansman onayı ve sigorta poliçesi süreçleri yetkili satıcı/banka ile yürütülür; isteBul bu adımları otomatik tamamlamaz.'
      }
    ],
    conclusion: `${h1} hakkında bilgi toplarken liste fiyatına değil toplam sahip olma maliyetine odaklanın. isteBul Auto ile profilinizi yapılandırın, skor ve TCO özetini alın; nihai sözleşme öncesi ekspertiz ve hukuki kontrolleri tamamlayın.`
  };
}

/** Footer Final V1 canonical slugs → expansion content keys */
const GUIDE_EXPANSION_ALIAS = {
  'elektrikli-arac-rehberi': 'elektrikli-arac-alirken',
  'finansman-rehberi': 'arac-finansman-secenekleri',
  'tco-rehberi': 'arac-toplam-sahiplik-maliyeti',
  'ikinci-el-rehberi': 'ikinci-el-arac-alirken'
};

function resolveExpansionSlug(slug) {
  return GUIDE_EXPANSION_ALIAS[slug] || slug;
}

function getGuideExpansion(slug, h1) {
  const key = resolveExpansionSlug(slug);
  const custom = EXPANSIONS[key];
  if (custom) return custom;
  return defaultExpansion(slug, h1);
}

function universalSupplementSections(slug, h1) {
  return [
    {
      heading: `${h1} için karar çerçevesi`,
      body: `${h1} konusunda aceleci seçim, yüksek tutarlı ve geri dönüşü zor bir hataya dönüşebilir. Türkiye’de faiz, kur, yakıt ve sigorta primleri kısa sürede değişebildiği için kararı tek bir teklif üzerinden kilitlemek yerine senaryo tablosu kurun. Önce ihtiyaç (km, aile, şehir), sonra üst bütçe, ardından finansman ve TCO gelmelidir. Bu sıra, «önce model beğendim» tuzağını azaltır. isteBul Auto analizi bu çerçeveyi dakikalar içinde yapılandırır; skor ve maliyet bandı üretir. Sonuçlar bilgilendirme amaçlıdır — ekspertiz, hukuki kontrol ve banka onayı ayrı adımlardır. ${h1} özelinde bayi veya satıcı baskısı hissederseniz 24 saat ara verin; duygusal karar TCO’yu bozar.`,
      subsections: [
        {
          heading: 'Veri toplama kontrol listesi',
          body: 'En az üç bağımsız fiyat referansı, iki sigorta teklifi, bir bakım planı ve mümkünse ekspertiz notu toplayın. Eksik veri güven skorunu düşürür.'
        },
        {
          heading: 'Aile ve iş ortaklığı',
          body: 'Aracı birden fazla kişi kullanacaksa sürüş ihtiyaçlarını yazılı hale getirin; bagaj, güvenlik ve ergonomi kriterleri çatışabilir.'
        }
      ]
    },
    {
      heading: 'Türkiye pazarında maliyet dinamikleri',
      body: `İstanbul, Ankara, İzmir ve bölge şehirlerinde sigorta primi, otopark ve trafik profili farklıdır. ${h1} araştırırken yalnızca katalog fiyatına değil, 36 ay toplam nakit çıkışına bakın. Döviz kuru ithal parça ve sıfır araç fiyatını etkiler; yerli üretim modellerde tedarik süresi fiyatı şekillendirebilir. Kampanya dönemlerinde vade uzatılarak «düşük taksit» sunulabilir; toplam geri ödemeyi hesaplayın. İkinci el piyasasında mevsimsel dalgalanma vardır — bahar aylarında talep artışı fiyatı yukarı çekebilir. Elektrikli araçlarda şarj altyapısı bölgeseldir; şehir dışı yaşamda menzil planı şarttır.`,
      subsections: [
        {
          heading: 'Vergi ve harç planlaması',
          body: 'MTV, tescil, plaka ve opsiyonel hizmetleri satın alma tablosuna ekleyin. Ticari plakada farklı oranlar uygulanabilir.'
        }
      ]
    },
    {
      heading: 'isteBul ile sonraki adımlar',
      body: `«${slug}» temalı bu rehberi okuduktan sonra ücretsiz Auto analizini başlatın. Motor, skor ve TCO çıktısını PDF veya ekran görüntüsü olarak saklayın; bayi görüşmesinde referans kullanın. Karşılaştırma merkezinde ikinci bir modeli aynı varsayımlarla ekleyin. Partner teklifleri yalnızca onayınızla iletilir. Metodoloji sayfamızda skorların nasıl üretildiğini okuyabilirsiniz. Finansal tavsiye veya getiri taahhüdü yoktur; nihai sözleşme size aittir.`,
      subsections: [
        {
          heading: 'Gizlilik',
          body: 'Veriler KVKK kapsamında işlenir; gereksiz kişisel alan toplanmaz. Pazarlama iletişimi için ayrı rıza gerekir.'
        }
      ]
    },
    {
      heading: 'Sık yapılan hatalar',
      body: 'Yalnızca aylık takside bakmak, sigortayı ilk teklifle sabitlemek, değer kaybını yok saymak ve test sürüşünü atlamak en yaygın hatalardır. Donanım paketini ihtiyaç olmadan yükseltmek TCO’yu şişirir. «Komşunun önerisi» yerine ölçülebilir kriter kullanın. Uzun garanti paketlerini okumadan imzalamayın; kapsam dışı kalemleri listeleyin.',
      subsections: []
    },
    {
      heading: 'Finansman stres testi',
      body: 'Faiz +2 puan, yakıt +15%, sigorta +20% senaryolarında aylık taşıma maliyetini yeniden hesaplayın. Üç senaryodan en kötüsünde bile bütçe taşıyorsa karar sürdürülebilir kabul edilebilir. Değişken faiz kullanıyorsanız TCMB politika faizi artış dönemlerini tarihsel okuyun — garanti değildir ancak hazırlık sağlar. Peşinatı 5 puan artırarak stres testini geçemiyorsanız segment düşürün veya ikinci el bandına inin. Kredi vadesini uzatmak stres testini «kozmetik» geçirebilir; toplam faizi kontrol edin.',
      subsections: [
        {
          heading: 'Acil durum fonu',
          body: 'Araç alımı acil durum fonunu sıfırlamamalı; en az üç aylık gider tutarı ayrı hesapta kalmalıdır.'
        }
      ]
    },
    {
      heading: 'Satış ve yenileme döngüsü',
      body: `Kaç yıl sonra satmayı planladığınızı baştan yazın. Kısa döngüde değer kaybı yüksek segmentlerden kaçının. Uzun döngüde bakım disiplini ikinci el fiyatını korur. Takas ve yeniden finansman maliyetini bir sonraki alıma ekleyin. «${h1}» kararında yenileme tarihi net değilse TCO hesabı varsayılan 5 yıl kullanın; daha kısa planlıyorsanız 36 ay projeksiyon yeterlidir.`,
      subsections: []
    },
    {
      heading: 'Karşılaştırma tablosunu okuma rehberi',
      body: 'Yukarıdaki tabloda her satırı kendi yaşam tarzınıza göre ağırlıklandırın. Örneğin şehir içi kullanıcı için yakıt satırına çift puan verin; uzun yol kullanıcısı için konfor ve menzil satırlarını öne alın. Tablo ortalama kullanıcı içindir; sizin km ve bütçeniz farklıysa hücreleri not alarak güncelleyin. isteBul Auto çıktısındaki skor ve TCO bandı bu tabloyu sayısallaştırır. Tablo ile platform sonucu çelişirse girdilerinizi (km, peşinat, vade) gözden geçirin.',
      subsections: []
    },
    {
      heading: 'On beş maddelik uygulama planı',
      body: `1) Bütçe üst sınırını yazın. 2) Yıllık km tahmini yapın. 3) Finansman türünü seçin. 4) En az iki modeli listeleyin. 5) TCO tablosu açın. 6) Sigorta teklifi alın. 7) Ekspertiz randevusu planlayın. 8) Tramer sorgusu yapın. 9) Test sürüşü yapın. 10) Pazarlık referansı toplayın. 11) Sözleşme maddelerini okuyun. 12) Teslimat formunu kontrol edin. 13) İlk bakım tarihini takvime yazın. 14) Skor çıktınızı arşivleyin. 15) Bir yıl sonra TCO gerçekleşenle kıyaslayın. Bu plan «${h1}» kararını disipline eder; isteBul ilk adımları hızlandırır.`,
      subsections: [
        {
          heading: 'Belge klasörü',
          body: 'Tek PDF klasöründe teklif, poliçe, ekspertiz ve sözleşme kopyalarını saklayın; yeniden satışta değer katar.'
        }
      ]
    }
  ];
}

function mergeGuidePage(page) {
  const exp = getGuideExpansion(page.slug, page.h1);
  const longformKey = resolveExpansionSlug(page.slug);
  const sections = [
    ...(page.sections || []),
    ...(exp.extraSections || []),
    ...getLongformSections(longformKey),
    ...universalSupplementSections(page.slug, page.h1)
  ];
  const faqs = [...(page.faqs || []), ...(exp.extraFaqs || []), ...SHARED_FAQ_TAIL];

  return {
    ...page,
    sections,
    faqs,
    comparisonTable: exp.comparisonTable,
    advantages: exp.advantages,
    disadvantages: exp.disadvantages,
    conclusion: exp.conclusion
  };
}

function estimatePageWords(page) {
  const parts = [
    page.intro,
    page.conclusion,
    ...(page.bullets || []),
    ...(page.advantages || []),
    ...(page.disadvantages || []),
    ...(page.faqs || []).map((f) => `${f.q} ${f.a}`),
    ...(page.sections || []).flatMap((s) => [
      s.heading,
      s.body,
      ...((s.subsections || []).flatMap((sub) => [sub.heading, sub.body]))
    ]),
    ...(page.comparisonTable?.rows || []).flat()
  ];
  return wordCount(parts);
}

module.exports = {
  mergeGuidePage,
  estimatePageWords,
  getGuideExpansion,
  MIN_GUIDE_WORDS: 1050,
  TARGET_GUIDE_WORDS: 1200
};
