# isteBu v2 - Kurulum Kılavuzu

## 🚀 Hızlı Başlangıç

### 1. Gereksinimler
- Node.js 18 veya üzeri
- npm veya yarn
- Supabase hesabı
- Netlify hesabı (dağıtım için)

### 2. Projeyi İndirin ve Kurun

```bash
git clone <repository-url>
cd istebu-v2-src
npm install
```

### 3. Ortam Değişkenlerini Ayarlayın

`.env.local` dosyasını oluşturun:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLAUDE_API_KEY=your-claude-api-key
```

### 4. Supabase Veritabanını Kurun

1. Supabase dashboard'a gidin
2. SQL Editor'ı açın
3. `supabase-setup.sql` dosyasının içeriğini çalıştırın

### 5. Geliştirme Sunucusunu Başlatın

```bash
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresini açın.

## 📁 Proje Yapısı

```
isteBu-v2-src/
├── index.html          # Ana HTML dosyası
├── css/style.css       # Ana stil dosyası
├── js/
│   ├── app.js         # Ana uygulama
│   ├── core/          # Çekirdek modüller
│   │   ├── supabase.js
│   │   ├── config.js
│   │   ├── state.js
│   │   ├── router.js
│   │   ├── api.js
│   │   └── utils.js
│   ├── features/      # Özellik modülleri
│   │   ├── auth/      # Kimlik doğrulama
│   │   ├── ilan/      # İlan yönetimi
│   │   ├── profil/    # Kullanıcı profili
│   │   ├── admin/     # Admin paneli
│   │   └── quiz/      # Quiz sistemi
│   └── ui/            # UI bileşenleri
├── netlify/
│   ├── functions/     # Sunucusuz fonksiyonlar
│   └── toml          # Netlify yapılandırması
└── assets/            # Statik dosyalar
```

## 🔧 Yapılandırma

### Supabase Ayarları

Proje aşağıdaki Supabase tablolarını kullanır:

- `profiles` - Kullanıcı profilleri
- `listings` - İlanlar
- `categories` - Kategoriler
- `quiz_questions` - Quiz soruları
- `quiz_answers` - Quiz cevapları
- `messages` - Mesajlar
- `favorites` - Favoriler
- `reports` - Raporlar

### Depolama Kovaları

- `images` - İlan görselleri için

## 🚀 Dağıtım

### Netlify ile Dağıtım

1. GitHub reposunu Netlify'e bağlayın
2. Build komutu: `npm run build`
3. Yayın dizini: `.`
4. Ortam değişkenlerini Netlify dashboard'da ayarlayın
5. Dağıtın!

### Manuel Dağıtım

```bash
npm run deploy
```

## 🧪 Test

```bash
npm test
```

## 🔧 Sorun Giderme

### Yaygın Problemler

1. **Supabase bağlantı hatası**
   - `.env.local` dosyasındaki URL ve anahtarları kontrol edin
   - Supabase projenizin aktif olduğundan emin olun

2. **Netlify fonksiyonları çalışmıyor**
   - `netlify.toml` yapılandırmasını kontrol edin
   - Ortam değişkenlerinin doğru ayarlandığından emin olun

3. **Resim yükleme hatası**
   - Supabase storage bucket'ının oluşturulduğunu kontrol edin
   - CORS ayarlarını kontrol edin

## 📞 Destek

Sorularınız için:
- Email: info@istebul.com
- GitHub Issues: [Repository linki]

## 🎯 Özellikler

- ✅ Kullanıcı kimlik doğrulama
- ✅ İlan oluşturma ve yönetimi
- ✅ Kategori sistemi
- ✅ Resim yükleme
- ✅ AI entegrasyonu (Claude)
- ✅ Admin paneli
- ✅ Quiz sistemi
- ✅ Responsive tasarım
- ✅ Gerçek zamanlı güncellemeler

## 🔄 Güncellemeler

Proje aktif olarak geliştirilmektedir. Güncellemeler için GitHub repository'sini takip edin.

---

**isteBu v2 - Modern Türk ilan platformu** 🏠🚗✈️