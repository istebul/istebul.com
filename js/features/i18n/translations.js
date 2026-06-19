// Core i18n strings — marketing/wizard copy loads lazily per locale bundle.
function mergeLocale(base, extra) {
  return { ...base, ...extra };
}

const coreByLocale = {
  tr: {
    meta: { language: 'Dil', region: 'Bölge', otherLanguages: 'Diğer diller' },
    common: {
      loading: 'Yükleniyor...',
      error: 'Bir hata oluştu',
      success: 'İşlem başarılı',
      save: 'Kaydet',
      cancel: 'İptal',
      delete: 'Sil',
      edit: 'Düzenle',
      search: 'Ara',
      filter: 'Filtrele',
      all: 'Tümü',
      closeModal: 'Pencereyi kapat'
    },
    auth: {
      login: 'Giriş Yap',
      register: 'Üye Ol',
      logout: 'Çıkış Yap',
      email: 'E-posta',
      password: 'Şifre',
      fullName: 'Ad Soyad',
      forgotPassword: 'Şifremi Unuttum',
      noAccount: 'Hesabınız yok mu?',
      haveAccount: 'Zaten hesabınız var mı?',
      loginTitle: 'Hesabına gir',
      registerTitle: 'Analizini kaydet ve devam et',
      checkoutLoginTitle: 'Pro ödemesine giriş yapın',
      checkoutRegisterTitle: 'Pro için hesabınızı oluşturun',
      switchToRegister: 'Hesap oluştur',
      switchToLogin: 'Zaten hesabım var',
      resetPassword: 'Sıfırlayın',
      forgotPrompt: 'Şifrenizi mi unuttunuz?'
    },
    listings: {
      title: 'Seçenekler',
      addListing: 'İlan Ekle',
      myListings: 'Seçeneklerim',
      favorites: 'Favorilerim',
      price: 'Fiyat',
      location: 'Konum',
      category: 'Kategori',
      description: 'Açıklama',
      publish: 'Yayınla'
    }
  },
  en: {
    meta: { language: 'Language', region: 'Region', otherLanguages: 'Other languages' },
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Operation successful',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      search: 'Search',
      filter: 'Filter',
      all: 'All',
      closeModal: 'Close dialog'
    },
    auth: {
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      fullName: 'Full Name',
      forgotPassword: 'Forgot Password',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      loginTitle: 'Sign in to your account',
      registerTitle: 'Save your analysis and continue',
      checkoutLoginTitle: 'Sign in for Pro checkout',
      checkoutRegisterTitle: 'Create your account for Pro',
      switchToRegister: 'Create account',
      switchToLogin: 'I already have an account',
      resetPassword: 'Reset it',
      forgotPrompt: 'Forgot your password?'
    },
    listings: {
      title: 'Listings',
      addListing: 'Add Listing',
      myListings: 'My Listings',
      favorites: 'My Favorites',
      price: 'Price',
      location: 'Location',
      category: 'Category',
      description: 'Description',
      publish: 'Publish'
    }
  },
  de: {
    meta: { language: 'Sprache', region: 'Region', otherLanguages: 'Weitere Sprachen' },
    common: {
      loading: 'Wird geladen...',
      error: 'Ein Fehler ist aufgetreten',
      success: 'Erfolgreich',
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      search: 'Suchen',
      filter: 'Filter',
      all: 'Alle',
      closeModal: 'Dialog schließen'
    },
    auth: {
      login: 'Anmelden',
      register: 'Registrieren',
      logout: 'Abmelden',
      email: 'E-Mail',
      password: 'Passwort',
      fullName: 'Name',
      forgotPassword: 'Passwort vergessen',
      noAccount: 'Noch kein Konto?',
      haveAccount: 'Bereits registriert?',
      loginTitle: 'Bei Ihrem Konto anmelden',
      registerTitle: 'Analyse speichern und fortfahren',
      checkoutLoginTitle: 'Für Pro-Checkout anmelden',
      checkoutRegisterTitle: 'Konto für Pro erstellen',
      switchToRegister: 'Konto erstellen',
      switchToLogin: 'Ich habe bereits ein Konto',
      resetPassword: 'Zurücksetzen',
      forgotPrompt: 'Passwort vergessen?'
    },
    listings: {
      title: 'Angebote',
      addListing: 'Angebot hinzufügen',
      myListings: 'Meine Angebote',
      favorites: 'Favoriten',
      price: 'Preis',
      location: 'Standort',
      category: 'Kategorie',
      description: 'Beschreibung',
      publish: 'Veröffentlichen'
    }
  },
  ar: {
    meta: { language: 'اللغة', region: 'المنطقة', otherLanguages: 'لغات أخرى' },
    common: {
      loading: 'جاري التحميل...',
      error: 'حدث خطأ',
      success: 'تم بنجاح',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      search: 'بحث',
      filter: 'تصفية',
      all: 'الكل',
      closeModal: 'إغلاق النافذة'
    },
    auth: {
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      logout: 'تسجيل الخروج',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      fullName: 'الاسم',
      forgotPassword: 'نسيت كلمة المرور',
      noAccount: 'ليس لديك حساب؟',
      haveAccount: 'لديك حساب بالفعل؟',
      loginTitle: 'سجّل الدخول إلى حسابك',
      registerTitle: 'احفظ تحليلك وتابع',
      checkoutLoginTitle: 'سجّل الدخول لدفع Pro',
      checkoutRegisterTitle: 'أنشئ حسابًا لـ Pro',
      switchToRegister: 'إنشاء حساب',
      switchToLogin: 'لدي حساب بالفعل',
      resetPassword: 'إعادة التعيين',
      forgotPrompt: 'نسيت كلمة المرور؟'
    },
    listings: {
      title: 'القوائم',
      addListing: 'إضافة',
      myListings: 'قوائمي',
      favorites: 'المفضلة',
      price: 'السعر',
      location: 'الموقع',
      category: 'الفئة',
      description: 'الوصف',
      publish: 'نشر'
    }
  },
  it: {
    meta: { language: 'Lingua', region: 'Regione', otherLanguages: 'Altre lingue' },
    common: {
      loading: 'Caricamento...',
      error: 'Si è verificato un errore',
      success: 'Operazione riuscita',
      save: 'Salva',
      cancel: 'Annulla',
      delete: 'Elimina',
      edit: 'Modifica',
      search: 'Cerca',
      filter: 'Filtra',
      all: 'Tutti',
      closeModal: 'Chiudi finestra'
    },
    auth: {
      login: 'Accedi',
      register: 'Registrati',
      logout: 'Esci',
      email: 'Email',
      password: 'Password',
      fullName: 'Nome completo',
      forgotPassword: 'Password dimenticata',
      noAccount: 'Non hai un account?',
      haveAccount: 'Hai già un account?',
      loginTitle: 'Accedi al tuo account',
      registerTitle: 'Salva l\'analisi e continua',
      checkoutLoginTitle: 'Accedi per il checkout Pro',
      checkoutRegisterTitle: 'Crea account per Pro',
      switchToRegister: 'Crea account',
      switchToLogin: 'Ho già un account',
      resetPassword: 'Reimposta',
      forgotPrompt: 'Password dimenticata?'
    },
    listings: {
      title: 'Opzioni',
      addListing: 'Aggiungi opzione',
      myListings: 'Le mie opzioni',
      favorites: 'Preferiti',
      price: 'Prezzo',
      location: 'Posizione',
      category: 'Categoria',
      description: 'Descrizione',
      publish: 'Pubblica'
    }
  },
  fr: {
    meta: { language: 'Langue', region: 'Région', otherLanguages: 'Autres langues' },
    common: {
      loading: 'Chargement...',
      error: 'Une erreur est survenue',
      success: 'Opération réussie',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      search: 'Rechercher',
      filter: 'Filtrer',
      all: 'Tout',
      closeModal: 'Fermer la fenêtre'
    },
    auth: {
      login: 'Connexion',
      register: 'Inscription',
      logout: 'Déconnexion',
      email: 'E-mail',
      password: 'Mot de passe',
      fullName: 'Nom complet',
      forgotPassword: 'Mot de passe oublié',
      noAccount: 'Pas de compte ?',
      haveAccount: 'Déjà un compte ?',
      loginTitle: 'Connectez-vous à votre compte',
      registerTitle: 'Enregistrez votre analyse et continuez',
      checkoutLoginTitle: 'Connexion pour le paiement Pro',
      checkoutRegisterTitle: 'Créez un compte pour Pro',
      switchToRegister: 'Créer un compte',
      switchToLogin: 'J\'ai déjà un compte',
      resetPassword: 'Réinitialiser',
      forgotPrompt: 'Mot de passe oublié ?'
    },
    listings: {
      title: 'Options',
      addListing: 'Ajouter une option',
      myListings: 'Mes options',
      favorites: 'Favoris',
      price: 'Prix',
      location: 'Emplacement',
      category: 'Catégorie',
      description: 'Description',
      publish: 'Publier'
    }
  },
  es: {
    meta: { language: 'Idioma', region: 'Región', otherLanguages: 'Otros idiomas' },
    common: {
      loading: 'Cargando...',
      error: 'Se produjo un error',
      success: 'Operación exitosa',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      search: 'Buscar',
      filter: 'Filtrar',
      all: 'Todos',
      closeModal: 'Cerrar ventana'
    },
    auth: {
      login: 'Iniciar sesión',
      register: 'Registrarse',
      logout: 'Cerrar sesión',
      email: 'Correo electrónico',
      password: 'Contraseña',
      fullName: 'Nombre completo',
      forgotPassword: 'Olvidé mi contraseña',
      noAccount: '¿No tiene cuenta?',
      haveAccount: '¿Ya tiene cuenta?',
      loginTitle: 'Inicie sesión en su cuenta',
      registerTitle: 'Guarde su análisis y continúe',
      checkoutLoginTitle: 'Inicie sesión para pagar Pro',
      checkoutRegisterTitle: 'Cree una cuenta para Pro',
      switchToRegister: 'Crear cuenta',
      switchToLogin: 'Ya tengo cuenta',
      resetPassword: 'Restablecer',
      forgotPrompt: '¿Olvidó su contraseña?'
    },
    listings: {
      title: 'Opciones',
      addListing: 'Añadir opción',
      myListings: 'Mis opciones',
      favorites: 'Favoritos',
      price: 'Precio',
      location: 'Ubicación',
      category: 'Categoría',
      description: 'Descripción',
      publish: 'Publicar'
    }
  },
  ja: {
    meta: { language: '言語', region: '地域', otherLanguages: '他の言語' },
    common: {
      loading: '読み込み中...',
      error: 'エラーが発生しました',
      success: '成功しました',
      save: '保存',
      cancel: 'キャンセル',
      delete: '削除',
      edit: '編集',
      search: '検索',
      filter: 'フィルター',
      all: 'すべて',
      closeModal: 'ウィンドウを閉じる'
    },
    auth: {
      login: 'ログイン',
      register: '登録',
      logout: 'ログアウト',
      email: 'メール',
      password: 'パスワード',
      fullName: '氏名',
      forgotPassword: 'パスワードを忘れた',
      noAccount: 'アカウントをお持ちでないですか？',
      haveAccount: 'すでにアカウントをお持ちですか？',
      loginTitle: 'アカウントにログイン',
      registerTitle: '分析を保存して続行',
      checkoutLoginTitle: 'Pro決済のためにログイン',
      checkoutRegisterTitle: 'Pro用アカウントを作成',
      switchToRegister: 'アカウント作成',
      switchToLogin: 'すでにアカウントがあります',
      resetPassword: 'リセット',
      forgotPrompt: 'パスワードをお忘れですか？'
    },
    listings: {
      title: 'オプション',
      addListing: 'オプションを追加',
      myListings: 'マイオプション',
      favorites: 'お気に入り',
      price: '価格',
      location: '場所',
      category: 'カテゴリ',
      description: '説明',
      publish: '公開'
    }
  },
  zh: {
    meta: { language: '语言', region: '地区', otherLanguages: '其他语言' },
    common: {
      loading: '加载中...',
      error: '发生错误',
      success: '操作成功',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      search: '搜索',
      filter: '筛选',
      all: '全部',
      closeModal: '关闭窗口'
    },
    auth: {
      login: '登录',
      register: '注册',
      logout: '退出登录',
      email: '邮箱',
      password: '密码',
      fullName: '姓名',
      forgotPassword: '忘记密码',
      noAccount: '没有账户？',
      haveAccount: '已有账户？',
      loginTitle: '登录您的账户',
      registerTitle: '保存分析并继续',
      checkoutLoginTitle: '登录以进行 Pro 支付',
      checkoutRegisterTitle: '创建 Pro 账户',
      switchToRegister: '创建账户',
      switchToLogin: '已有账户',
      resetPassword: '重置',
      forgotPrompt: '忘记密码？'
    },
    listings: {
      title: '选项',
      addListing: '添加选项',
      myListings: '我的选项',
      favorites: '收藏',
      price: '价格',
      location: '位置',
      category: '类别',
      description: '描述',
      publish: '发布'
    }
  }
};

export const translations = Object.fromEntries(
  Object.entries(coreByLocale).map(([localeId, core]) => [localeId, mergeLocale(core)])
);

export function getCoreTranslations() {
  return translations;
}
