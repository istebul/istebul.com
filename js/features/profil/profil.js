// Profile Feature Manager
import API from '../../core/api.js';
import { state } from '../../core/state.js';
import { monitoring } from '../../core/monitoring.js';

export class ProfileManager {
    constructor(ui) {
        this.ui = ui;
    }

    async loadProfile(userId) {
        try {
            const profile = await API.getProfile(userId);
            state.set('user.profile', profile);
            if (this.ui) this.ui.renderProfile(profile);
            return profile;
        } catch (error) {
            console.error('Failed to load profile:', error);
            monitoring.captureException(error, { context: 'loadProfile', userId });
            throw error;
        }
    }

    async updateProfile(userId, updates) {
        try {
            const updatedProfile = await API.updateProfile(userId, updates);
            state.set('user.profile', updatedProfile);
            return updatedProfile;
        } catch (error) {
            console.error('Failed to update profile:', error);
            monitoring.captureException(error, { context: 'updateProfile', userId, updates });
            throw error;
        }
    }
}

export default ProfileManager;
