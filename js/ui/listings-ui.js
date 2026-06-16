import { bindListingVehicleImageFallbacks, listingMediaCount } from './listing-gallery-ui.js';
import { renderAiPlatformBanner } from './ai-platform-surface.js';
import {
    AI_SCORE_DISCLAIMER,
    buildListingTrustStripHtml,
    hasPublicSourceUrl,
    resolveListingTrustGatedImageUrl
} from './listing-trust-ui.js';

const VERTICAL_EMPTY_STATE_CTAS = Object.freeze({
    arac: { href: '/auto/', label: 'TCO analizini başlat', icon: 'car' },
    ev: { href: '/konut/', label: 'Konut tam analizine devam et', icon: 'home' },
    tatil: { href: '/tatil/', label: 'Tatil tam analizine devam et', icon: 'plane-takeoff' },
    finansman: { href: '/finans/', label: 'Finans tam analizine devam et', icon: 'landmark' },
    sigorta: { href: '/sigorta/', label: 'Sigorta tam analizine devam et', icon: 'shield' },
    kasko: { href: '/kasko/', label: 'Kasko tam analizine devam et', icon: 'shield-check' }
});

function resolveMarketplaceEmptyStateSecondaryCta(categoryId) {
    const vertical = VERTICAL_EMPTY_STATE_CTAS[categoryId] || VERTICAL_EMPTY_STATE_CTAS.arac;
    return {
        href: vertical.href,
        label: vertical.label,
        icon: vertical.icon
    };
}

