/**
 * MoveX Unified API Client
 * Simplified for Exam Presentation
 */

const API_URL = 'http://localhost:4000';

class MoveXAPI {
    static getHeaders() {
        const sessionStr = sessionStorage.getItem('movexsecuresession');
        let username = null;
        if (sessionStr) {
            try {
                const sessionData = JSON.parse(sessionStr);
                username = sessionData.data?.username;
            } catch (e) {
                console.error("Invalid session format");
            }
        }
        return {
            'Content-Type': 'application/json',
            'X-User-Username': username || ''
        };
    }

    static async fetch(endpoint, options = {}) {
        const url = `${API_URL}/api/dashboard${endpoint}`;
        const defaultOptions = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Request failed');
            return data;
        } catch (err) {
            console.error(`API Error [${endpoint}]:`, err);
            alert(`Error: ${err.message}`);
            throw err;
        }
    }

    // AUTH & PROFILE
    static async whoami() {
        return this.fetch('/auth/whoami');
    }

    // SHIPMENTS (Unified)
    static async getShipments(role) {
        return this.fetch(`/${role}/shipments`);
    }

    static async getStats(role) {
        return this.fetch(`/${role}/stats`);
    }

    static async updateStatus(role, tracking_id, status) {
        return this.fetch(`/${role}/shipments/update-status`, {
            method: 'POST',
            body: JSON.stringify({ tracking_id, status })
        });
    }

    // FRANCHISEE SPECIFIC
    static async getAvailableAssignments() {
        return this.fetch('/franchisee/assignments/available');
    }

    static async assignShipment(staff_id, tracking_id) {
        return this.fetch('/franchisee/assign', {
            method: 'POST',
            body: JSON.stringify({ staff_id, tracking_id })
        });
    }

    static async getStaff() {
        return this.fetch('/franchisee/staff');
    }

    // USER SPECIFIC
    static async createShipment(payload) {
        return this.fetch('/user/shipments/create', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    // ADMIN SPECIFIC
    static async getAdminUsers() {
        return this.fetch('/admin/users');
    }

    static async getAdminFranchises() {
        return this.fetch('/admin/franchises');
    }

    static async resetUserPassword(username, password) {
        return this.fetch('/admin/users/reset-password', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }
}

window.MoveX = MoveXAPI;
