/**
 * MoveX Unified API Client
 * Final Standardized Version
 */

const API_URL = 'http://localhost:4000';

class MoveXAPI {
    static getHeaders() {
        const sessionStr = sessionStorage.getItem('movexsecuresession');
        let username = null;
        if (sessionStr) {
            try {
                const sessionData = JSON.parse(sessionStr);
                username = sessionData.username;
            } catch (e) {}
        }
        return { 'Content-Type': 'application/json', 'X-User-Username': username || '' };
    }

    static async fetch(endpoint, options = {}) {
        const url = `${API_URL}/api${endpoint}`; // Use /api directly
        try {
            const res = await fetch(url, { headers: this.getHeaders(), ...options });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Request failed');
            return data;
        } catch (err) {
            console.error(`API Error [${endpoint}]:`, err);
            alert(`Error: ${err.message}`);
            throw err;
        }
    }

    // AUTH & PROFILE
    static async whoami() { return this.fetch('/profile/me'); }

    // UNIFIED DATA (One endpoint, role-aware)
    static async getStats() { return this.fetch('/stats'); }
    static async getShipments() { return this.fetch('/shipments'); }

    // OPERATIONS
    static async createShipment(payload) { return this.fetch('/shipments/create', { method: 'POST', body: JSON.stringify(payload) }); }
    static async updateStatus(tracking_id, status) { return this.fetch('/shipments/update-status', { method: 'POST', body: JSON.stringify({ tracking_id, status }) }); }
    
    // MANAGEMENT
    static async getStaff() { return this.fetch('/organization/staff'); }
    static async assignShipment(tracking_id, staff_id) { return this.fetch('/shipments/assign', { method: 'POST', body: JSON.stringify({ tracking_id, staff_id }) }); }
    
    // ADMIN ONLY
    static async getAdminUsers() { return this.fetch('/admin/users'); }
    static async getAdminFranchises() { return this.fetch('/admin/franchises'); }
    static async adminCreateUser(payload) { return this.fetch('/admin/users/create', { method: 'POST', body: JSON.stringify(payload) }); }
    static async adminUpdateUserStatus(user_id, status) { return this.fetch('/admin/users/update-status', { method: 'POST', body: JSON.stringify({ user_id, status }) }); }
    static async adminDeleteUser(user_id) { return this.fetch('/admin/users/delete', { method: 'POST', body: JSON.stringify({ user_id }) }); }
    static async adminCreateFranchise(payload) { return this.fetch('/admin/franchises/create', { method: 'POST', body: JSON.stringify(payload) }); }
    static async adminDeleteFranchise(organization_id) { return this.fetch('/admin/franchises/delete', { method: 'POST', body: JSON.stringify({ organization_id }) }); }
    static async adminGetFinances() { return this.fetch('/admin/finances'); }
    static async adminGetReports() { return this.fetch('/admin/reports'); }
}

window.MoveX = MoveXAPI;