export class ListingsUI {
    renderListings(listings, favoriteIds = [], comparisonSignatures = [], options = {}) {
        const container = document.getElementById('listings-grid');
        if (!container) return;

        const comparedSignatures = new Set((Array.isArray(comparisonSignatures) ? comparisonSignatures : []).map(String));

        if (listings.length === 0) {
            const ownedOnly = !!(options.ownedOnly || options.userId);
            const secondaryCta = resolveMarketplaceEmptyStateSecondaryCta(options.category || '');
            container.innerHTML = (ownedOnly ? `
                <div class="empty-state marketplace-empty-state">
                    <i data-lucide="badge-plus"></i>
                    <h3>Henüz kayıtlı seçeneğiniz yok</h3>
                    <p>İlk seçeneğinizi eklediğinizde burada görünür ve karşılaştırma akışına dahil olur.</p>
                    <a href="/ilan-analizi/" class="btn btn-primary"><i data-lucide="scan-search"></i> Seçenek analizi</a>
                    <a href="/ilan-ekle/" class="btn btn-outline"><i data-lucide="plus"></i> Seçenek gönder</a>
                </div>
            ` : `
                <div class="empty-state marketplace-empty-state">
                    <i data-lucide="search"></i>
                    <h3>Canlı seçenek bulunamadı veya filtre dar</h3>
                    <p>Bu alan yapay zeka destekli seçenek keşfi içindir — tam karar analizi ilgili kategori akışında yapılır. Ön değerlendirme için Karar Asistanı'na, tam analiz için kategori sihirbazına devam edin.</p>
                    <div class="empty-state-actions">
                      <a href="/karar-asistani/" class="btn btn-primary" data-native-route><i data-lucide="sparkles"></i> Ön değerlendirme başlat</a>
                      <a href="${this.escapeHtml(secondaryCta.href)}" class="btn btn-outline" data-native-route><i data-lucide="${this.escapeHtml(secondaryCta.icon)}"></i> ${this.escapeHtml(secondaryCta.label)}</a>
                      <a href="/karsilastir/" class="btn btn-outline" data-native-route>Karşılaştırma merkezi</a>
                    </div>
                </div>
            `);
        } else {
            const aiStrip = renderAiPlatformBanner({
                title: 'Yapay Zeka Destekli Seçenek Keşfi',
                subtitle: 'Her seçenek metodolojik uyum skoru ile sıralanır — tam analiz için ilgili kategori akışını kullanın.',
                variant: 'compact'
            });
            container.innerHTML = `<div class="listings-ai-strip">${aiStrip}</div>` + listings.map(listing => {
                const listingId = this.escapeHtml(listing.id);
                const trustGatedImageUrl = resolveListingTrustGatedImageUrl(listing);
                const imageUrl = this.safeImageUrl(
                    trustGatedImageUrl ?? listing.images?.[0]
                );
                const hasExternalSource = hasPublicSourceUrl(listing);
                const externalUrl = hasExternalSource
                    ? this.safeExternalUrl(listing.source_url ?? listing.external_url)
                    : '';
                const isFavorite = favoriteIds.includes(listing.id.toString());
                const isCompared = comparedSignatures.has(this.getListingComparisonSignature(listing));
                const aiScoreDisplay = this.resolveListingQualityScoreDisplay(listing);
                const categoryLabel = this.getCategoryLabel(listing.category || '');
                const locationLabel = this.getListingLocationLabel(listing);
                const actionLabel = this.getListingPrimaryActionLabel(listing.category || '');
                const mediaCount = listingMediaCount(listing);
                return `
                <div class="listing-card" data-listing-id="${listingId}">
                    <div class="listing-media">
                        <img src="${imageUrl}"
                             alt="${this.escapeHtml(listing.title)}"
                             class="listing-image"
                             loading="lazy"
                             decoding="async"
                             width="400"
                             height="250">
                        <div class="listing-badges">
                            ${aiScoreDisplay !== null ? `<span class="listing-ai-score" title="${this.escapeHtml(AI_SCORE_DISCLAIMER)}" aria-label="AI uyum ${this.escapeHtml(aiScoreDisplay)}/100. ${this.escapeHtml(AI_SCORE_DISCLAIMER)}"><i data-lucide="sparkles"></i> AI uyum ${this.escapeHtml(aiScoreDisplay)}/100</span>` : ''}
                            <span>${this.escapeHtml(categoryLabel || 'Seçenek')}</span>
                        </div>
                        ${mediaCount > 1 ? `<span class="listing-media-count"><i data-lucide="images"></i> ${mediaCount}</span>` : ''}
                    </div>
                    <div class="listing-content">
                        <h3 class="listing-title">${this.escapeHtml(listing.title)}</h3>
                        <p class="listing-price">${this.formatPrice(listing.price)}</p>
                        <div class="listing-meta">
                            <span>${this.escapeHtml(locationLabel)}</span>
                            <span>${this.formatDate(listing.created_at)}</span>
                        </div>
                        ${this.getListingInsightsMarkup(listing, aiScoreDisplay ?? undefined)}
                        ${buildListingTrustStripHtml(listing, { escapeHtml: (value) => this.escapeHtml(value) })}
                        <div class="listing-actions">
                            <button class="btn ${isFavorite ? 'btn-primary' : 'btn-outline'} favorite-btn" data-action="favorite">
                                <i data-lucide="heart"></i> ${isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                            </button>
                            <button class="btn btn-outline" data-action="detail" data-listing-id="${listingId}">
                                <i data-lucide="eye"></i> Detay
                            </button>
                            <button class="btn ${isCompared ? 'btn-primary' : 'btn-outline'}" data-action="compare" data-listing-id="${listingId}">
                                <i data-lucide="${isCompared ? 'check' : 'columns-3'}"></i> ${isCompared ? 'Karşılaştırmada' : 'Karşılaştır'}
                            </button>
                            ${hasExternalSource ? `<a href="${externalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary external-btn"><i data-lucide="external-link"></i> ${this.escapeHtml(actionLabel)}</a>` : ''}
                        </div>
                    </div>
                </div>
            `;
            }).join('');

            const cards = container.querySelectorAll?.('.listing-card[data-listing-id]');
            if (cards?.length) {
                listings.forEach((listing, index) => {
                    const card = cards[index];
                    if (card) bindListingVehicleImageFallbacks(card, listing);
                });
            }
        }

        this.loadIcons();
    }

}

const installedClasses = new WeakSet();

export function installListingsUI(UIManagerClass) {
    if (!UIManagerClass || installedClasses.has(UIManagerClass)) return;
    installedClasses.add(UIManagerClass);

    for (const name of Object.getOwnPropertyNames(ListingsUI.prototype)) {
        if (name === 'constructor') continue;
        UIManagerClass.prototype[name] = ListingsUI.prototype[name];
    }
}
