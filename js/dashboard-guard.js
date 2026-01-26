// LOADING FIX: REMOVED for Instant Paint
// document.documentElement.classList.add('loading');

(function () {
    'use strict';

    // Use Central Config
    const API_BASE = window.MoveXConfig ? window.MoveXConfig.API_URL : 'https://movex-ffqu.onrender.com';

    const DASHBOARDS = {
        admin: '/admin/dashboard.html',
        franchisee: '/franchisee/dashboard.html',
        staff: '/staff/dashboard.html',
        user: '/dashboards/user.html'
    };

    const ROLE_HIERARCHY = {
        'dashboard': ['admin', 'franchisee', 'staff', 'user'],
        'users': ['admin'],
        'franchises': ['admin'],
        'staff': ['admin', 'franchisee', 'staff'],
        'shipments': ['admin', 'franchisee'],
        'bookings': ['admin', 'franchisee'],
        'pickup-requests': ['admin', 'franchisee'],
        'finance': ['admin', 'franchisee'],
        'reports': ['admin'],
        'settings': ['admin', 'franchisee', 'staff', 'user'],
        'franchisee': ['admin', 'franchisee'],
        'user': ['admin', 'franchisee', 'staff', 'user'],
        'assignments': ['staff', 'admin'],
        'profile': ['staff', 'admin', 'franchisee', 'user']
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
        // Get token BEFORE clearing storage
        const token = getToken();

        // Clear local state
        document.cookie = 'movex_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'movex.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        sessionStorage.removeItem('movexsecuresession');

        // Navigate to backend logout with token as fallback
        window.location.href = `${API_BASE}/api/logout-redirect?token=${encodeURIComponent(token || '')}`;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', guardDashboard);
    } else {
        guardDashboard();
    }
})();
