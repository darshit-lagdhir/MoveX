/**
 * ADMIN LAYOUT MANAGER (SPA Version)
 * Handles Sidebar toggle, Active state, and SPA Navigation.
 */

(function () {
    'use strict';

    // Failsafe: Always reveal UI after 1.5s
    const revealTimeout = setTimeout(revealUI, 1500);

    function revealUI() {
        if (!document.documentElement.classList.contains('loading')) return;
        clearTimeout(revealTimeout);
        requestAnimationFrame(() => {
            document.documentElement.classList.remove('loading');
        });
    }

    let isLayoutInitialized = false;

    async function initAdminLayout() {
        const layout = document.querySelector('.admin-layout');
        if (!layout || isLayoutInitialized) return;

        isLayoutInitialized = true;

        setupEventListeners();
        updateActiveState();
        updateUserInfo();

        // Initialize core JS for the current page
        let currentPath = window.location.pathname.split('/').pop() || 'dashboard';
        if (currentPath.endsWith('.html')) currentPath = currentPath.slice(0, -5);

        await ensureCoreLoaded();

        if (window.MoveXAdmin) {
            console.log('Layout Manager: Triggering core init for', currentPath);
            window.MoveXAdmin.init(currentPath.toLowerCase());
        }

        revealUI();
    }

    async function ensureCoreLoaded() {
        // Load Flatpickr 
        if (!document.querySelector('link[href*="flatpickr"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
            document.head.appendChild(script);
        }

        const isFranchisee = window.location.pathname.includes('/franchisee/');
        const expectedCore = isFranchisee ? '/js/franchisee-core.js' : '/js/admin-core.js';

        if (window.MoveXAdmin && window.MoveXAdmin._source === expectedCore) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = expectedCore;
            script.onload = () => {
                if (window.MoveXAdmin) window.MoveXAdmin._source = expectedCore;
                resolve();
            };
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

            const isInternal = (!href.startsWith('http') && !href.startsWith('//')) || href.startsWith(window.location.origin);

            if (isInternal) {
                if (href.endsWith('.html')) href = href.slice(0, -5);
                if (href === '#' || href === '') return;
                if (!href.includes('.') || href.startsWith('/')) {
                    e.preventDefault();
                    navigateTo(href);
                }
            }
        });

        window.addEventListener('popstate', (e) => {
            const path = window.location.pathname.split('/').pop() || 'dashboard';
            const cleanPath = path.endsWith('.html') ? path.slice(0, -5) : path;
            loadPageContent(cleanPath);
        });
    }

    async function navigateTo(url) {
        if (url.endsWith('.html')) url = url.slice(0, -5);
        if (window.location.pathname.endsWith(url)) return;
        history.pushState(null, '', url);
        await loadPageContent(url);
    }

    async function loadPageContent(url) {
        try {
            const main = document.querySelector('main');
            if (main) {
                main.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                main.style.opacity = '0';
                main.style.transform = 'translateY(10px)';
            }

            let progressBar = document.getElementById('navProgressBar') || document.createElement('div');
            if (!progressBar.id) {
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
                    main.style.opacity = '1';
                    main.style.transform = 'translateY(0)';
                    updateActiveState();

                    setTimeout(() => {
                        progressBar.style.opacity = '0';
                        setTimeout(() => {
                            progressBar.style.width = '0';
                            progressBar.style.opacity = '1';
                        }, 300);
                    }, 200);

                    const pageName = url.split('/').pop();
                    if (window.MoveXAdmin) window.MoveXAdmin.init(pageName);
                }, 200);
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

    function updateUserInfo() {
        const update = () => {
            if (window.MoveXUser) {
                const nameEl = document.getElementById('topBarUserName');
                if (nameEl) {
                    nameEl.textContent = window.MoveXUser.full_name || 'Admin';
                }
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
