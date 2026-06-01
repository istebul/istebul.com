/**
 * Renders site_settings social URLs in [data-site-social-links] (footer).
 */

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', buildUrl: (v) => profileUrl('https://www.instagram.com/', v) },
  { key: 'twitter', label: 'X', buildUrl: (v) => profileUrl('https://x.com/', v) },
  { key: 'facebook', label: 'Facebook', buildUrl: (v) => profileUrl('https://www.facebook.com/', v) },
  { key: 'linkedin', label: 'LinkedIn', buildUrl: (v) => linkedinUrl(v) },
  { key: 'youtube', label: 'YouTube', buildUrl: (v) => youtubeUrl(v) },
  { key: 'tiktok', label: 'TikTok', buildUrl: (v) => profileUrl('https://www.tiktok.com/@', v, { atPrefix: true }) }
];

function profileUrl(base, raw, options = {}) {
  const v = String(raw || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  let handle = v.replace(/^@/, '').replace(/\s+/g, '');
  if (options.company && !handle.includes('/')) {
    handle = `company/${handle}`;
  }
  if (options.atPrefix && !handle.startsWith('@')) {
    return `${base}${handle}`;
  }
  return `${base}${handle}`;
}

function linkedinUrl(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  const path = v.replace(/^@/, '').replace(/^\//, '');
  if (/^(in|company)\//i.test(path)) return `https://www.linkedin.com/${path}`;
  return `https://www.linkedin.com/in/${path}`;
}

function youtubeUrl(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('@')) return `https://www.youtube.com/${v}`;
  if (/^UC[\w-]{20,}$/i.test(v)) return `https://www.youtube.com/channel/${v}`;
  return `https://www.youtube.com/@${v.replace(/^@/, '')}`;
}

export function buildSiteSocialLinks(settings = {}) {
  return PLATFORMS.map(({ key, label, buildUrl }) => {
    const href = buildUrl(settings[key]);
    if (!href) return null;
    try {
      const url = new URL(href);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
    } catch {
      return null;
    }
    return { key, label, href };
  }).filter(Boolean);
}

/**
 * @param {Record<string, string>} settings
 */
export function renderSiteSocialLinks(settings = {}) {
  const root = document.querySelector('[data-site-social-links]');
  if (!root) return;

  const links = buildSiteSocialLinks(settings);
  if (!links.length) {
    root.hidden = true;
    root.replaceChildren();
    return;
  }

  root.hidden = false;
  root.innerHTML = links
    .map(
      ({ key, label, href }) =>
        `<a class="ib-site-social__link ib-site-social__link--${key}" href="${escapeAttr(
          href
        )}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
    )
    .join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}
