/**
 * ADMIN LAYOUT MANAGER (SPA Version)
 * Handles Sidebar, Header, and Partial Navigation for all Admin Pages.
 */

// LOADING FIX: Prevent UI flash and "settling" animations during initial load
// document.documentElement.classList.add('loading');

(function () {
    'use strict';

    // Failsafe: Always reveal UI after 1.5s in case of hanging fetches
    const revealTimeout = setTimeout(revealUI, 1500);

    function revealUI() {
        if (!document.documentElement.classList.contains('loading')) return;
        clearTimeout(revealTimeout);
        requestAnimationFrame(() => {
            document.documentElement.classList.remove('loading');
        });
    }


    // Track state to avoid double loading
    let isLayoutInitialized = false;

    async function fetchPartial(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${url}`);
            return await response.text();
        } catch (err) {
            console.error(err);
            return '';
        }
    }

    async function initAdminLayout() {
        const layout = document.querySelector('.admin-layout');
        if (!layout || isLayoutInitialized) return;

        // 1. Fetch and Inject Sidebar if not present
        if (!document.getElementById('sidebar')) {
            const sidebarHTML = await fetchPartial('/partials/admin-sidebar.html');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sidebarHTML;
            const sidebar = tempDiv.firstElementChild;
            layout.insertBefore(sidebar, layout.firstChild);
        }

        // 2. Wrap main content if needed and inject header
        let mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            mainContent = document.createElement('div');
            mainContent.className = 'main-content';
            const existingMain = layout.querySelector('main');
            if (existingMain) {
                layout.appendChild(mainContent);
                mainContent.appendChild(existingMain);
            }
        }

        if (!document.querySelector('.top-nav')) {
            const headerHTML = await fetchPartial('/partials/admin-header.html');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = headerHTML;
            const header = tempDiv.firstElementChild;
            mainContent.insertBefore(header, mainContent.firstChild);
        }

        isLayoutInitialized = true;

        setupEventListeners();
        updateActiveState();
        initTheme();
        updateUserInfo();

        // 3. SECURE INITIALIZATION: Wait for core JS before calling init
        let currentPath = window.location.pathname.split('/').pop();
        if (!currentPath || currentPath === 'admin') currentPath = 'dashboard';
        if (currentPath.endsWith('.html')) currentPath = currentPath.slice(0, -5);

        await ensureCoreLoaded();

        if (window.MoveXAdmin) {
            console.log('Layout Manager: Triggering core init for', currentPath);
            window.MoveXAdmin.init(currentPath); // init handles stripping too, but good to be safe
        }

        // Final step: Reveal the UI once everything is stable
        revealUI();
    }



    async function ensureCoreLoaded() {
        // Load Flatpickr for premium date selection
        if (!document.querySelector('link[href*="flatpickr"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
            document.head.appendChild(script);
        }

        if (window.MoveXAdmin) return;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/js/admin-core.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function setupEventListeners() {
        const toggleBtn = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        toggleBtn?.addEventListener('click', () => {
            sidebar?.classList.toggle('collapsed');
        });

        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            let href = link.getAttribute('href');
            if (!href) return;

            // Handle internal navigation
            const isInternal = (!href.startsWith('http') && !href.startsWith('//')) || href.startsWith(window.location.origin);

            if (isInternal) {
                // Strip extension if present for internal links
                if (href.endsWith('.html')) {
                    href = href.slice(0, -5);
                }

                // Avoid empty or same-page links unless it's a specific route
                if (href === '#' || href === '') return;

                // Check if it looks like an admin page or relative path
                if (!href.includes('.') || href.startsWith('/')) {
                    e.preventDefault();
                    navigateTo(href);
                }
            }
        });

        window.addEventListener('popstate', (e) => {
            const path = window.location.pathname.split('/').pop() || 'dashboard';
            // Strip extension if present
            const cleanPath = path.endsWith('.html') ? path.slice(0, -5) : path;
            loadPageContent(cleanPath, false);
        });
    }

    async function navigateTo(url) {
        // Strip .html if present
        if (url.endsWith('.html')) url = url.slice(0, -5);

        if (window.location.pathname.endsWith(url)) return;
        history.pushState(null, '', url);
        await loadPageContent(url, true);
    }

    async function loadPageContent(url, shouldHighlight = true) {
        try {
            const main = document.querySelector('main');
            if (main) {
                // Initial fade out
                main.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                main.style.opacity = '0';
                main.style.transform = 'translateY(10px)';
            }

            // Create and show progress bar
            let progressBar = document.getElementById('navProgressBar');
            if (!progressBar) {
                progressBar = document.createElement('div');
                progressBar.id = 'navProgressBar';
                progressBar.style.cssText = 'position:fixed; top:0; left:0; height:3px; background:var(--brand-primary); z-index:10001; transition: width 0.3s ease; width:0; box-shadow: 0 0 10px var(--brand-primary-glow);';
                document.body.appendChild(progressBar);
            }
            progressBar.style.width = '30%';

            const response = await fetch(url);
            progressBar.style.width = '70%';

            if (!response.ok) throw new Error('Page not found');
            const html = await response.text();
            progressBar.style.width = '100%';

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newMain = doc.querySelector('main');

            if (newMain && main) {
                setTimeout(() => {
                    main.innerHTML = newMain.innerHTML;
                    document.title = doc.title || 'MoveX Admin';

                    // Reset and show
                    main.style.opacity = '1';
                    main.style.transform = 'translateY(0)';

                    updateActiveState();

                    // Hide progress bar
                    setTimeout(() => {
                        progressBar.style.opacity = '0';
                        setTimeout(() => {
                            progressBar.style.width = '0';
                            progressBar.style.opacity = '1';
                        }, 300);
                    }, 200);

                    // Initialize functionality for the new content
                    const pageName = url.split('/').pop();
                    if (window.MoveXAdmin) {
                        window.MoveXAdmin.init(pageName);
                    }
                }, 200); // Small delay for visual comfort
            } else {
                window.location.href = url;
            }
        } catch (err) {
            console.error('Navigation error:', err);
            window.location.href = url;
        }
    }

    function updateActiveState() {
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        const navItems = document.querySelectorAll('.nav-item');
        const headerTitle = document.getElementById('headerTitle');

        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href === currentPage) {
                item.classList.add('active');
                if (headerTitle) {
                    headerTitle.textContent = item.querySelector('span')?.textContent || '';
                    headerTitle.style.display = 'block';
                }
            } else {
                item.classList.remove('active');
            }
        });
    }

    function initTheme() {
        const themeBtn = document.getElementById('themeToggle');
        if (!themeBtn) return;

        const sunIcon = themeBtn.querySelector('.sun-icon');
        const moonIcon = themeBtn.querySelector('.moon-icon');
        const html = document.documentElement;

        const applyTheme = (isDark) => {
            if (isDark) {
                html.setAttribute('data-theme', 'dark');
                if (sunIcon) sunIcon.style.display = 'block';
                if (moonIcon) moonIcon.style.display = 'none';
            } else {
                html.removeAttribute('data-theme');
                if (sunIcon) sunIcon.style.display = 'none';
                if (moonIcon) moonIcon.style.display = 'block';
            }
        };

        const savedTheme = localStorage.getItem('movex-theme') === 'dark';
        applyTheme(savedTheme);

        themeBtn.onclick = null;
        themeBtn.addEventListener('click', () => {
            const isDark = html.getAttribute('data-theme') === 'dark';
            const newTheme = !isDark;
            applyTheme(newTheme);
            localStorage.setItem('movex-theme', newTheme ? 'dark' : 'light');
        });
    }

    function updateUserInfo() {
        const update = () => {
            if (window.MoveXUser) {
                const nameEl = document.getElementById('topBarUserName');
                const roleEl = document.getElementById('topBarRole');
                if (nameEl) {
                    nameEl.textContent = (window.MoveXUser.role || 'Admin').replace(/^\w/, c => c.toUpperCase());
                    nameEl.style.background = 'none';
                    nameEl.style.textAlign = 'right';
                    nameEl.style.color = 'var(--brand-primary)';
                    nameEl.style.fontWeight = '800';
                    nameEl.style.fontSize = '1.1rem';
                    nameEl.style.letterSpacing = '0.5px';
                }
                if (roleEl) roleEl.style.display = 'none'; // Hide the secondary role text since main text is now the role
            } else {
                setTimeout(update, 500);
            }
        };
        update();
    }

    document.addEventListener('movex:authenticated', updateUserInfo);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdminLayout);
    } else {
        initAdminLayout();
    }

})();
