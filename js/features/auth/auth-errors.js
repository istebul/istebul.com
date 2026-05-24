const AUTH_ERROR_MAP = [
    { match: /invalid login credentials/i, message: 'E-posta veya şifre hatalı. Bilgilerinizi kontrol edip tekrar deneyin.' },
    { match: /email not confirmed/i, message: 'E-posta adresiniz henüz doğrulanmamış. Gelen kutunuzu kontrol edin veya doğrulama e-postasını yeniden gönderin.' },
    { match: /user already registered/i, message: 'Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı deneyin.' },
    { match: /password should be at least/i, message: 'Şifreniz güvenlik gereksinimlerini karşılamıyor. En az 8 karakter ve harf/rakam içermelidir.' },
    { match: /rate limit|too many requests/i, message: 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.' },
    { match: /network|fetch failed|failed to fetch/i, message: 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.' },
    { match: /signup is disabled/i, message: 'Yeni kayıt şu anda kapalı. Destek ekibiyle iletişime geçin.' },
    { match: /email address invalid/i, message: 'Geçerli bir kurumsal veya kişisel e-posta adresi girin.' }
];

export function mapAuthError(error, fallback = 'İşlem tamamlanamadı. Lütfen tekrar deneyin.') {
    const raw = (error?.message || error?.msg || error || '').toString();
    if (!raw) return fallback;

    const hit = AUTH_ERROR_MAP.find((entry) => entry.match.test(raw));
    return hit?.message || raw;
}

/**
 * Auth errors when user is mid–Pro checkout (intent preserved in sessionStorage).
 */
export function mapAuthErrorForCheckout(error, fallback = 'İşlem tamamlanamadı. Lütfen tekrar deneyin.') {
    const raw = (error?.message || error?.msg || error || '').toString();
    const base = mapAuthError(error, fallback);

    if (/email not confirmed/i.test(raw)) {
        return `${base} Pro ödeme adımınız kayıtlı — e-postanızı doğruladıktan sonra giriş yaparak Stripe ile devam edebilirsiniz.`;
    }
    return base;
}

export function validatePassword(password, rules = {}) {
    const minLength = rules.minLength || 8;
    const issues = [];

    if (!password || password.length < minLength) {
        issues.push(`En az ${minLength} karakter`);
    }
    if (rules.requireUppercase && !/[A-ZÇĞİÖŞÜ]/.test(password)) {
        issues.push('En az bir büyük harf');
    }
    if (rules.requireLowercase && !/[a-zçğıöşü]/.test(password)) {
        issues.push('En az bir küçük harf');
    }
    if (rules.requireNumbers && !/\d/.test(password)) {
        issues.push('En az bir rakam');
    }

    return {
        valid: issues.length === 0,
        issues
    };
}
