// Listing Feature Manager — decision options (ai_listings), not legacy marketplace listings
import { state } from '../../core/state.js';
import { monitoring } from '../../core/monitoring.js';
import {
    loadDecisionOptions,
    loadUserDecisionOptions
} from '../../core/decision-options-api.js';
import { submitUserListingToAiEngine } from '../../core/ai-listings-bridge.js';

export class ListingManager {
    constructor(ui, router) {
        this.ui = ui;
        this.router = router;
    }

    async loadListings(options = {}) {
        try {
            state.setLoading(true);
            const env = typeof window !== 'undefined' ? window.__env || {} : {};
            const listings =
                options.userId || options.ownedOnly
                    ? await loadUserDecisionOptions(options.userId, options)
                    : await loadDecisionOptions(env, options);
            state.setListings(listings || []);
            return listings;
        } catch (error) {
            console.error('Failed to load decision options:', error);
            monitoring.captureException(error, { context: 'loadListings', options });
            throw error;
        } finally {
            state.setLoading(false);
        }
    }

    async createListing(listingData) {
        try {
            state.setLoading(true);
            const env = typeof window !== 'undefined' ? window.__env || {} : {};
            if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
                throw new Error('Seçenek intake kullanılamıyor');
            }
            const result = await submitUserListingToAiEngine(listingData, {
                baseUrl: env.SUPABASE_URL,
                anonKey: env.SUPABASE_ANON_KEY
            });
            if (!result.ok) {
                throw new Error(result.message || 'Seçenek intake başarısız');
            }
            state.addListing(result.data);
            return result.data;
        } catch (error) {
            console.error('Failed to submit decision option:', error);
            monitoring.captureException(error, { context: 'createListing', listingData });
            throw error;
        } finally {
            state.setLoading(false);
        }
    }

    async deleteListing(listingId) {
        console.warn('deleteListing: legacy listings table retired — no-op for', listingId);
        state.removeListing(listingId);
        return true;
    }
}

export default ListingManager;
