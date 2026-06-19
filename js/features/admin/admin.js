/**
 * @deprecated Unused — use `admin-panel.html` for operations admin.
 * See `js/features/admin/README.md`.
 */
// Admin Feature Manager
import API from '../../core/api.js';
import { state } from '../../core/state.js';
import { monitoring } from '../../core/monitoring.js';

export class AdminManager {
    constructor(ui) {
        this.ui = ui;
    }

    async loadStats() {
        try {
            const stats = await API.getAdminStats();
            state.set('admin.stats', stats);
            return stats;
        } catch (error) {
            console.error('Failed to load admin stats:', error);
            monitoring.captureException(error, { context: 'admin.loadStats' });
            throw error;
        }
    }

    async loadUsers() {
        try {
            const users = await API.getAllUsers();
            state.set('admin.users', users);
            return users;
        } catch (error) {
            console.error('Failed to load users:', error);
            monitoring.captureException(error, { context: 'admin.loadUsers' });
            throw error;
        }
    }

    async updateUserRole(userId, role) {
        try {
            await API.updateUserRole(userId, role);
            await this.loadUsers(); // Refresh list
        } catch (error) {
            console.error('Failed to update user role:', error);
            monitoring.captureException(error, { context: 'admin.updateUserRole', userId, role });
            throw error;
        }
    }
}

export default AdminManager;
