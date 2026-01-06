// LOADING FIX: REMOVED for Instant Paint
// document.documentElement.classList.add('loading');

(function () {
    'use strict';

    // Auto-detect: localhost/127.0.0.1 for dev, Koyeb for production
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const API_BASE = isLocal ? 'http://localhost:4000' : 'https://presidential-fly-movex-237428a4.koyeb.app';

    const DASHBOARDS = {
        admin: '/admin/dashboard',
        franchisee: '/dashboards/franchisee',
        staff: '/dashboards/staff',
        user: '/dashboards/user'
    };

    const ROLE_HIERARCHY = {
        'dashboard': ['admin'],
        'users': ['admin'],
        'franchises': ['admin'],
        'staff': ['admin', 'franchisee', 'staff'],
        'shipments': ['admin'],
        'bookings': ['admin'],
        'finance': ['admin'],
        'reports': ['admin'],
        'settings': ['admin'],
        'audit-logs': ['admin'],
        'franchisee': ['admin', 'franchisee'],
        'user': ['admin', 'franchisee', 'staff', 'user']
    };

    function getCurrentPage() {
        const path = window.location.pathname;
        const parts = path.split('/');
        let page = parts[parts.length - 1] || 'index.html';
        if (page.endsWith('.html') && page !== 'index.html') {
            page = page.slice(0, -5);
        }
        return page;
    }

    function getToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'movex_session') {
                return decodeURIComponent(value);
            }
        }

        const session = sessionStorage.getItem('movexsecuresession');
        if (session) {
            try {
                const data = JSON.parse(session);
                return data.data?.token || null;
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    async function validateSession() {
        const token = getToken();

        // RELAXED: Try to authenticate via Cookie (HttpOnly) even if no local token found
        // if (!token) { return { valid: false, reason: 'NO_TOKEN' }; }

        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE}/api/me`, {
                method: 'GET',
                credentials: 'include', // Important: sends cookies
                headers: headers
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                return {
                    valid: false,
                    reason: data.code || 'INVALID_SESSION',
                    status: response.status
                };
            }

            const data = await response.json();
            return {
                valid: true,
                user: data.user,
                organization: data.organization
            };
        } catch (err) {
            console.error('Session validation error:', err);
            return { valid: false, reason: 'NETWORK_ERROR' };
        }
    }

    function checkRoleAccess(userRole, currentPage) {
        const allowedRoles = ROLE_HIERARCHY[currentPage];
        if (!allowedRoles) return true;
        return allowedRoles.includes(userRole);
    }

    function redirectToLogin(message) {
        sessionStorage.removeItem('movexsecuresession');
        const encoded = encodeURIComponent(message || 'Please log in to continue');
        window.location.href = `/?auth_message=${encoded}`;
    }

    function redirectToDashboard(role) {
        const dashboard = DASHBOARDS[role] || DASHBOARDS.user;
        window.location.href = dashboard;
    }

    async function guardDashboard() {
        const currentPage = getCurrentPage();

        if (currentPage === 'index.html' || currentPage === '' || currentPage === '/') {
            return;
        }

        const isProtected = Object.keys(ROLE_HIERARCHY).includes(currentPage);
        if (!isProtected) {
            return;
        }

        const result = await validateSession();

        if (!result.valid) {
            const messages = {
                'NO_TOKEN': 'Please log in to access the dashboard',
                'SESSION_EXPIRED': 'Your session has expired. Please log in again.',
                'INVALID_SESSION': 'Invalid session. Please log in again.',
                'ACCOUNT_DISABLED': 'Your account has been disabled.',
                'USER_NOT_FOUND': 'Account not found. Please log in again.',
                'NETWORK_ERROR': 'Connection error. Please try again.'
            };
            redirectToLogin(messages[result.reason] || 'Please log in to continue');
            return;
        }

        const user = result.user;

        if (!checkRoleAccess(user.role, currentPage)) {
            console.warn(`Role mismatch: ${user.role} cannot access ${currentPage}`);
            redirectToDashboard(user.role);
            return;
        }

        window.MoveXUser = user;
        window.MoveXOrganization = result.organization || null;

        const userEmailEl = document.getElementById('userEmail');
        const userRoleEl = document.getElementById('userRole');
        const userNameEl = document.getElementById('userName');
        const orgNameEl = document.getElementById('orgName');

        if (userEmailEl) userEmailEl.textContent = user.username;
        if (userRoleEl) userRoleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        if (userNameEl) userNameEl.textContent = user.full_name || user.username;
        if (orgNameEl && result.organization) {
            orgNameEl.textContent = result.organization.name;
        }

        document.body.classList.add('authenticated');

        // SECURITY: Only show content after auth is verified
        // document.documentElement.classList.remove('loading');

        document.dispatchEvent(new CustomEvent('movex:authenticated', { detail: { user, organization: result.organization } }));
    }

    window.MoveXLogout = async function () {
        // Clear local state immediately
        document.cookie = 'movex_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'movex.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        sessionStorage.removeItem('movexsecuresession');

        // Navigate to logout endpoint (bypasses Brave's fetch blocking)
        // The backend will clear the session and redirect back
        const token = getToken();
        window.location.href = `${API_BASE}/api/logout-redirect?token=${encodeURIComponent(token || '')}`;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', guardDashboard);
    } else {
        guardDashboard();
    }
})();
