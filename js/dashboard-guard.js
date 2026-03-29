/**
 * MOVEX DASHBOARD GUARD
 * Final Simplified Version (No backend session check) 
 */

(function () {
    'use strict';

    function guard() {
        // 1. Skip check on login page
        const path = window.location.pathname;
        if (path === '/' || path.endsWith('index.html')) return;

        // 2. Simple Check: Does a session exist in storage?
        const sessionStr = sessionStorage.getItem('movexsecuresession');
        if (!sessionStr) {
            console.warn('[Guard] No session found. Redirecting to login.');
            window.location.href = '/?auth_message=' + encodeURIComponent('Please log in.');
            return;
        }

        try {
            const user = JSON.parse(sessionStr);

            if (!user || !user.username) {
                throw new Error('Invalid session data');
            }

            // Populate UI elements (Global top bar)
            const topName = document.getElementById('topBarUserName');
            const topRole = document.getElementById('topBarRole');

            if (topName) topName.textContent = user.username;
            if (topRole) topRole.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

            console.log(`[Guard] Session verified for: ${user.username} (${user.role})`);

        } catch (e) {
            sessionStorage.removeItem('movexsecuresession');
            window.location.href = '/?auth_message=' + encodeURIComponent('Invalid session.');
        }
    }

    // Global Logout for all dashboards
    window.MoveXLogout = function() {
        sessionStorage.removeItem('movexsecuresession');
        window.location.href = '/?logout=true';
    };

    // Run immediately
    guard();

})();
