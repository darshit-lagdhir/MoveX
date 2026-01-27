
/**
 * Staff Layout Manager
 * Handles Sidebar and Header injection for Staff pages
 */

const StaffLayout = {
    init: function (activePage) {
        this.injectSidebar(activePage);
        this.injectHeader();
        this.setupMobileToggle();
    },

    injectSidebar: function (activePage) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        sidebar.innerHTML = `
            <div class="sidebar-header" style="height: 60px; border-bottom: 1px solid var(--border-default);">
                <a href="/staff/dashboard.html" class="nav-logo">
                    <span class="logo-text">MoveX Staff</span>
                </a>
            </div>
            <nav class="sidebar-nav">
                <div class="nav-group-title">Home</div>
                <a href="dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                    </svg>
                    <span>Dashboard</span>
                </a>

                <div class="nav-group-title">Operations</div>
                <a href="assignments.html" class="nav-item ${activePage === 'assignments' ? 'active' : ''}">
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                    </svg>
                    <span>My Tasks</span>
                </a>

                <div class="nav-group-title">Account</div>
                <a href="profile.html" class="nav-item ${activePage === 'profile' ? 'active' : ''}">
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    <span>My Profile</span>
                </a>
            </nav>
        `;
    },

    injectHeader: function () {
        const header = document.querySelector('header.top-nav');
        if (!header) return;

        // Don't overwrite if it already has content (some pages might custom build it) 
        // But for consistency we usually overwrite or at least set the user info

        // We'll just update the user info part dynamically if the structure exists
        // Or inject the whole thing if empty
        if (header.children.length === 0) {
            header.innerHTML = `
                <div class="nav-left" style="display: flex; align-items: center; gap: 1rem;">
                    <button class="toggle-btn" id="sidebarToggle" title="Toggle Sidebar" onclick="toggleSidebar()">
                        <svg fill="none" width="20" height="20" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    <h2 id="headerTitle" style="font-size: 1.1rem; font-weight: 700; margin: 0; display: none;">Staff Dashboard</h2>
                </div>
                <div class="nav-right" style="display: flex; align-items: center; gap: 1.25rem;">
                     <div class="user-profile" style="display: flex; align-items: center; gap: 0.75rem; border-left: 1px solid var(--border-default); padding-left: 1.25rem; cursor: pointer;">
                        <div style="text-align: right;">
                            <div id="topBarUserName" style="font-weight: 600; font-size: 0.875rem;">Loading...</div>
                            <div id="topBarRole" style="font-size: 0.75rem; color: var(--text-secondary); text-transform: capitalize;">Staff</div>
                        </div>
                        <div class="avatar" style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); border: 2px solid var(--surface-primary);">
                             <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ffffff">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                    </div>
                    <button class="logout-btn" onclick="window.MoveXLogout()" title="Logout" style="background:none; border:none; cursor:pointer; color: var(--text-secondary); padding: 4px; display:flex;">
                        <svg fill="none" width="20" height="20" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                    </button>
                </div>
           `;
        }

        // Fetch user info for header
        this.fetchUserInfo();
    },

    fetchUserInfo: function () {
        fetch(`${API_URL}/api/auth/me`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const nameEl = document.getElementById('topBarUserName');
                    const roleEl = document.getElementById('topBarRole');
                    if (nameEl) nameEl.textContent = data.user.full_name || data.user.username;
                    if (roleEl) roleEl.textContent = data.user.role + ' (Hub Member)';
                }
            })
            .catch(err => console.error(err));
    },

    setupMobileToggle: function () {
        const toggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                // Simply toggle both to ensure it works across all breakpoints/zoom levels
                sidebar.classList.toggle('active');
                sidebar.classList.toggle('collapsed');
            });
        }
    }
};

window.StaffLayout = StaffLayout;

// Global Toggle Function for direct onclick access
window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
        sidebar.classList.toggle('collapsed');
    }
};
