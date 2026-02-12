// LOADING FIX: REMOVED for Instant Paint
// document.documentElement.classList.add('loading');

(function () {
    'use strict';

    // Use Central Config
    const API_BASE = window.MoveXConfig ? window.MoveXConfig.API_URL : 'https://movex-ffqu.onrender.com';

    const DASHBOARDS = {
        admin: '/dashboards/admin/admin-dashboard.html',
        franchisee: '/dashboards/franchisee/franchisee-dashboard.html',
        staff: '/dashboards/staff/staff-dashboard.html',
        user: '/dashboards/user/user-dashboard.html'
    };

    const ROLE_HIERARCHY = {
        'admin-dashboard': ['admin'],
        'admin-users': ['admin'],
        'admin-franchises': ['admin'],
        'admin-shipments': ['admin'],
        'admin-finance': ['admin'],
        'admin-reports': ['admin'],
        'admin-settings': ['admin'],
        'admin-print_label': ['admin'],
        'franchisee-dashboard': ['admin', 'franchisee'],
        'franchisee-shipments': ['admin', 'franchisee'],
        'franchisee-bookings': ['admin', 'franchisee'],
        'franchisee-pickup-requests': ['admin', 'franchisee'],
        'franchisee-finance': ['admin', 'franchisee'],
        'franchisee-settings': ['admin', 'franchisee', 'staff', 'user'],
        'franchisee-staff': ['admin', 'franchisee', 'staff'],
        'franchisee-assignments': ['staff', 'admin', 'franchisee'],
        'staff-dashboard': ['admin', 'franchisee', 'staff'],
        'staff-assignments': ['admin', 'franchisee', 'staff'],
        'staff-settings': ['admin', 'franchisee', 'staff'],
        'dashboard': ['admin', 'franchisee', 'staff', 'user'],
        'users': ['admin'],
        'franchises': ['admin'],
        'shipments': ['admin', 'franchisee'],
        'pickup-requests': ['admin', 'franchisee'],
        'finance': ['admin', 'franchisee'],
        'reports': ['admin'],
        'settings': ['admin', 'franchisee', 'staff', 'user'],
        'franchisee': ['admin', 'franchisee'],
        'user-dashboard': ['admin', 'franchisee', 'staff', 'user'],
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
        const topBarUserName = document.getElementById('topBarUserName');
        const topBarRole = document.getElementById('topBarRole');

        if (userEmailEl) userEmailEl.textContent = user.username;
        if (userRoleEl) userRoleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        if (userNameEl) userNameEl.textContent = user.full_name || user.username;
        if (orgNameEl && result.organization) {
            orgNameEl.textContent = result.organization.name;
        }

        // Fix for Loading... issue on Staff Dashboard
        if (topBarUserName) topBarUserName.textContent = user.full_name || user.username;
        if (topBarRole) {
            const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
            topBarRole.textContent = user.role === 'user' ? 'Customer' : `${roleLabel} (Hub Member)`;
        }

        document.body.classList.add('authenticated');

        // SECURITY: Only show content after auth is verified
        // document.documentElement.classList.remove('loading');

        document.dispatchEvent(new CustomEvent('movex:authenticated', { detail: { user, organization: result.organization } }));
    }

    window.MoveXLogout = async function () {
        const token = getToken();

        try {
            // Attempt server-side logout via fetch to clear HttpOnly cookies
            await fetch(`${API_BASE}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : undefined
                },
                credentials: 'include'
            });
        } catch (e) {
            console.warn('Logout API call failed', e);
        }

        // Clear local state
        document.cookie = 'movex_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'movex.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        sessionStorage.removeItem('movexsecuresession');

        // Redirect to Client-Side Login Page (Stay on current domain)
        window.location.href = '/?logout=true';
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', guardDashboard);
    } else {
        guardDashboard();
    }
})();
