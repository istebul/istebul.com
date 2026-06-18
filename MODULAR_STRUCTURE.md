# isteBu v2 - Modüler Yapı

## 🏗 Mimari Genel Bakış

isteBu v2, modern web uygulamaları için modüler bir mimari kullanır. Her özellik bağımsız modüller halinde organize edilmiştir.

## 📦 Modül Yapısı

### Core Modülleri (`js/core/`)

#### `supabase.js`
- **Amaç**: Supabase istemcisi ve temel bağlantı
- **Bağımlılıklar**: Supabase JS SDK
- **İhracat**: `supabase` client instance

#### `config.js`
- **Amaç**: Uygulama yapılandırması
- **İçerik**: API endpoints, UI settings, validation rules
- **Kullanım**: Tüm modüller tarafından import edilir

#### `state.js`
- **Amaç**: Global state yönetimi
- **Pattern**: Observer pattern
- **Özellikler**: Reactive state, listeners, persistence

#### `router.js`
- **Amaç**: Client-side routing
- **Özellikler**: History API, route matching, navigation

#### `api.js`
- **Amaç**: API abstraction layer
- **Pattern**: Repository pattern
- **Özellikler**: CRUD operations, error handling

#### `utils.js`
- **Amaç**: Utility functions
- **Kategoriler**: Validation, formatting, DOM manipulation

### Feature Modülleri (`js/features/`)

#### `auth/`
```
auth/
├── auth.js          # Ana auth manager
├── login.js         # Login component
├── register.js      # Register component
└── profile.js       # Profile management
```

#### `ilan/` (removed — P0-5)

Dead `ListingManager` (`ilan.js`) removed. Active listing/decision-option runtime lives in `js/app.js` with `js/core/api.js` and `js/core/decision-options-api.js`. Future modularization is tracked in the P0-3 `app.js` split plan.

#### `profil/` (partial)

```
profil/
├── user-dashboard.js  # User dashboard helpers (active)
└── profil.js          # REMOVED — dead ProfileManager (P0-5)
```

Profile updates run through `js/features/account/account.js` → `API.updateProfile`. Future profile module extraction belongs in the P0-3 `app.js` split plan.

#### `admin/`
```
admin/
├── admin.js         # Admin panel
├── users.js         # User management
├── listings.js      # Listing moderation
├── analytics.js     # Analytics dashboard
└── settings.js      # System settings
```

#### `quiz/`
```
quiz/
├── quiz.js          # Quiz manager
├── questions.js     # Question management
├── results.js       # Results display
└── leaderboard.js   # Leaderboard
```

### UI Modülleri (`js/ui/`)

#### `ui.js`
- **Amaç**: UI management ve components
- **Özellikler**: Modal, notifications, responsive design

## 🔄 Veri Akışı

```
User Action → Feature Module → API Module → Supabase
                                      ↓
UI Module ← State Module ← Feature Module
```

## 📋 Modül Arayüzleri

### Auth Module Interface
```javascript
class AuthManager {
  async login(email, password) {}
  async register(userData) {}
  async logout() {}
  getCurrentUser() {}
  onAuthStateChange(callback) {}
}
```

### API Module Interface
```javascript
class API {
  static async getListings(filters) {}
  static async createListing(data) {}
  static async updateProfile(userId, data) {}
  static async uploadImage(file) {}
}
```

### State Module Interface
```javascript
class StateManager {
  get(path) {}
  set(path, value) {}
  subscribe(path, callback) {}
  setUser(user) {}
  setListings(listings) {}
}
```

## 🎯 Modül İletişimi

### Events
- `userLoggedIn` - Kullanıcı giriş yaptı
- `userLoggedOut` - Kullanıcı çıkış yaptı
- `listingCreated` - İlan oluşturuldu
- `filterChanged` - Filtre değişti

### State Subscriptions
```javascript
state.subscribe('user', (user) => {
  // User state changed
});

state.subscribe('listings', (listings) => {
  // Listings updated
});
```

## 🔧 Modül Bağımlılıkları

### Core Dependencies
```
app.js
├── supabase.js
├── config.js
├── state.js
├── router.js
├── api.js
└── utils.js
```

### Feature Dependencies
```
auth.js → [api.js, state.js, ui.js]
account.js → [api.js, ui.js, auth.js]  # profile save via API.updateProfile
app.js → [api.js, decision-options-api.js, …]  # active listing runtime
admin.js → [api.js, state.js, ui.js, utils.js]
quiz.js → [api.js, state.js, ui.js]
```

## 🚀 Modül Yükleme

### ES6 Modules
```javascript
// Dynamic imports for code splitting
const auth = await import('./features/auth/auth.js');
const account = await import('./features/account/account.js');
```

### Lazy Loading
```javascript
// Load features on demand
if (route === '/admin') {
  const admin = await import('./features/admin/admin.js');
  admin.init();
}
```

## 🧪 Test Yapısı

```
__tests__/
├── core/
├── features/
├── ui/
└── integration/
```

## 📈 Ölçeklendirme

### Yeni Özellik Ekleme
1. `js/features/` altında yeni klasör oluştur
2. Feature modülünü oluştur
3. `app.js`'e import ekle
4. Router'da route ekle
5. UI component'lerini ekle

### Performans Optimizasyonları
- Code splitting
- Tree shaking
- Lazy loading
- Bundle analysis

## 🔒 Güvenlik

### Modül Seviyesi Güvenlik
- Input validation her modülde
- API calls'da authentication check
- State access kontrolü
- XSS prevention

### Data Flow Security
```
Input → Validation → Sanitization → API → Database
```

## 📚 Dokümantasyon

### Kod Dokümantasyonu
- JSDoc comments
- TypeScript definitions
- API documentation
- Usage examples

### Mimari Dokümantasyonu
- Module interfaces
- Data flow diagrams
- Dependency graphs
- Security guidelines