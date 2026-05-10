// State Management
export class StateManager {
    constructor() {
        this.state = {
            user: null,
            listings: [],
            categories: [],
            ui: {
                loading: false,
                modal: null,
                notifications: []
            },
            filters: {
                category: null,
                search: '',
                priceRange: null,
                location: null
            }
        };
        this.listeners = {};
    }

    // Get state
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }

    // Set state
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.state);

        const oldValue = target[lastKey];
        target[lastKey] = value;

        // Notify listeners
        this.notify(path, value, oldValue);
    }

    // Subscribe to state changes
    subscribe(path, callback) {
        if (!this.listeners[path]) {
            this.listeners[path] = [];
        }
        this.listeners[path].push(callback);

        // Return unsubscribe function
        return () => {
            this.listeners[path] = this.listeners[path].filter(cb => cb !== callback);
        };
    }

    // Notify listeners
    notify(path, newValue, oldValue) {
        if (this.listeners[path]) {
            this.listeners[path].forEach(callback => callback(newValue, oldValue));
        }

        // Also notify parent paths
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.listeners[parentPath]) {
                this.listeners[parentPath].forEach(callback => callback(newValue, oldValue));
            }
        }
    }

    // Update user state
    setUser(user) {
        this.set('user', user);
    }

    // Update listings
    setListings(listings) {
        this.set('listings', listings);
    }

    // Add listing
    addListing(listing) {
        const listings = [...this.get('listings'), listing];
        this.set('listings', listings);
    }

    // Update listing
    updateListing(listingId, updates) {
        const listings = this.get('listings').map(listing =>
            listing.id === listingId ? { ...listing, ...updates } : listing
        );
        this.set('listings', listings);
    }

    // Remove listing
    removeListing(listingId) {
        const listings = this.get('listings').filter(listing => listing.id !== listingId);
        this.set('listings', listings);
    }

    // Set loading state
    setLoading(loading) {
        this.set('ui.loading', loading);
    }

    // Set active modal
    setModal(modal) {
        this.set('ui.modal', modal);
    }

    getModal() {
        return this.get('ui.modal');
    }

    // Add notification
    addNotification(notification) {
        const notifications = [...this.get('ui.notifications'), {
            id: Date.now(),
            ...notification
        }];
        this.set('ui.notifications', notifications);

        // Auto remove after 5 seconds
        setTimeout(() => {
            this.removeNotification(notification.id);
        }, 5000);
    }

    // Remove notification
    removeNotification(notificationId) {
        const notifications = this.get('ui.notifications').filter(n => n.id !== notificationId);
        this.set('ui.notifications', notifications);
    }

    // Set filters
    setFilters(filters) {
        this.set('filters', { ...this.get('filters'), ...filters });
    }

    // Clear filters
    clearFilters() {
        this.set('filters', {
            category: null,
            search: '',
            priceRange: null,
            location: null
        });
    }

    // Get filtered listings
    getFilteredListings() {
        let listings = [...this.get('listings')];
        const filters = this.get('filters');

        if (filters.category) {
            listings = listings.filter(listing => listing.category === filters.category);
        }

        if (filters.search) {
            const search = filters.search.toLowerCase();
            listings = listings.filter(listing =>
                listing.title.toLowerCase().includes(search) ||
                listing.description.toLowerCase().includes(search)
            );
        }

        if (filters.priceRange) {
            const [min, max] = filters.priceRange;
            listings = listings.filter(listing => {
                const price = listing.price;
                return price >= min && (max === null || price <= max);
            });
        }

        if (filters.location) {
            listings = listings.filter(listing =>
                listing.location.toLowerCase().includes(filters.location.toLowerCase())
            );
        }

        return listings;
    }

    // Reset state
    reset() {
        this.state = {
            user: null,
            listings: [],
            categories: [],
            ui: {
                loading: false,
                modal: null,
                notifications: []
            },
            filters: {
                category: null,
                search: '',
                priceRange: null,
                location: null
            }
        };
    }
}

// Global state instance
export const state = new StateManager();
export default state;
