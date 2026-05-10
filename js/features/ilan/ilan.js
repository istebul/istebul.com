// Listing Feature Manager
import API from '../../core/api.js';
import { state } from '../../core/state.js';
import { monitoring } from '../../core/monitoring.js';

export class ListingManager {
    constructor(ui, router) {
        this.ui = ui;
        this.router = router;
    }

    async loadListings(options = {}) {
        try {
            state.setLoading(true);
            const listings = await API.getListings(options);
            state.setListings(listings || []);
            return listings;
        } catch (error) {
            console.error('Failed to load listings:', error);
            monitoring.captureException(error, { context: 'loadListings', options });
            throw error;
        } finally {
            state.setLoading(false);
        }
    }

    async createListing(listingData) {
        try {
            state.setLoading(true);
            const listing = await API.createListing(listingData);
            state.addListing(listing);
            return listing;
        } catch (error) {
            console.error('Failed to create listing:', error);
            monitoring.captureException(error, { context: 'createListing', listingData });
            throw error;
        } finally {
            state.setLoading(false);
        }
    }

    async deleteListing(listingId) {
        try {
            await API.deleteListing(listingId);
            state.removeListing(listingId);
            return true;
        } catch (error) {
            console.error('Failed to delete listing:', error);
            monitoring.captureException(error, { context: 'deleteListing', listingId });
            throw error;
        }
    }
}

export default ListingManager;
