'use strict';

/**
 * Additional long-form sections per guide slug (build-time only).
 */

const LONGFORM = {
  'arac-kredisi-hesaplama': [
    {
      heading: 'Taşıt kredisi faiz ve masraf kalemleri',
      body: 'Türkiye’de taşıt kredilerinde nominal faiz oranı kadar dosya masrafı, ekspertiz, hayat sigortası (bankanın şart koşması halinde) ve erken kapama ücretleri toplam maliyeti şekillendirir. Kampanya dönemlerinde «sıfır faiz» ifadesi görülebilir; bu durumda dosya masrafı veya vade sınırı gizli maliyet taşıyabilir. Karşılaştırma yaparken her bankadan aynı peşinat oranı, aynı vade ve aynı sigorta paketi ile teklif isteyin. Aksi halde düşük faizli görünen teklif aslında daha pahalı olabilir. Aylık taksit hesabı anapara + faiz amortismanına dayanır; ilk yıllarda faiz payı yüksektir. Bu nedenle 3 yıl sonra araç satışı planlıyorsanız kalan anapara ile piyasa değerini birlikte düşünün.',
      subsections: [
        {
          heading: 'KKDF ve BSMV etkisi',
          body: 'Tüketici kredilerinde vergi kalemleri toplam geri ödemeyi artırır. Bankanın verdiği «toplam geri ödeme tutarı» satırını mutlaka okuyun; yalnızca taksit × ay çarpımı eksik kalabilir.'
        },
        {
          heading: 'Erken kapama senaryosu',
          body: 'Nakit girişi olduğunda erken kapama maliyetini sözleşmeden öğrenin. Bazen vadeyi kısaltmak erken kapamadan daha avantajlıdır.'
        }
      ]
    },
    {
      heading: 'Kredi onayı ve araç seçim sırası',
      body: 'Önce sürdürülebilir aylık taşıma bütçenizi (yakıt, sigorta, bakım dahil) hesaplayın, sonra kredi ön onayı alın. Model seçimini onay sonrası daraltmak hem satıcı pazarlığında hem risk yönetiminde işe yarar. Onay süresi ve koşulları kampanyaya göre değişir; süresi dolan onayda faiz yeniden fiyatlanabilir. isteBul bu aşamada segment ve TCO bandını netleştirir; hangi fiyat aralığında arama yapmanız gerektiğini gösterir.',
      subsections: []
    },
    {
      heading: 'Alternatif finansman araçlarıyla kıyas',
      body: 'Taşıt kredisi dışında peşin alım, bireysel ihtiyaç kredisi (genelde önerilmez) veya KOBİ leasing seçenekleri vardır. Her aracın vergi ve muhasebe etkisi farklıdır. Bireysel alıcı için kredi en yaygın yoldur; toplam faizi peşin alternatifle TCO tablosunda kıyaslayın. Düşük faizli uzun vade, yüksek faizli kısa vadeden daha pahalı olabilir — özellikle 48–60 ay vadelerde toplam faiz katlanır.',
      subsections: []
    }
  ],
  'arac-toplam-sahiplik-maliyeti': [
    {
      heading: 'TCO hesabında yaygın hatalar',
      body: 'Sadece yakıt tüketim broşürüne güvenmek, gerçek şehir içi trafikte sapma yaratır. Sigorta primini ilk yıl teklifiyle sabitlemek, hasarsızlık indirimi veya artışını görmezden gelmektir. Bakım planını garanti dışı yıllara yaymamak, özellikle 4. ve 5. yılda sürpriz yaratır. Değer kaybını hesaba katmamak ise en büyük gizli kalemdir: 2 milyon TL’lik araç 5 yıl sonra 1,1 milyon TL’ye düşebilir; bu 900 bin TL’lik «maliyet» satın alma fiyatı kadar önemlidir.',
      subsections: [
        { heading: 'Km varsayımı', body: 'Yıllık 15.000 km ile 30.000 km arasında yakıt ve bakım neredeyse iki katına çıkar. TCO’yu kendi kilometrenizle güncelleyin.' }
      ]
    },
    {
      heading: 'Segment bazlı maliyet farkları',
      body: 'Aynı fiyat bandındaki hatchback, sedan ve SUV aynı TCO’yu vermez. Turbo benzinli motorlar bakımda farklı profil çizer; dizel şehir içi kısa mesafede DPF riski taşıyabilir. Elektrikli araçlarda enerji birimi maliyeti ve şarj altyapısı belirleyicidir. Hibritler düşük hızda avantajlıdır. isteBul segment sinyallerini kullanım tipinizle eşleştirir.',
      subsections: []
    },
    {
      heading: 'Pratik TCO çalışma adımları',
      body: '1) Satın alma veya finansman tablosu oluşturun. 2) Yıllık km ve yakıt/enerji fiyatı girin. 3) Sigorta için iki teklif alın. 4) Periyodik bakım planını yetkili servisten isteyin. 5) 5. yıl tahmini satış fiyatı için piyasa ilan ortalamasına bakın. 6) Kalemleri toplayıp aylığa bölün. Bu aylık rakamı gelirinizle kıyaslayın.',
      subsections: []
    }
  ],
  'ikinci-el-arac-alirken': [
    {
      heading: 'Dolandırıcılık ve tuzak ilan sinyalleri',
      body: 'Piyasa ortalamasının çok altında fiyat, acele satış baskısı, kapora ile uzaktan satış ve ekspertize izin vermeme ciddi kırmızı bayraklardır. Sahte plaka veya tramer manipülasyonu için resmi sorgu kanallarını kullanın. Nakit ödeme öncesi mutlaka noter ve devir işlemini planlayın. WhatsApp üzerinden gelen «sadece bugün» baskısı karar kalitesini düşürür; bir gece ara verin.',
      subsections: []
    },
    {
      heading: 'Model yılı, kasa ve motor seçimi',
      body: 'Facelift ve kasa değişimleri yedek parça ve ikinci el değerini etkiler. Yüksek km düşük fiyat cazip görünür; ağır bakım kalemleri (zamanlama kayışı, turbo, şanzıman) yakındaysa TCO patlar. Servis geçmişi düzensiz araçlardan kaçının; yağ değişim kayıtları mekanik ömür için kritiktir.',
      subsections: []
    },
    {
      heading: 'Satış sonrası maliyet planı',
      body: 'Satın alma anında ödenen ekspertiz ve noter, ilk yıl TCO’ya eklenmelidir. İkinci elde kısa süreli garanti paketleri fiyatı artırır; hasar geçmişi yüksek araçta mantıklı olabilir. Satıştan önce küçük kozmetik onarımlar pazarlık gücü sağlayabilir ancak mekanik sorunları gizlemek için kullanılmamalıdır.',
      subsections: []
    }
  ],
  'sifir-arac-mi-ikinci-el-mi': [
    {
      heading: 'Değer kaybı eğrisi',
      body: 'Sıfır araçta ilk 12 ay en dik kayıp yaşanır. 2–3 yaşında bakımlı ikinci el, bu kaybın büyük kısmını önceki sahibin üstlenmesi anlamına gelir. Ancak garanti kapsamı daralır. Uzun süre (8+ yıl) kullanacaksanız sıfır araçta başlangıç maliyeti zamanla amorti edilebilir. Kısa süreli kullanımda ikinci el genelde daha verimlidir.',
      subsections: []
    },
    {
      heading: 'Teknoloji ve güvenlik paketleri',
      body: 'Sıfır araçta ADAS, kamera ve çarpışma önleme sistemleri günceldir. İkinci elde aynı donanım için 2–3 yaş üstü model seçilebilir; yazılım güncellemesi ve sensör kalibrasyon maliyetini sorun. Kurumsal filodan çıkan araçlar düzenli bakımlı olabilir; bireysel satışta belge şarttır.',
      subsections: []
    },
    {
      heading: 'Finansman farkı',
      body: 'Sıfır araçta kampanyalı faiz daha yaygındır; ikinci elde vade kısıtı ve faiz yüksek olabilir. Toplam finansman maliyetini TCO’ya ekleyerek «sıfır mı ikinci el mi» sorusunu sayıya bağlayın.',
      subsections: []
    }
  ],
  'arac-karsilastirma-rehberi': [
    {
      heading: 'Karşılaştırma matrisi nasıl kurulur?',
      body: 'En az iki aday modeli satır sütun yapın: satın alma, finansman, yıllık yakıt, sigorta, bakım, vergi, değer kaybı. Ağırlık verin: örneğin şehir içi kullanıcı için yakıt %30, aile için bagaj ve güvenlik %25 olabilir. Subjektif «beğendim» sütunu tutulabilir ancak TCO sütunu olmadan karar eksik kalır.',
      subsections: []
    },
    {
      heading: 'Donanım ve güvenlik kıyası',
      body: 'Aynı motor gücünde farklı donanım paketleri fiyatı değiştirir. Euro NCAP ve yerel güvenlik testleri referans alınabilir. Lastik ebatı ve jant boyutu hem konfor hem maliyet etkiler.',
      subsections: []
    },
    {
      heading: 'isteBul karşılaştırma merkezi',
      body: '/karsilastir/ akışı skor, maliyet farkı ve risk özetini yan yana sunar. Manuel tablo ile platform çıktısını çapraz doğrulayın.',
      subsections: []
    }
  ],
  'elektrikli-arac-alirken': [
    {
      heading: 'Menzil ve psikolojik tampon',
      body: 'Broşür menzili ideal koşullardadır. Kış, yüksek hız ve klima menzili %20–35 düşürebilir. Günlük rotanızın %80’ini kaplayan menzil seçin; sık DC şarj batarya ömrü tartışmalarına konu olabilir — üretici limitlerini okuyun.',
      subsections: []
    },
    {
      heading: 'Teşvik ve vergi (dönemsel)',
      body: 'ÖTV indirimi veya plaka avantajları döneme göre değişir; satın alma anındaki mevzuatı mali müşavirle teyit edin. Teşvik bitiş tarihi yakınsa TCO’ya «normal fiyat» senaryosu da ekleyin.',
      subsections: []
    },
    {
      heading: 'Hibrit geçiş stratejisi',
      body: 'Şarj altyapısı 1–2 yıl içinde kurulacaksa hibrit veya PHEV ara dönem çözümü olabilir. PHEV’de fiili elektrik kullanım oranı düşükse benzinli SUV ile benzer TCO çıkar.',
      subsections: []
    }
  ],
  'suv-mi-sedan-mi': [
    {
      heading: 'Park ve şehir planı',
      body: 'Dar otopark, köprü geçişi ve garaj yüksekliği SUV seçimini sınırlar. Kompakt SUV (B-SUV) sedan ile benzer footprint sunabilir; orta ve üst SUV sınıfında manevra maliyeti artar. Otomatik park sensörleri ve 360 kamera donanımı değer katar.',
      subsections: []
    },
    {
      heading: 'Uzun yol ve konfor',
      body: 'Yüksek oturma uzun yolda yorgunluğu azaltabilir; rüzgar gürültüsü modelden modele değişir. Sedan’da daha iyi yol tutuşu ve düşük profil lastik konforu tercih edilir. Süspansiyon ayarı (sport vs comfort) aile ihtiyacına göre seçilmeli.',
      subsections: []
    },
    {
      heading: 'İkinci el likidite',
      body: 'Popüler SUV modelleri hızlı satılabilir; niş SUV’lerde likidite düşük kalır. Sedan’da filo satışları piyasayı etkiler. Satış planınız 3 yıl içindeyse likidite sütununu matrise ekleyin.',
      subsections: []
    }
  ],
  'arac-finansman-secenekleri': [
    {
      heading: 'Bireysel vs kurumsal finansman',
      body: 'KOBİ araç alımında operasyonel leasing nakit akışını düzleştirir; bireysel tüketici genelde taşıt kredisi kullanır. Şirket aracında yakıt ve bakım faturaları muhasebeleşir; bireyselde tüm kalemler cebinizden çıkar. Her iki durumda da toplam geri ödeme tutarını yazılı alın.',
      subsections: []
    },
    {
      heading: 'Sigorta ve kredi paketleri',
      body: 'Bankanın «kredili kasko» paketi kolaylık sağlar; dışarıdan daha ucuz teklif mümkün olabilir. Paketi parçalayarak kıyaslayın. Hayat sigortası zorunluluğu toplam maliyeti artırır.',
      subsections: []
    },
    {
      heading: 'Nakit rezervi yönetimi',
      body: 'Peşin alım acil durum fonunu eritmemeli; en az 3–6 aylık gider rezervi bırakın. Kredi ile araç alıp rezervi korumak mantıklı olabilir; faiz maliyeti bu korumanın fiyatıdır.',
      subsections: []
    }
  ],
  'aylik-arac-butcesi-hesaplama': [
    {
      heading: 'Gelir oranı kuralları',
      body: 'Ulaşım gideri için gelirin %15–20’si üst sınır olarak kullanılabilir; bu oran barındırma maliyeti yüksek şehirlerde aşılabilir — kişisel risk toleransınıza göre ayarlayın. Taksit + işletme gideri bu tavanı geçmemeli.',
      subsections: []
    },
    {
      heading: 'Gizli aylık kalemler',
      body: 'Otopark, köprü-otoyol, yıkama, lastik değişimi (3–4 yılda bir), trafik cezası riski ve küçük onarımlar aylığa yayılmalıdır. EV’de şarj üyelikleri ve ev elektrik artışı ayrı satır olmalıdır.',
      subsections: []
    },
    {
      heading: 'Senaryo planlama',
      body: 'Faiz artışı (değişken faiz), yakıt fiyatı artışı ve sigorta prim artışı için %10 stres testi uygulayın. Stres testinden geçen bütçe sürdürülebilir kabul edilir.',
      subsections: []
    }
  ],
  'arac-alim-karar-asistani': [
    {
      heading: 'Karar asistanı ile geleneksel arama farkı',
      body: 'İlan sitelerinde filtreleme fiyat ve km ile başlar; ihtiyaç ve maliyet uyumu sonra düşünülür. Karar asistanı önce profil ve bütçe bandını çıkarır; böylece uyumsuz modellere zaman harcanmaz. Bu sıra değişimi özellikle ilk kez araç alanlar için hata oranını düşürür.',
      subsections: []
    },
    {
      heading: 'Skor ve güven bandı okuma',
      body: 'Yüksek skor düşük güvenle birlikte görülebilir — bu durumda soruları tamamlayın veya veriyi netleştirin. Skor tek başına «al» demez; alternatif listesi ve TCO bandı ile birlikte yorumlanır.',
      subsections: []
    },
    {
      heading: 'Partner ve lead akışı',
      body: 'Partner teklifleri yalnızca onayınızla paylaşılır. Lead sonrası ekspertiz ve sözleşme adımlarında profesyonel destek alın. Platform finansal aracı kurum değildir.',
      subsections: []
    }
  ],
  'ticari-arac-alimi-rehberi': [
    {
      heading: 'Hafif ticari vs binek farkları',
      body: 'Vergi, MTV, trafik kuralları ve sigorta sınıfları farklıdır. Binek araç gibi kullanılan ticari plakada sınırlamalar olabilir. Yük kapasitesi ve dingil yükü aşımı cezai risk doğurur.',
      subsections: []
    },
    {
      heading: 'Filo yenileme döngüsü',
      body: '3–5 yıllık leasing döngüsü bakım sürprizini azaltır. Yüksek km’de servis aralıkları kısalır. Yakıt kartı ve telematik veriler TCO kalibrasyonu için değerlidir.',
      subsections: []
    },
    {
      heading: 'ROI hesabı',
      body: 'Araç iş gelirine hizmet ediyorsa aylık kazanç artışı veya maliyet düşüşü araç gideriyle kıyaslanmalıdır. Panelvan ile pickup iş modeline göre seçilir.',
      subsections: []
    }
  ],
  'arac-sigortasi-karsilastirma': [
    {
      heading: 'Trafik ve kasko ayrımı',
      body: 'Zorunlu trafik sigortası temel üçüncü şahıs koruması sağlar; kasko kendi aracınızı kapsar. İkisi birlikte TCO’da sabit yıllık kalemdir. Hasarsızlık indirimi taşıyıcılar arası taşınmayabilir — geçişte kayıp yaşanır.',
      subsections: []
    },
    {
      heading: 'Muafiyet ve mini onarım',
      body: 'Düşük primli poliçede yüksek muafiyet küçük hasarda cebinizden ödeme demektir. Mini onarım ve cam kırılması teminatları şehir içi kullanımda sık devreye girer.',
      subsections: []
    },
    {
      heading: 'Prim artışını modelleme',
      body: 'Hasar sonrası prim artışını 3 yıllık TCO’ya yansıtın. Sürücü yaşı, il ve garaj tipi (kapalı/açık) primi değiştirir.',
      subsections: []
    }
  ]
};

function getLongformSections(slug) {
  return LONGFORM[slug] || [];
}

module.exports = { getLongformSections, LONGFORM };
