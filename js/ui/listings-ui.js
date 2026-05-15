export class ListingsUI {
    renderListings(listings, favoriteIds = [], comparisonSignatures = [], options = {}) {
        const container = document.getElementById('listings-grid');
        if (!container) return;

        const comparedSignatures = new Set((Array.isArray(comparisonSignatures) ? comparisonSignatures : []).map(String));

        if (listings.length === 0) {
            const ownedOnly = !!(options.ownedOnly || options.userId);
            container.innerHTML = ownedOnly ? `
                <div class="empty-state marketplace-empty-state">
                    <i data-lucide="badge-plus"></i>
                    <h3>Henüz ilanınız yok</h3>
                    <p>İlk ilanınızı eklediğinizde burada görünecek ve AI karşılaştırma akışına dahil olacak.</p>
                    <a href="/ilan-ekle" class="btn btn-primary"><i data-lucide="plus"></i> Öneri Oluştur</a>
                </div>
            ` : `
                <div class="empty-state marketplace-empty-state">
                    <i data-lucide="search"></i>
                    <h3>İlan bulunamadı</h3>
                    <p>Filtreleri genişletin veya karar asistanından gelen önerilere göre tekrar arayın.</p>
                    <a href="/karar-asistani" class="btn btn-outline"><i data-lucide="sparkles"></i> AI Asistanı Aç</a>
                </div>
            `;
        } else {
            container.innerHTML = listings.map(listing => {
                const listingId = this.escapeHtml(listing.id);
                const imageUrl = this.safeImageUrl(listing.images?.[0]);
                const externalUrl = this.safeExternalUrl(listing.external_url);
                const isFavorite = favoriteIds.includes(listing.id.toString());
                const isCompared = comparedSignatures.has(this.getListingComparisonSignature(listing));
                const aiScore = this.getListingQualityScore(listing);
                const categoryLabel = this.getCategoryLabel(listing.category || '');
                const locationLabel = this.getListingLocationLabel(listing);
                const actionLabel = this.getListingPrimaryActionLabel(listing.category || '');
                return `
                <div class="listing-card" data-listing-id="${listingId}">
                    <div class="listing-media">
                        <img src="${imageUrl}"
                             alt="${this.escapeHtml(listing.title)}"
                             class="listing-image"
                            >
                        <div class="listing-badges">
                            <span class="listing-ai-score"><i data-lucide="sparkles"></i> AI ${this.escapeHtml(aiScore)}/100</span>
                            <span>${this.escapeHtml(categoryLabel || 'İlan')}</span>
                        </div>
                    </div>
                    <div class="listing-content">
                        <h3 class="listing-title">${this.escapeHtml(listing.title)}</h3>
                        <p class="listing-price">${this.formatPrice(listing.price)} ₺</p>
                        <div class="listing-meta">
                            <span>${this.escapeHtml(locationLabel)}</span>
                            <span>${this.formatDate(listing.created_at)}</span>
                        </div>
                        ${this.getListingInsightsMarkup(listing, aiScore)}
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
                            <a href="${externalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary external-btn"><i data-lucide="external-link"></i> ${this.escapeHtml(actionLabel)}</a>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        }

        this.loadIcons();
    }

}

let installed = false;

export function installListingsUI(UIManagerClass) {
    if (installed) return;
    installed = true;

    for (const name of Object.getOwnPropertyNames(ListingsUI.prototype)) {
        if (name === 'constructor') continue;
        UIManagerClass.prototype[name] = ListingsUI.prototype[name];
    }
}
