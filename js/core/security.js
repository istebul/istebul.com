export const escapeHtml = (value = '') => {
    const text = String(value ?? '');
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

export const safeUrl = (url, fallback = 'https://www.sahibinden.com/') => {
    if (!url) return fallback;

    try {
        const parsed = new URL(String(url), window.location.origin);
        if (['http:', 'https:'].includes(parsed.protocol)) {
            return escapeHtml(parsed.href);
        }
    } catch (error) {
        return fallback;
    }

    return fallback;
};

export const safeImageUrl = (url, fallback = '/assets/images/placeholder.svg') => {
    if (!url) return fallback;

    try {
        const parsed = new URL(String(url), window.location.origin);
        if (['http:', 'https:'].includes(parsed.protocol)) {
            return escapeHtml(parsed.href);
        }
    } catch (error) {
        return fallback;
    }

    return fallback;
};
