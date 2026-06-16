/**
 * Listing gallery + video markup for detail and grid cards.
 */
import { resolveListingImages, resolveListingVideo } from '../features/listings/listing-media.js';
import { resolveTrustGatedListingImages } from './listing-trust-ui.js';

/**
 * @param {object} listing
 * @param {(s: string) => string} escapeHtml
 * @param {(url: string) => string} safeImageUrl
 */
export function renderListingGalleryHtml(listing, escapeHtml, safeImageUrl) {
  const esc = escapeHtml || ((s) => String(s ?? ''));
  const img = safeImageUrl || ((u) => u);
  const images = (resolveTrustGatedListingImages(listing) ?? resolveListingImages(listing)).map((url) =>
    img(url)
  );
  const video = resolveListingVideo(listing);
  const title = esc(listing.title || 'Araç seçeneği');

  const thumbs = images
    .map(
      (url, index) =>
        `<button type="button" class="listing-gallery-thumb${index === 0 ? ' is-active' : ''}" data-gallery-index="${index}" aria-label="Görsel ${index + 1}">
          <img src="${url}" alt="" loading="lazy" decoding="async" width="96" height="64">
        </button>`
    )
    .join('');

  return `<div class="listing-gallery" data-listing-gallery>
    <div class="listing-gallery-main">
      <img src="${images[0]}" alt="${title}" class="listing-gallery-hero" data-gallery-hero decoding="async" fetchpriority="high" width="960" height="540">
      ${video ? `<div class="listing-gallery-video" hidden data-gallery-video>
        <iframe src="${esc(video.embedUrl)}?rel=0" title="${title} — video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
      </div>` : ''}
      ${video ? `<button type="button" class="btn btn-outline btn-sm listing-gallery-video-toggle" data-action="toggle-listing-video" aria-expanded="false"><i data-lucide="play-circle"></i> Video turu</button>` : ''}
    </div>
    ${images.length > 1 ? `<div class="listing-gallery-thumbs" role="tablist" aria-label="Galeri">${thumbs}</div>` : ''}
  </div>`;
}

/**
 * @param {HTMLElement} root
 */
export function bindListingGallery(root) {
  if (!root) return;
  const gallery = root.querySelector('[data-listing-gallery]');
  if (!gallery) return;

  const hero = gallery.querySelector('[data-gallery-hero]');
  const videoWrap = gallery.querySelector('[data-gallery-video]');
  const videoToggle = gallery.querySelector('[data-action="toggle-listing-video"]');

  gallery.querySelectorAll('[data-gallery-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.galleryIndex) || 0;
      const img = btn.querySelector('img');
      if (hero && img?.src) hero.src = img.src;
      gallery.querySelectorAll('.listing-gallery-thumb').forEach((t) => t.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (videoWrap) videoWrap.hidden = true;
    });
  });

  videoToggle?.addEventListener('click', () => {
    if (!videoWrap) return;
    const show = videoWrap.hidden;
    videoWrap.hidden = !show;
    videoToggle.setAttribute('aria-expanded', show ? 'true' : 'false');
  });
}

/**
 * @param {object} listing
 */
export function listingMediaCount(listing) {
  const images = resolveTrustGatedListingImages(listing) ?? resolveListingImages(listing);
  const video = resolveListingVideo(listing);
  return images.length + (video ? 1 : 0);
}
