/**
 * P0-1 runtime görünürlük/kontrast guard yardımcıları (Playwright page.evaluate içinde kullanılır).
 */

export const MIN_CONTRAST_TEXT = 4.5;
export const MIN_CONTRAST_LARGE = 3;
export const MIN_CONTRAST_UI = 3;
export const CLIP_TOLERANCE_PX = 4;

function parseRgb(cssColor) {
  if (!cssColor || cssColor === 'transparent') return null;
  const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  const alpha = match[4] != null ? Number(match[4]) : 1;
  if (alpha <= 0.05) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: alpha
  };
}

function relativeLuminance({ r, g, b }) {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground, background) {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function blendChannel(fg, bg, alpha) {
  return Math.round(fg * alpha + bg * (1 - alpha));
}

function getEffectiveBackground(element) {
  let node = element;
  let foreground = null;

  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);
    const bg = parseRgb(style.backgroundColor);
    if (bg) {
      if (!foreground) {
        foreground = { r: bg.r, g: bg.g, b: bg.b };
      } else if (bg.a < 1) {
        foreground = {
          r: blendChannel(bg.r, foreground.r, bg.a),
          g: blendChannel(bg.g, foreground.g, bg.a),
          b: blendChannel(bg.b, foreground.b, bg.a)
        };
      } else {
        foreground = { r: bg.r, g: bg.g, b: bg.b };
      }
      if (bg.a >= 0.95) break;
    }
    node = node.parentElement;
  }

  return foreground || { r: 255, g: 255, b: 255 };
}

function getForegroundColor(element) {
  const color = parseRgb(getComputedStyle(element).color);
  return color ? { r: color.r, g: color.g, b: color.b } : null;
}

function isRenderedVisible(element) {
  if (!(element instanceof Element)) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (Number.parseFloat(style.opacity) < 0.05) return false;

  return true;
}

function hasSignificantTextClip(element, tolerance = CLIP_TOLERANCE_PX) {
  const style = getComputedStyle(element);
  const nowrap = style.whiteSpace === 'nowrap' || style.whiteSpace === 'pre';
  const overflowRisk =
    style.overflow === 'hidden' ||
    style.overflowX === 'hidden' ||
    style.textOverflow === 'ellipsis';
  if (!nowrap && !overflowRisk) return false;
  return element.scrollWidth > element.clientWidth + tolerance;
}

/**
 * @param {string} selector
 * @param {{ label?: string, minContrast?: number, requireText?: boolean, checkClip?: boolean }} [options]
 */
export function auditCriticalSelector(selector, options = {}) {
  const label = options.label || selector;
  const minContrast = options.minContrast ?? MIN_CONTRAST_TEXT;
  const requireText = options.requireText !== false;
  const checkClip = options.checkClip !== false;
  const issues = [];

  const element = document.querySelector(selector);
  if (!element) {
    return { selector, label, ok: false, issues: ['element bulunamadı'] };
  }

  if (!isRenderedVisible(element)) {
    issues.push('görünür değil (boyut/opacity/display)');
  }

  const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
  if (requireText && !text) {
    issues.push('textContent boş');
  }

  const fg = getForegroundColor(element);
  const bg = getEffectiveBackground(element);
  if (fg) {
    const ratio = contrastRatio(fg, bg);
    if (ratio < minContrast) {
      issues.push(`kontrast ${ratio.toFixed(2)} < ${minContrast}`);
    }
  } else {
    issues.push('ön plan rengi okunamadı');
  }

  if (checkClip && hasSignificantTextClip(element)) {
    issues.push(`nowrap/overflow kırpma riski (scroll ${element.scrollWidth} > client ${element.clientWidth})`);
  }

  return {
    selector,
    label,
    ok: issues.length === 0,
    issues,
    textPreview: text.slice(0, 80)
  };
}

/**
 * @param {Array<{ selector: string, label?: string, minContrast?: number, requireText?: boolean, checkClip?: boolean }>} targets
 */
export function auditCriticalSelectors(targets) {
  const results = targets.map((target) =>
    auditCriticalSelector(target.selector, {
      label: target.label,
      minContrast: target.minContrast,
      requireText: target.requireText,
      checkClip: target.checkClip
    })
  );
  const failures = results.filter((result) => !result.ok);
  return { results, failures, ok: failures.length === 0 };
}
