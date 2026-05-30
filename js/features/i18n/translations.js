// i18n Translation Files — extend per vertical; keys use dot notation in data-i18n
import { marketingCopy } from './marketing-copy.js';

function mergeLocale(base, extra) {
  return { ...base, ...extra };
}

export const translations = {
  tr: mergeLocale(
    {
      meta: { language: 'Dil', region: 'Bölge' },
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
        all: 'Tümü'
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
        haveAccount: 'Zaten hesabınız var mı?'
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
    marketingCopy.tr
  ),
  en: mergeLocale(
    {
      meta: { language: 'Language', region: 'Region' },
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
        all: 'All'
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
        haveAccount: 'Already have an account?'
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
    marketingCopy.en
  ),
  de: mergeLocale(
    {
      meta: { language: 'Sprache', region: 'Region' },
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
        all: 'Alle'
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
        haveAccount: 'Bereits registriert?'
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
    marketingCopy.de
  ),
  ar: mergeLocale(
    {
      meta: { language: 'اللغة', region: 'المنطقة' },
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
        all: 'الكل'
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
        haveAccount: 'لديك حساب بالفعل؟'
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
    marketingCopy.ar
  ),
  it: mergeLocale(
    {
      meta: { language: 'Lingua', region: 'Regione' },
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
        all: 'Tutti'
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
        haveAccount: 'Hai già un account?'
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
    marketingCopy.it
  ),
  fr: mergeLocale(
    {
      meta: { language: 'Langue', region: 'Région' },
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
        all: 'Tout'
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
        haveAccount: 'Déjà un compte ?'
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
    marketingCopy.fr
  ),
  es: mergeLocale(
    {
      meta: { language: 'Idioma', region: 'Región' },
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
        all: 'Todos'
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
        haveAccount: '¿Ya tiene cuenta?'
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
    marketingCopy.es
  ),
  ja: mergeLocale(
    {
      meta: { language: '言語', region: '地域' },
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
        all: 'すべて'
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
        haveAccount: 'すでにアカウントをお持ちですか？'
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
    marketingCopy.ja
  ),
  zh: mergeLocale(
    {
      meta: { language: '语言', region: '地区' },
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
        all: '全部'
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
        haveAccount: '已有账户？'
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
    },
    marketingCopy.zh
  )
};
