/**
 * P4.4 — Conversion micro-UX copy (single source for CTA, loading, trust, errors).
 */

export const CONVERSION_COPY = Object.freeze({
  nav: {
    login: 'Hesabına gir',
    register: 'Analizini kaydet',
    registerTitle: 'Analizini kaydet ve devam et',
    autoCta: 'Ücretsiz maliyet analizi'
  },
  mobileNav: {
    login: 'Hesabına gir',
    register: 'Analizini kaydet ve devam et'
  },
  auth: {
    loginTitle: 'Hesabına gir',
    registerTitle: 'Analizini kaydet ve devam et',
    checkoutLoginTitle: 'Pro ödemesine giriş yapın',
    checkoutRegisterTitle: 'Pro için hesabınızı oluşturun',
    loginSubmit: 'Devam et',
    registerSubmit: 'Analizini kaydet ve devam et',
    loginBusy: 'Girişiniz doğrulanıyor…',
    registerBusy: 'Hesabınız hazırlanıyor…',
    resetBusy: 'Bağlantı gönderiliyor…',
    switchToRegister: 'Hesap oluştur',
    switchToLogin: 'Zaten hesabım var',
    loginFailed: 'Giriş tamamlanamadı. E-posta ve şifrenizi kontrol edip tekrar deneyin.',
    successCheckoutLogin: 'Giriş tamam. Güvenli ödeme sayfasına yönlendiriliyorsunuz…',
    successCheckoutRegister: 'Hesabınız hazır. Ödeme sayfasına yönlendiriliyorsunuz…',
    successRegister: 'Hoş geldiniz — karar geçmişiniz hesabınıza bağlandı.',
    successRegisterVerify:
      'Hesabınız oluşturuldu. E-posta doğrulaması gerekiyorsa gelen kutunuzu kontrol edin.',
    successRegisterVerifyCheckout:
      'Hesabınız hazır. Doğrulama gerekiyorsa e-postanızı kontrol edin — Pro adımınız kayıtlı kalır.',
    successReset: 'Sıfırlama bağlantısı e-postanıza gönderildi. Gelen kutusu ve spam klasörünü kontrol edin.',
    checkoutIntentBanner:
      'Pro ödeme adımı — 7 gün ücretsiz deneme · Stripe ile güvenli ödeme · İstediğiniz zaman iptal. Kart bilgileri sunucularımızda tutulmaz.'
  },
  checkout: {
    buttonLoading: 'Güvenli ödeme sayfası hazırlanıyor…',
    sessionRequired: 'Ödemeye devam etmek için giriş yapın — seçtiğiniz plan kayıtlı kalır.',
    failed: 'Ödeme sayfası açılamadı. Bağlantı veya kart bilgisi sorunu olabilir; kısa süre sonra tekrar deneyin.',
    billingPortalRequired: 'Abonelik yönetimi için giriş yapmanız gerekiyor.'
  },
  profile: {
    loginCta: 'Hesabına gir veya analizini kaydet'
  },
  account: {
    login: 'Hesabına gir',
    register: 'Analizini kaydet'
  },
  trust: {
    hero:
      'Ücretsiz · ~2 dk · KVKK uyumlu · bağlayıcı teklif değil — metodolojik destek',
    sticky: 'Skor ve TCO kural tabanlı · AI yalnızca gerekçe · ödeme Stripe ile',
    pricing:
      '7 gün deneme · iptal tek tık · fatura ve abonelik Stripe müşteri panelinden'
  },
  auto: {
    loadingKicker: 'Karar analizi hazırlanıyor',
    loadingTitle: 'Toplam maliyet ve uyum skorunuz hesaplanıyor',
    loadingBody:
      'Bütçe, kullanım, yakıt ve finansman yanıtlarınız modele işleniyor — genelde birkaç saniye.',
    loadingFootnote: 'Sonuçlar bilgilendirme amaçlıdır; canlı ilan veya bağlayıcı teklif değildir.',
    wizardLastStep: 'Son adım — sonuçlar birazdan hazır',
    wizardRemaining: (n) => `Sonuca ${n} kısa adım kaldı`,
    wizardProgress: (pct) => `%${pct} tamamlandı — yaklaşık 1 dakika`,
    wizardFinish: 'Analizi başlat',
    wizardNext: 'Devam et'
  },
  plans: {
    trialCheckoutSuffix: '— risk almadan dene',
    monthlyCheckout: 'Aylık Pro — karar netliğini aç',
    annualCheckout: 'Yıllık Pro — aylık ₺239 ile devam et'
  }
});

export function getAuthModalTitle(type, intentCheckout) {
  const c = CONVERSION_COPY.auth;
  if (intentCheckout) {
    return type === 'register' ? c.checkoutRegisterTitle : c.checkoutLoginTitle;
  }
  return type === 'login' ? c.loginTitle : c.registerTitle;
}
