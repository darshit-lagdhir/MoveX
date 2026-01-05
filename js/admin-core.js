/**
 * MoveX Admin Core Logic
 * Handles functionality for all admin sections.
 */


window.MoveXAdmin = (function () {
    'use strict';

    // Auto-detect: localhost/127.0.0.1 for dev, Koyeb for production
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const API_BASE = isLocal ? 'http://localhost:4000' : 'https://presidential-fly-movex-237428a4.koyeb.app';

    // Pagination State
    let SHIP_PAGE = 1;
    const SHIP_LIMIT = 10;

    // --- MOCK DATA ---
    const MOCK_DATA = {
        stats: {},
        shipments: [], // Data must be fetched from API
        users: [],
        franchises: [],
        auditLogs: []
    };

    const INDIAN_CITIES = [
        "Mumbai, MH", "Delhi, NCR", "Bangalore, KA", "Hyderabad, TS", "Ahmedabad, GJ", "Chennai, TN", "Kolkata, WB", "Surat, GJ",
        "Pune, MH", "Jaipur, RJ", "Lucknow, UP", "Kanpur, UP", "Nagpur, MH", "Indore, MP", "Thane, MH", "Bhopal, MP",
        "Visakhapatnam, AP", "Pimpri-Chinchwad, MH", "Patna, BR", "Vadodara, GJ", "Ghaziabad, UP", "Ludhiana, PB", "Agra, UP",
        "Nashik, MH", "Faridabad, HR", "Meerut, UP", "Rajkot, GJ", "Kalyan-Dombivli, MH", "Vasai-Virar, MH", "Varanasi, UP",
        "Srinagar, JK", "Aurangabad, MH", "Dhanbad, JH", "Amritsar, PB", "Navi Mumbai, MH", "Allahabad, UP", "Howrah, WB",
        "Ranchi, JH", "Gwalior, MP", "Jabalpur, MP", "Coimbatore, TN", "Vijayawada, AP", "Jodhpur, RJ", "Madurai, TN",
        "Raipur, CT", "Chandigarh, CH", "Guwahati, AS", "Solapur, MH", "Hubli-Dharwad, KA", "Mysore, KA", "Tiruchirappalli, TN",
        "Bareilly, UP", "Aligarh, UP", "Tiruppur, TN", "Gurgaon, HR", "Moradabad, UP", "Jalandhar, PB", "Bhubaneswar, OR",
        "Salem, TN", "Warangal, TS", "Mira-Bhayandar, MH", "Thiruvananthapuram, KL", "Bhiwandi, MH", "Saharanpur, UP",
        "Guntur, AP", "Amravati, MH", "Bikaner, RJ", "Noida, UP", "Jamshedpur, JH", "Bhilai, CT", "Cuttack, OR", "Firozabad, UP",
        "Kochi, KL", "Nellore, AP", "Bhavnagar, GJ", "Dehradun, UK", "Durgapur, WB", "Asansol, WB", "Rourkela, OR", "Nanded, MH",
        "Kolhapur, MH", "Ajmer, RJ", "Akola, MH", "Gulbarga, KA", "Jamnagar, GJ", "Ujjain, MP", "Loni, UP", "Siliguri, WB",
        "Jhansi, UP", "Ulhasnagar, MH", "Jammu, JK", "Sangli-Miraj & Kupwad, MH", "Mangalore, KA", "Erode, TN", "Belgaum, KA",
        "Ambattur, TN", "Tirunelveli, TN", "Malegaon, MH", "Gaya, BR", "Jalgaon, MH", "Udaipur, RJ", "Maheshtala, WB"
    ];

    // --- UI UTILITIES ---

    function animateValue(obj, start, end, duration, prefix = '', suffix = '') {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            obj.innerHTML = prefix + value.toLocaleString() + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function staggerEntries(selector, delay = 100) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, i) => {
            el.classList.add('staggered-item');
            setTimeout(() => {
                el.classList.add('visible');
            }, i * delay);
        });
    }

    function showSkeletons(containerSelector, type = 'table') {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        if (type === 'table') {
            const tbody = container.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = Array(4).fill(0).map(() => `
                    <tr>
                        ${Array(6).fill(0).map(() => '<td><div class="skeleton" style="height:20px; width:80%;"></div></td>').join('')}
                    </tr>
                `).join('');
            }
        } else if (type === 'cards') {
            const cards = container.querySelectorAll('.card');
            cards.forEach(card => {
                const header = card.querySelector('.card-header');
                const value = card.querySelector('.card-value');
                if (value) value.innerHTML = '<div class="skeleton" style="height:32px; width:100px; border-radius:4px;"></div>';
            });
        }
    }

    function showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Use SVG icons for premium feel
        const icons = {
            success: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
            error: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
            info: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
        };

        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: ${type === 'error' ? 'var(--error)' : type === 'success' ? 'var(--success)' : 'var(--brand-primary)'};
            color: white;
            padding: 0.875rem 1.5rem;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-xl);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 600;
            font-size: 0.9rem;
            animation: slideInRight 0.4s var(--easing-spring);
        `;
        // SECURITY: Use textContent for message to prevent XSS
        const iconContainer = document.createElement('span');
        iconContainer.innerHTML = icons[type] || icons.info; // Safe - controlled icons only
        toast.appendChild(iconContainer);

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message; // Safe - no HTML injection possible
        toast.appendChild(messageSpan);

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.4s var(--easing-smooth) forwards';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    function initCityPicker(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'city-picker-wrapper';
        wrapper.style.cssText = 'position: relative; width: 100%;';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        const dropdown = document.createElement('div');
        dropdown.className = 'city-picker-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--surface-primary);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            max-height: 200px;
            overflow-y: auto;
            z-index: 10001;
            display: none;
            margin-top: 4px;
        `;
        wrapper.appendChild(dropdown);

        const renderCities = (filter = '') => {
            const filtered = INDIAN_CITIES.filter(c => c.toLowerCase().includes(filter.toLowerCase()));
            if (filtered.length === 0) {
                dropdown.innerHTML = '<div style="padding: 0.75rem; color: var(--text-tertiary); font-size: 0.85rem;">No cities found</div>';
            } else {
                dropdown.innerHTML = filtered.map(city => `
                    <div class="city-option" data-value="${city}" style="padding: 0.75rem 1rem; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;" 
                         onmouseover="this.style.background='var(--brand-primary-soft)'; this.style.paddingLeft='1.25rem';" 
                         onmouseout="this.style.background='none'; this.style.paddingLeft='1rem';">
                        <span>${city}</span>
                        <span style="font-size: 0.7rem; color: var(--brand-primary); font-weight: 700; text-transform: uppercase;">Select</span>
                    </div>
                `).join('');

                dropdown.querySelectorAll('.city-option').forEach(opt => {
                    opt.addEventListener('mousedown', (e) => {
                        input.value = opt.getAttribute('data-value');
                        dropdown.style.display = 'none';
                    });
                });
            }
        };

        input.addEventListener('focus', () => {
            renderCities(input.value);
            dropdown.style.display = 'block';
        });

        input.addEventListener('input', () => {
            renderCities(input.value);
            dropdown.style.display = 'block';
        });

        input.addEventListener('blur', () => {
            setTimeout(() => { dropdown.style.display = 'none'; }, 200);
        });
    }

    function createModal(title, content, actions = []) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        const modal = document.createElement('div');
        modal.className = 'modal-content card';
        modal.style.cssText = `
            width: 100%;
            max-width: 700px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            padding: 0;
            transform: scale(0.95) translateY(20px);
            transition: all 0.3s var(--easing-spring);
            background: var(--surface-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-2xl);
            overflow: hidden; 
        `;

        const headerHTML = `
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-default); display: flex; justify-content: space-between; align-items: center; background: var(--surface-secondary); border-top-left-radius: inherit; border-top-right-radius: inherit; flex-shrink: 0;">
                <h3 style="margin:0; font-size: 1.25rem; font-weight: 700;">${title}</h3>
                <button class="modal-close" style="background:var(--surface-primary); border:1px solid var(--border-subtle); cursor:pointer; color: var(--text-secondary); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:all 0.2s;">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `;

        const bodyHTML = `<div style="padding: 2rem; overflow-y: auto; flex-grow: 1;">${content}</div>`;

        const footerHTML = actions.length ? `
            <div style="padding: 1.5rem; border-top: 1px solid var(--border-default); display: flex; justify-content: flex-end; gap: 1rem; background: var(--surface-secondary); border-bottom-left-radius: inherit; border-bottom-right-radius: inherit; flex-shrink: 0;">
                ${actions.map((a, i) => `
                    <button data-index="${i}" class="${a.primary ? 'btn-primary' : 'btn-secondary'}" 
                        style="padding: 0.625rem 1.5rem; border-radius: var(--radius-md); border: ${a.primary ? 'none' : '1px solid var(--border-default)'}; cursor: pointer; font-weight: 600; font-family:inherit; transition: all 0.2s;
                        ${a.primary ? 'background: var(--brand-primary); color: white;' : 'background: var(--surface-primary); color: var(--text-primary);'}">
                        ${a.label}
                    </button>
                `).join('')}
            </div>
        ` : '';

        modal.innerHTML = headerHTML + bodyHTML + footerHTML;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Hover animations for buttons
        modal.querySelectorAll('button').forEach(btn => {
            btn.onmouseenter = () => { btn.style.transform = 'translateY(-2px)'; btn.style.filter = 'brightness(1.1)'; };
            btn.onmouseleave = () => { btn.style.transform = 'translateY(0)'; btn.style.filter = 'none'; };
        });

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1) translateY(0)';
        });

        const close = () => {
            overlay.style.opacity = '0';
            modal.style.transform = 'scale(0.95) translateY(20px)';
            setTimeout(() => overlay.remove(), 300);
        };

        overlay.querySelector('.modal-close').onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };

        actions.forEach((a, i) => {
            const btn = modal.querySelector(`button[data-index="${i}"]`);
            if (btn) btn.onclick = () => {
                btn.innerHTML = 'Processing...';
                btn.disabled = true;
                a.onClick((keepOpen = false) => {
                    btn.innerHTML = a.label;
                    btn.disabled = false;
                    if (!keepOpen) close();
                });
            };
        });

        return { close };
    }

    /**
     * Unified Serviceability Check Logic
     * Used in both Dashboard and Franchise sections.
     * Features: Live search, debouncing, and robust Indian Pincode/Area verification.
     */
    function handleServiceabilityCheck() {
        createModal('Check Serviceability', `
            <div style="padding:1rem;">
                <label style="display:block; margin-bottom:0.8rem; font-weight:600; color:var(--text-primary);">Enter Area Name or Pincode</label>
                <div style="position:relative;">
                    <input type="text" id="pincode_search_input" placeholder="e.g. Mumbai or Pincode" style="width:100%; padding:14px; border:1px solid var(--border-default); border-radius:12px; font-size:1rem; transition: all 0.3s ease; box-shadow: var(--shadow-sm); outline:none;" onfocus="this.style.borderColor='var(--brand-primary)'; this.style.boxShadow='0 0 0 4px var(--brand-primary-soft)'" onblur="this.style.borderColor='var(--border-default)'; this.style.boxShadow='var(--shadow-sm)'">
                    <div id="pincode_live_status" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); display:none;">
                        <div class="spinner-small" style="width:20px; height:20px; border-top-color:var(--brand-primary);"></div>
                    </div>
                </div>
                <div id="pincode_search_results" style="margin-top:20px; min-height:120px; display:flex; align-items:center; justify-content:center; border:2px dashed var(--border-subtle); border-radius:16px; transition: all 0.3s ease; background: var(--surface-secondary);">
                    <div style="color:var(--text-tertiary); font-style:italic; text-align:center;">
                        <i class="fas fa-search" style="display:block; font-size:1.5rem; margin-bottom:12px; opacity:0.4;"></i>
                        Typing will automatically check service...
                    </div>
                </div>
                <p style="margin-top:1rem; font-size:0.75rem; color:var(--text-tertiary); text-align:center;">
                    <i class="fas fa-info-circle" style="margin-right:4px;"></i>Works for Area Names and 6-digit Indian Pincodes
                </p>
            </div>
        `, [{ label: 'Close', onClick: c => c() }]);

        const searchInput = document.getElementById('pincode_search_input');
        const resultsDiv = document.getElementById('pincode_search_results');
        const statusIcon = document.getElementById('pincode_live_status');
        let debounceTimer;

        const performSearch = async (query) => {
            if (!query || query.length < 3) {
                resultsDiv.style.borderColor = 'var(--border-subtle)';
                resultsDiv.style.background = 'var(--surface-secondary)';
                resultsDiv.innerHTML = `
                    <div style="color:var(--text-tertiary); font-style:italic; text-align:center;">
                        <i class="fas fa-keyboard" style="display:block; font-size:1.5rem; margin-bottom:12px; opacity:0.4;"></i>
                        Enter at least 3 characters to search
                    </div>
                `;
                return;
            }

            statusIcon.style.display = 'block';
            try {
                // Encode to handle spaces in area names
                const res = await fetch(`/api/dashboard/public/check-service/${encodeURIComponent(query)}`);
                const data = await res.json();

                if (data.success && data.serviceable) {
                    resultsDiv.style.borderColor = 'var(--success)';
                    resultsDiv.style.background = 'rgba(16, 185, 129, 0.08)';
                    resultsDiv.innerHTML = `
                        <div style="padding:1.5rem; width:100%;">
                            <div style="display:flex; align-items:center; gap:12px; margin-bottom:15px; color:var(--success);">
                                <i class="fas fa-check-circle" style="font-size:1.5rem;"></i>
                                <strong style="font-size:1.1rem;">Serviceable Location!</strong>
                            </div>
                            <div style="background:var(--surface-primary); padding:1.25rem; border-radius:12px; border:1px solid rgba(16, 185, 129, 0.2); box-shadow: var(--shadow-sm);">
                                <div style="font-size:0.7rem; text-transform:uppercase; font-weight:800; color:var(--text-tertiary); letter-spacing:0.05em; margin-bottom:4px;">Franchise Hub</div>
                                <div style="font-weight:800; font-size:1.2rem; margin-bottom:12px; color:var(--text-primary);">${data.details.name}</div>
                                
                                <div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid var(--border-subtle);">
                                    <div style="font-size:0.7rem; font-weight:700; color:var(--text-tertiary); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.02em;">Office Address</div>
                                    <div style="color:var(--text-secondary); font-size:0.95rem; line-height:1.5; display:flex; gap:10px;">
                                        <i class="fas fa-map-marker-alt" style="margin-top:4px; color:var(--brand-primary); font-size:0.9rem;"></i>
                                        <span style="flex:1;">${data.details.full_address || 'Address not set'}</span>
                                    </div>
                                </div>

                                <div>
                                    <div style="font-size:0.7rem; font-weight:700; color:var(--text-tertiary); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.02em;">Contact Number</div>
                                    <div style="color:var(--brand-primary); font-weight:800; font-size:1.1rem; display:flex; align-items:center; gap:10px;">
                                        <i class="fas fa-phone-alt" style="font-size:0.9rem;"></i>
                                        <span>${data.details.owner_phone || 'Contact not set'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    resultsDiv.style.borderColor = 'var(--error)';
                    resultsDiv.style.background = 'rgba(239, 68, 68, 0.08)';
                    resultsDiv.innerHTML = `
                        <div style="padding:1.5rem; text-align:center;">
                            <div style="color:var(--error); margin-bottom:12px;">
                                <i class="fas fa-times-circle" style="font-size:2.5rem;"></i>
                            </div>
                            <div style="font-weight:700; color:var(--error); font-size:1.1rem;">NOT SERVICEABLE</div>
                            <div style="font-size:0.9rem; color:var(--text-secondary); margin-top:8px;">This area or pincode is not assigned to any franchise yet.</div>
                        </div>
                    `;
                }
            } catch (e) {
                resultsDiv.innerHTML = '<div style="color:var(--error); font-weight:600;">Search failed. Please try again.</div>';
            } finally {
                statusIcon.style.display = 'none';
            }
        };

        searchInput.oninput = (e) => {
            clearTimeout(debounceTimer);
            const val = e.target.value.trim();
            if (val) statusIcon.style.display = 'block';
            debounceTimer = setTimeout(() => performSearch(val), 500);
        };

        // Auto-focus after modal transition
        setTimeout(() => searchInput.focus(), 300);
    }

    // --- INITIALIZERS FOR EACH SECTION ---

    const initializers = {
        'dashboard': function () {
            document.getElementById('action-create-shipment').onclick = () => window.MoveXAdmin.createShipment();
            document.getElementById('action-add-user').onclick = () => document.querySelector('a[href="users"]').click();

            const serviceBtn = document.getElementById('action-check-service');
            if (serviceBtn) {
                serviceBtn.onclick = () => window.MoveXAdmin.handleServiceabilityCheck();
            }
        },

        'users': async () => {
            const tBody = document.getElementById('users-table-body');
            if (!tBody) return;

            const fetchUsers = async () => {
                try {
                    const res = await fetch('/api/dashboard/admin/users');
                    const data = await res.json();
                    if (data.success) {
                        MOCK_DATA.users = data.users; // Cache for basic filtering
                        renderUserTable(MOCK_DATA.users);
                    } else {
                        throw new Error(data.error);
                    }
                } catch (err) {
                    console.error("Fetch Users Error:", err);
                    tBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--danger);">Failed to load users.</td></tr>`;
                }
            };

            // Initial Fetch
            await fetchUsers();

            const addBtn = document.querySelector('.page-header button');
            if (addBtn) {
                addBtn.onclick = () => {
                    createModal('Add New User', `
                        <div style="display:flex; flex-direction:column; gap:1rem;">
                            <div><label style="display:block; margin-bottom:0.4rem; font-size:0.9rem;">Full Name</label><input type="text" id="new_name" placeholder="Enter name" style="width:100%; padding:0.6rem; border:1px solid var(--border-default); border-radius:4px; background:var(--surface-primary); color:var(--text-primary);"></div>
                            <div><label style="display:block; margin-bottom:0.4rem; font-size:0.9rem;">Username</label><input type="text" id="new_username" placeholder="username" style="width:100%; padding:0.6rem; border:1px solid var(--border-default); border-radius:4px; background:var(--surface-primary); color:var(--text-primary);"></div>
                            <div>
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.9rem;">Password</label>
                                <input type="password" id="new_password" placeholder="Min 8 characters" style="width:100%; padding:0.6rem; border:1px solid var(--border-default); border-radius:4px; background:var(--surface-primary); color:var(--text-primary);">
                            </div>
                            <div><label style="display:block; margin-bottom:0.4rem; font-size:0.9rem;">Role</label>
                                <select id="new_role" style="width:100%; padding:0.6rem; border:1px solid var(--border-default); border-radius:4px; background:var(--surface-primary); color:var(--text-primary);">
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                             <div>
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.9rem;">Phone (Optional)</label>
                                <input type="tel" id="new_phone" placeholder="+91..." style="width:100%; padding:0.6rem; border:1px solid var(--border-default); border-radius:4px; background:var(--surface-primary); color:var(--text-primary);">
                            </div>
                        </div>
                    `, [
                        { label: 'Cancel', onClick: (close) => close() },
                        {
                            label: 'Create User', primary: true, onClick: async (close) => {
                                const full_name = document.getElementById('new_name').value;
                                const username = document.getElementById('new_username').value;
                                const password = document.getElementById('new_password').value;
                                const role = document.getElementById('new_role').value;
                                const phone = document.getElementById('new_phone').value;

                                if (!full_name || !username || !password) return showToast('All fields required', 'error');
                                if (password.length < 8) return showToast('Password must be at least 8 chars', 'error');

                                try {
                                    const res = await fetch('/api/dashboard/admin/users/create', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ full_name, username, password, role, phone })
                                    });
                                    const data = await res.json();

                                    if (data.success) {
                                        showToast(`User ${username} created successfully!`, 'success');
                                        fetchUsers(); // Refresh table
                                        close();
                                    } else {
                                        showToast(data.error || 'Failed to create', 'error');
                                        // Re-enable button logic is handled by modal wrapper but we want to stay open if error? 
                                        // Modal currently closes on click. We might need to handle this better but standard flow is ok.
                                    }
                                } catch (err) {
                                    console.error(err);
                                    showToast('Network Error', 'error');
                                }
                            }
                        }
                    ]);
                };
            }
            const searchInput = document.querySelector('input[placeholder*="Search"]');
            const roleFilter = document.getElementById('userRoleFilter');
            const statusFilter = document.getElementById('userStatusFilter');

            const filterUsers = () => {
                const query = (searchInput?.value || '').toLowerCase();
                const role = (roleFilter?.value || '').toLowerCase();
                const status = (statusFilter?.value || '').toLowerCase();

                const filtered = MOCK_DATA.users.filter(u => {
                    const matchQuery = !query || u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query);
                    const matchRole = !role || u.role.toLowerCase() === role;
                    const matchStatus = !status || u.status.toLowerCase() === status;
                    return matchQuery && matchRole && matchStatus;
                });
                renderUserTable(filtered);
            };

            if (searchInput) searchInput.oninput = filterUsers;
            if (roleFilter) roleFilter.onchange = filterUsers;
            if (statusFilter) statusFilter.onchange = filterUsers;
        },

        'franchises': async () => {
            const tableBody = document.getElementById('franchise-table-body');
            if (!tableBody) return;

            const fetchStats = async () => {
                try {
                    const res = await fetch('/api/dashboard/admin/franchises/stats');
                    const data = await res.json();
                    if (data.success) {
                        const { total, activePincodes, pending } = data.stats;
                        const totalEl = document.getElementById('kpi-total-franchises');
                        const areasEl = document.getElementById('kpi-active-areas');
                        const pendingEl = document.getElementById('kpi-pending-approval');

                        // Update label for activeAreas to activePincodes if exists
                        const areasLabel = document.querySelector('[data-kpi-label="active-areas"]');
                        if (areasLabel) areasLabel.textContent = 'Active Pincodes';

                        if (totalEl) animateValue(totalEl, 0, total, 1000);
                        if (areasEl) animateValue(areasEl, 0, activePincodes, 1000);
                        if (pendingEl) animateValue(pendingEl, 0, pending, 1000);
                    }
                } catch (err) { console.error("Stats Error:", err); }
            };

            const fetchFranchises = async () => {
                try {
                    const res = await fetch('/api/dashboard/admin/franchises');
                    const data = await res.json();
                    if (data.success) {
                        MOCK_DATA.franchises = data.franchises;
                        renderFranchiseTable(data.franchises);
                    } else {
                        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--error);">Failed to load franchises.</td></tr>`;
                    }
                } catch (err) {
                    console.error("Fetch Error:", err);
                    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--error);">Network Error.</td></tr>`;
                }
            };

            await Promise.all([fetchStats(), fetchFranchises()]);

            // --- FRANCHISE SECTION INITIALIZATION ---

            // 1. Immediate Button Binding (Before any async calls)
            // We search all buttons in the header to find the one for adding a franchise
            const findAddBtn = () => Array.from(document.querySelectorAll('.page-header button')).find(btn => btn.innerText.includes('Add Franchise'));
            let addBtn = findAddBtn();

            if (addBtn) {
                addBtn.onclick = () => {
                    createModal('Add New Franchise', `
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem;">
                            <div style="grid-column: span 2; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-subtle);">
                                <div style="font-size: 0.9rem; font-weight: 700; color: var(--brand-primary);">OFFICE DETAILS</div>
                            </div>
                            <div style="grid-column: span 2;">
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Franchise / Hub Name</label>
                                <input type="text" id="f_name" placeholder="e.g. Mumbai Central Hub" style="width:100%;">
                            </div>
                            <div style="grid-column: span 2;">
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Full Address</label>
                                <textarea id="f_address" placeholder="Enter complete office address" style="width:100%; min-height:60px;"></textarea>
                            </div>
                            <div>
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Not Serviceable Area</label>
                                <input type="text" id="f_non_serviceable" placeholder="e.g. Slum Area 1, Forest Range" style="width:100%;">
                            </div>
                            <div>
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Assigned Pincodes</label>
                                <input type="text" id="f_pincodes" placeholder="e.g. 560048, 560016" style="width:100%;">
                            </div>

                            <div style="grid-column: span 2; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-subtle); margin-top: 1rem;">
                                <div style="font-size: 0.9rem; font-weight: 700; color: var(--brand-primary);">OWNER (FRANCHISEE) ACCOUNT</div>
                            </div>
                            <div style="grid-column: span 2;">
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Owner Full Name</label>
                                <input type="text" id="f_owner_name" placeholder="Full legal name" style="width:100%;">
                            </div>
                            <div>
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Username</label>
                                <input type="text" id="f_username" placeholder="Login username" style="width:100%;">
                            </div>
                            <div>
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Login Password</label>
                                <input type="password" id="f_password" placeholder="Min 8 characters" style="width:100%;">
                            </div>
                            <div>
                                <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Owner Phone Number</label>
                                <input type="tel" id="f_owner_phone" placeholder="e.g. +91 9876543210" style="width:100%;">
                            </div>
                        </div>
                    `, [
                        { label: 'Cancel', onClick: c => c() },
                        {
                            label: 'Register Franchise', primary: true, onClick: async (close) => {
                                const name = document.getElementById('f_name').value;
                                const full_address = document.getElementById('f_address').value;
                                const non_serviceable_areas = document.getElementById('f_non_serviceable').value;
                                const pincodes = document.getElementById('f_pincodes').value;
                                const owner_name = document.getElementById('f_owner_name').value;
                                const owner_username = document.getElementById('f_username').value;
                                const owner_password = document.getElementById('f_password').value;
                                const owner_phone = document.getElementById('f_owner_phone').value;

                                if (!name || !owner_name || !owner_username || !owner_password || !owner_phone) {
                                    return showToast('Please fill all required fields', 'error');
                                }
                                if (owner_password.length < 8) {
                                    return showToast('Owner password must be at least 8 chars', 'error');
                                }

                                try {
                                    const res = await fetch('/api/dashboard/admin/franchises/create', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ name, full_address, non_serviceable_areas, pincodes, owner_name, owner_username, owner_password, owner_phone })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        showToast('Franchise created successfully!', 'success');
                                        fetchFranchises();
                                        fetchStats();
                                        close();
                                    } else {
                                        showToast(data.error, 'error');
                                    }
                                } catch (e) { showToast('Network error', 'error'); }
                            }
                        }
                    ]);
                };
            }

            // 2. Add 'Check Serviceability' Tool & Grouping
            const headerActions = document.querySelector('.page-header .header-actions') || document.querySelector('.page-header > div:last-child') || document.querySelector('.page-header');
            // 2. Add 'Check Serviceability' Tool & Grouping
            if (!document.getElementById('check-pincode-btn')) {
                const checkBtn = document.createElement('button');
                checkBtn.id = 'check-pincode-btn';

                // Copy exact text style + add the + icon for consistency if you want, 
                // but user wants theme match. Let's use search icon.
                checkBtn.innerHTML = '<i class="fas fa-search-location" style="margin-right:8px; font-size: 0.9em;"></i>Check Serviceability';

                // FORCE EXACT STYLE PARITY WITH THE HTML BUTTON
                const styles = {
                    background: 'var(--brand-primary)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '600',
                    fontSize: '0.875rem', // Force standard size
                    lineHeight: '1.2',    // Ensure height consistency
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-md)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                    height: 'auto',
                    minHeight: '42px' // Standard button height for MoveX
                };

                Object.assign(checkBtn.style, styles);

                if (addBtn) {
                    const parent = addBtn.parentNode;

                    // Force the Add Franchise button to also have these exact styles if it doesn't already
                    // to ensure 1:1 match regardless of what's in the HTML file
                    Object.assign(addBtn.style, styles);
                    addBtn.style.minHeight = '42px';

                    let group = parent.querySelector('.header-button-group');
                    if (!group) {
                        group = document.createElement('div');
                        group.className = 'header-button-group';
                        group.style.cssText = 'display:flex; gap:12px; align-items:center;';
                        parent.insertBefore(group, addBtn);
                    }

                    group.appendChild(checkBtn);
                    group.appendChild(addBtn);
                } else {
                    headerActions.appendChild(checkBtn);
                }

                checkBtn.onclick = () => window.MoveXAdmin.handleServiceabilityCheck();
            }

            // 3. Sequential Data Fetch
            await Promise.all([fetchStats(), fetchFranchises()]);
        },

        'shipments': function () {
            showSkeletons('.data-table-container', 'table');

            // Get token from sessionStorage for cross-origin auth
            const session = JSON.parse(sessionStorage.getItem('movexsecuresession') || '{}');
            const token = session.data?.token;
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            fetch(`${API_BASE}/api/dashboard/admin/shipments?limit=1000`, {
                credentials: 'include',
                headers: headers
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.shipments) {
                        MOCK_DATA.shipments = data.shipments;
                        renderShipmentTable(MOCK_DATA.shipments);
                    } else {
                        showToast('Failed to load shipments', 'error');
                        renderShipmentTable();
                    }
                })
                .catch(err => {
                    console.error(err);
                    showToast('Network error', 'error');
                    renderShipmentTable();
                });

            const addBtn = document.getElementById('createNewShipment');
            if (addBtn) addBtn.onclick = () => window.MoveXAdmin.createShipment();

            const searchInput = document.getElementById('shipmentSearchInput');
            const statusSelect = document.getElementById('shipmentStatusFilter');
            const dateInput = document.getElementById('shipmentDateFilter');
            const searchBtn = document.getElementById('shipmentSearchBtn');

            if (searchInput || statusSelect || dateInput) {
                const performSearch = (showMessage = false) => {
                    const query = (searchInput?.value || '').toLowerCase().trim();
                    const status = (statusSelect?.value || 'All Status').toLowerCase();
                    const dateVal = dateInput?.value || '';

                    const filtered = MOCK_DATA.shipments.filter(s => {
                        const mQuery = !query || String(s.id).toLowerCase().includes(query) || String(s.sender).toLowerCase().includes(query) || String(s.mobile).toLowerCase().includes(query);
                        const mStatus = status === 'all status' || s.status.toLowerCase() === status;
                        let mDate = true;
                        if (dateVal) {
                            const d = new Date(s.date);
                            mDate = !isNaN(d) && d.toISOString().split('T')[0] === dateVal;
                        }
                        return mQuery && mStatus && mDate;
                    });
                    renderShipmentTable(filtered, 1);
                    if (showMessage && query) showToast(`Found ${filtered.length} matches`, 'info');
                };

                if (searchBtn) searchBtn.onclick = () => performSearch(true);
                if (searchInput) {
                    // Real-time search
                    searchInput.addEventListener('input', () => performSearch(false));
                    searchInput.onkeydown = (e) => { if (e.key === 'Enter') performSearch(true); };
                }
                if (statusSelect) statusSelect.onchange = () => performSearch(false);
                if (dateInput) dateInput.onchange = () => performSearch(false);
            }
        },

        'staff': function () { renderStaffTable(); },
        'bookings': function () { renderBookingTable(); },

        'finance': function () {
            const kpis = document.querySelectorAll('.card-value');
            if (kpis.length >= 3) {
                // Mock stats for finance currently
                kpis[0].textContent = '₹' + (450000).toLocaleString();
                kpis[1].textContent = '₹45,200';
                kpis[2].textContent = '₹128k';
            }
            const tbody = document.querySelector('.data-table tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td style="font-family: monospace;">TX-9901</td><td>Oct 24, 10:30 AM</td><td>Shipment Payment</td><td>Client: Alice</td><td style="color: var(--success);">+₹45.00</td><td><span class="status-badge status-active">Paid</span></td></tr>
                    <tr><td style="font-family: monospace;">TX-9902</td><td>Oct 24, 09:15 AM</td><td>Franchise Payout</td><td>Mumbai Hub</td><td style="color: var(--text-primary);">-₹1,250.00</td><td><span class="status-badge status-warn">Processing</span></td></tr>
                `;
            }
            const exportBtn = document.querySelector('.page-header button');
            if (exportBtn) exportBtn.onclick = () => showToast('Financial report exported', 'success');
        },

        'reports': function () {
            const buttons = document.querySelectorAll('.page-header button');
            if (buttons.length >= 2) {
                buttons[0].onclick = () => showToast('Date range selector opened', 'info');
                buttons[1].onclick = () => showToast('Exporting report as PDF...', 'success');
            }
            const tbody = document.querySelector('.data-table tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td>Oct 24, 2025</td><td>1,240</td><td>1,150</td><td style="color: var(--warning);">5</td><td>₹24,500</td></tr>
                    <tr><td>Oct 23, 2025</td><td>1,180</td><td>1,100</td><td style="color: var(--warning);">2</td><td>₹22,100</td></tr>
                `;
            }
        },
        'bookings': async () => {
            const tBody = document.getElementById('bookings-table-body');
            if (!tBody) return;

            try {
                const res = await fetch('/api/dashboard/admin/bookings');
                const data = await res.json();

                if (!data.success) throw new Error(data.error);

                // Update KPIs
                const kpiNew = document.getElementById('kpi-new-requests');
                const kpiScheduled = document.getElementById('kpi-scheduled');
                if (kpiNew) kpiNew.textContent = data.stats.newRequests;
                if (kpiScheduled) kpiScheduled.textContent = data.stats.scheduledToday;

                if (data.bookings.length === 0) {
                    tBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-secondary);">No pending requests found.</td></tr>`;
                    return;
                }

                tBody.innerHTML = data.bookings.map(row => `
                     <tr>
                        <td style="font-family: monospace; font-weight: 600;">${row.id}</td>
                        <td>
                            <div>${row.sender}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${row.sender_type}</div>
                        </td>
                        <td>
                            <div>${row.type}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${row.weight} KG</div>
                        </td>
                        <td>${row.location ? row.location.split(',')[0] : 'N/A'}</td>
                        <td>
                             <div>${new Date(row.created_at).toLocaleDateString()}</div>
                             <div style="font-size: 0.75rem; color: var(--text-secondary);">Requested</div>
                        </td>
                        <td>
                            <button class="action-btn process-booking-btn" data-id="${row.id}" data-model='${JSON.stringify(row)}'
                                style="background: var(--brand-primary); color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 0.85rem;">
                                Process
                            </button>
                        </td>
                     </tr>
                `).join('');

                // Bind click events
                document.querySelectorAll('.process-booking-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        // Find the button (target might be inner text)
                        const button = e.target.closest('button');
                        if (!button) return;

                        const raw = button.getAttribute('data-model');
                        const booking = JSON.parse(raw);
                        // Convert booking model to shipment model for the update modal
                        const shipmentModel = {
                            id: booking.id,
                            status: 'Pending'
                        };
                        showUpdateStatusModal(shipmentModel);
                    });
                });

            } catch (err) {
                console.error(err);
                tBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--danger);">Failed to load bookings.</td></tr>`;
            }
        },

        'settings': function () {
            const saveBtn = document.querySelector('button[style*="background: var(--brand-primary)"]');
            if (saveBtn) saveBtn.onclick = () => showToast('Settings saved successfully', 'success');
            document.querySelectorAll('input[type="checkbox"]').forEach(t => {
                t.onchange = () => showToast(`${t.parentElement.textContent.trim()} ${t.checked ? 'enabled' : 'disabled'}`, 'success');
            });
        },

        'audit-logs': function () {
            renderAuditLogs();
            const filterBtn = document.querySelector('.card button');
            if (filterBtn) filterBtn.onclick = () => showToast('Logs filtered', 'info');
        }
    };

    function renderUserTable(data = MOCK_DATA.users) {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return; // Happens if not on users page

        // If data is empty?
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-secondary);">No users found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(u => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 40px; height: 40px; background: var(--brand-primary-soft); color: var(--brand-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                            ${(u.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight: 600;">${u.name}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">${u.username}</div>
                        </div>
                    </div>
                </td>
                <td><span class="status-badge" style="background: ${getRoleBg(u.role)}; color: white; opacity: 0.9; text-transform:capitalize;">${u.role}</span></td>
                <td>${u.org || 'N/A'}</td>
                <td><span class="status-badge status-${u.status}">${u.status}</span></td>
                <td>${u.joined}</td>
                <td>
                    <button class="action-btn" data-username="${u.username}" style="border:none; background:none; cursor:pointer; color:var(--text-secondary);"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg></button>
                </td>
            </tr>
        `).join('');
        tbody.querySelectorAll('.action-btn').forEach(btn => {
            btn.onclick = () => showUserActions(MOCK_DATA.users.find(u => u.username == btn.getAttribute('data-username')));
        });
    }

    function getRoleBg(role) {
        switch (role) {
            case 'admin': return 'var(--accent-purple)';
            case 'franchisee': return 'var(--info)';
            case 'staff': return 'var(--brand-primary)';
            default: return 'var(--text-secondary)';
        }
    }

    function showUserActions(user) {

        const actions = [
            { label: 'Close', onClick: close => close() },
            {
                label: 'Reset Password',
                onClick: (done) => {
                    done(true); // Reset button text immediately, keep main modal open
                    // Open sub-modal for password reset
                    createModal(`Reset Password: ${user.name}`, `
                        <div>
                            <p style="margin-bottom:1rem; font-size:0.9rem;">Set a new password for <strong>${user.username}</strong>.</p>
                            <input type="password" id="reset_pwd" placeholder="New Password (min 8 chars)" 
                                style="width:100%; padding:0.6rem; border:1px solid var(--border-default); border-radius:4px;">
                        </div>
                    `, [
                        { label: 'Cancel', onClick: c => c() },
                        {
                            label: 'Set Password', primary: true, onClick: async (closeSub) => {
                                const newPwd = document.getElementById('reset_pwd').value;
                                if (!newPwd || newPwd.length < 8) return showToast('Password must be at least 8 characters', 'error');

                                try {
                                    const res = await fetch('/api/dashboard/admin/users/reset-password', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ username: user.username, password: newPwd })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        showToast('Password reset successfully', 'success');
                                        closeSub();
                                        closeMain();
                                    } else {
                                        showToast(data.error, 'error');
                                    }
                                } catch (e) { showToast('Network error', 'error'); }
                            }
                        }
                    ]);
                }
            },
            {
                label: user.status === 'active' ? 'Disable User' : 'Enable User',
                onClick: async (close) => {
                    const newStatus = user.status === 'active' ? 'disabled' : 'active';

                    try {
                        const res = await fetch('/api/dashboard/admin/users/status', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: user.username, status: newStatus })
                        });
                        const data = await res.json();

                        if (data.success) {
                            showToast(`User ${newStatus} successfully`, 'success');

                            // Update local state and redraw (or re-fetch, but redraw is faster)
                            user.status = newStatus;
                            renderUserTable();
                            close();
                        } else {
                            showToast(data.error || 'Failed to update status', 'error');
                        }
                    } catch (err) {
                        console.error(err);
                        showToast('Network error', 'error');
                    }
                }
            }
        ];
        createModal(`User: ${user.name}`, `<p>Manage access for <strong>${user.username}</strong>.</p>`, actions);
    }

    function showShipmentDetails(s) {
        // defined inside or outside? Lets define a helper here
        const formatDate = (dateStr) => {
            if (!dateStr) return 'N/A';
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        };

        // Generate Timeline Events based on Status
        const timelineEvents = [];
        const createdDate = new Date(s.created_at);

        // 1. Order Placed (Always)
        timelineEvents.push({
            title: 'Order Placed',
            time: formatDate(s.created_at),
            status: 'completed',
            icon: 'var(--brand-primary)'
        });

        // 2. Processing (If not pending)
        if (s.status !== 'Pending') {
            timelineEvents.push({
                title: 'Order Processed',
                time: formatDate(new Date(createdDate.getTime() + 1000 * 60 * 30)), // Mock +30mins
                status: 'completed',
                icon: 'var(--brand-primary)'
            });
        }

        // 3. Dispatched / In Transit
        if (s.status === 'In Transit' || s.status === 'Delivered') {
            timelineEvents.push({
                title: 'Shipment Dispatched',
                time: formatDate(s.updated_at),
                status: 'completed',
                icon: 'var(--info)'
            });
            timelineEvents.push({
                title: 'In Transit',
                time: 'In Progress',
                status: s.status === 'In Transit' ? 'active' : 'completed',
                icon: 'var(--warning)'
            });
        }

        // 4. Delivered
        if (s.status === 'Delivered') {
            timelineEvents.pop(); // Remove "In Transit" active
            timelineEvents.push({
                title: 'Delivered',
                time: formatDate(s.updated_at),
                status: 'completed',
                icon: 'var(--success)'
            });
        }

        const eventsHTML = timelineEvents.reverse().map((e, index) => `
             <div style="position: relative; padding-bottom: 1.5rem;">
                <div style="position: absolute; left: -21px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: ${e.status === 'completed' || e.status === 'active' ? e.icon : 'var(--text-tertiary)'}; border: 3px solid var(--surface-primary);"></div>
                <div style="font-size: 0.875rem; font-weight: 600; color: ${e.status === 'active' ? 'var(--brand-primary)' : 'var(--text-primary)'}">${e.title}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">${e.time}</div>
            </div>
        `).join('');

        createModal(`Shipment: ${s.id}`, `
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                <!-- Status Banner -->
                <div style="background: var(--brand-primary-soft); padding: 1.25rem; border-radius: var(--radius-lg); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--brand-primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Current Status</div>
                        <div style="font-size: 1.4rem; font-weight: 800; color: var(--brand-primary);">${s.status}</div>
                    </div>
                    <div class="status-badge status-${s.status.toLowerCase().replace(' ', '-')}" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                        Live Tracking
                    </div>
                </div>

                <!-- Sender & Receiver Details -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
                    <!-- Sender -->
                    <div style="background: var(--surface-secondary); padding: 1rem; border-radius: var(--radius-md);">
                        <label style="display: block; font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 700;">Sender Details</label>
                        <div style="font-weight: 600; font-size: 1rem;">${s.sender_name || 'N/A'}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">${s.sender_mobile || 'N/A'}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem; line-height: 1.4;">${s.sender_address || 'N/A'}</div>
                        <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.25rem;">PIN: ${s.sender_pincode || 'N/A'}</div>
                    </div>
                    <!-- Receiver -->
                    <div style="background: var(--surface-secondary); padding: 1rem; border-radius: var(--radius-md);">
                        <label style="display: block; font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 700;">Receiver Details</label>
                        <div style="font-weight: 600; font-size: 1rem;">${s.receiver_name || 'N/A'}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">${s.receiver_mobile || 'N/A'}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem; line-height: 1.4;">${s.receiver_address || 'N/A'}</div>
                        <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.25rem;">PIN: ${s.receiver_pincode || 'N/A'}</div>
                    </div>
                </div>

                <!-- Route -->
                <div style="padding: 1rem; background: var(--surface-secondary); border-radius: var(--radius-md); display: flex; align-items: center; gap: 1rem;">
                    <div style="flex: 1;">
                        <label style="display: block; font-size: 0.65rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 0.2rem;">Origin City</label>
                        <div style="font-weight: 600; font-size: 0.9rem;">${s.full_origin || s.origin || 'N/A'}</div>
                    </div>
                    <svg width="24" height="24" fill="none" stroke="var(--text-tertiary)" stroke-width="2" viewBox="0 0 24 24"><path d="M13 5l7 7-7 7M5 12h15"/></svg>
                    <div style="flex: 1; text-align: right;">
                        <label style="display: block; font-size: 0.65rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 0.2rem;">Destination City</label>
                        <div style="font-weight: 600; font-size: 0.9rem;">${s.full_destination || s.destination || 'N/A'}</div>
                    </div>
                </div>

                <!-- Shipment Info Grid -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
                    <div>
                        <label style="display: block; font-size: 0.65rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 0.3rem; font-weight: 700;">Amount</label>
                        <div style="font-weight: 700; font-size: 1rem; color: var(--success);">₹${typeof s.amount === 'number' ? s.amount.toFixed(2) : s.amount}</div>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.65rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 0.3rem; font-weight: 700;">Weight</label>
                        <div style="font-weight: 600; font-size: 1rem;">${s.weight || 1.0} KG</div>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.65rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 0.3rem; font-weight: 700;">Booked On</label>
                        <div style="font-weight: 600; font-size: 0.9rem;">${new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.65rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 0.3rem; font-weight: 700;">Est. Delivery</label>
                        <div style="font-weight: 600; font-size: 0.9rem;">${s.estimated_delivery ? new Date(s.estimated_delivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</div>
                    </div>
                </div>

                <!-- Simple Timeline -->
                <div>
                    <label style="display: block; font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 0.75rem; font-weight: 700;">Activity Timeline</label>
                    <div style="display: flex; flex-direction: column; position: relative; padding-left: 1.5rem;">
                        <div style="position: absolute; left: 4px; top: 0; bottom: 0; width: 2px; background: var(--border-default);"></div>
                        ${eventsHTML}
                    </div>
                </div>
            </div>
        `, [
            {
                label: 'Print Label',
                onClick: close => {
                    const params = new URLSearchParams({
                        id: s.id,
                        sender: s.sender_name || 'N/A',
                        receiver: s.receiver_name || 'N/A',
                        r_addr: s.full_destination || s.destination,
                        r_phone: s.receiver_mobile || '',
                        origin: s.origin,
                        dest: s.destination,
                        price: s.amount,
                        weight: s.weight || '1.0',
                        r_pincode: s.receiver_pincode || '',
                        s_addr: s.sender_address || ''
                    });

                    window.open(`print_label.html?${params.toString()}`, '_blank');
                    // close(); // Optional: keep modal open or close it? User said "preview comes, i print and thats it". 
                    // Keeping modal open might be better user experience so they can print again if failed.
                }
            },
            {
                label: 'Update Status',
                primary: true,
                onClick: close => {
                    close();
                    showUpdateStatusModal(s);
                }
            }
        ]);
    }

    function renderFranchiseTable() {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = MOCK_DATA.franchises.map(f => `
            <tr>
                <td><strong>${f.id}</strong></td>
                <td>${f.name}</td>
                <td>${f.owner}</td>
                <td>${f.location}</td>
                <td><span class="status-badge status-${f.status}">${f.status}</span></td>
                <td>₹${f.revenue.toLocaleString()}</td>
                <td><button class="btn-view" style="background:none; border:none; color:var(--brand-primary); cursor:pointer; font-weight:600;">View</button></td>
            </tr>
        `).join('');
        tbody.querySelectorAll('.btn-view').forEach((btn, i) => btn.onclick = () => showFranchiseDetails(MOCK_DATA.franchises[i]));
    }

    function showFranchiseDetails(f) {
        createModal(f.name, `<p>Location: ${f.location}</p><p>Owner: ${f.owner}</p>`, [
            { label: 'Close', onClick: close => close() },
            { label: 'Contact', primary: true, onClick: close => { showToast('Opening messenger...', 'info'); close(); } }
        ]);
    }

    function renderShipmentTable(data = MOCK_DATA.shipments, page = null) {
        // Update Page if provided
        if (page !== null) SHIP_PAGE = page;

        const targetBody = document.querySelector('.data-table tbody');
        if (!targetBody) return;

        // Calculate Pagination
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / SHIP_LIMIT) || 1;

        // Ensure valid page
        if (SHIP_PAGE < 1) SHIP_PAGE = 1;
        if (SHIP_PAGE > totalPages) SHIP_PAGE = totalPages;

        const startIndex = (SHIP_PAGE - 1) * SHIP_LIMIT;
        const endIndex = startIndex + SHIP_LIMIT;
        const slicedData = data.slice(startIndex, endIndex);

        if (slicedData.length === 0) {
            targetBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 4rem; color: var(--text-tertiary); font-weight: 500;">No shipments found matching your criteria.</td></tr>`;
            const controls = document.getElementById('paginationControls');
            if (controls) controls.innerHTML = '';
            return;
        }

        // Render rows 
        targetBody.innerHTML = slicedData.map(s => `
            <tr style="display: table-row !important; visibility: visible !important; opacity: 1 !important; border-bottom: 1px solid var(--border-subtle);">
                <td style="padding: 1rem; font-family: monospace; font-weight: 600; color: var(--brand-primary);">${s.id}</td>
                <td style="padding: 1rem;"><span class="status-badge status-${s.status.toLowerCase().replace(' ', '-')}">${s.status}</span></td>
                <td style="padding: 1rem;">
                    <div style="font-weight: 600; color: var(--text-primary);">${s.sender}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${s.mobile}</div>
                </td>
                <td style="padding: 1rem; color: var(--text-primary);">${s.origin}</td>
                <td style="padding: 1rem; color: var(--text-primary);">${s.destination}</td>
                <td style="padding: 1rem; color: var(--text-primary);">${s.date}</td>
                <td style="padding: 1rem; color: var(--text-primary);"><strong style="font-family: monospace;">₹${typeof s.amount === 'number' ? s.amount.toFixed(2) : s.amount}</strong></td>
                <td style="padding: 1rem;">
                    <button class="track-btn" style="background:none; border:none; color:var(--brand-primary); cursor:pointer; font-weight:600; padding: 0.5rem; border-radius: 4px; transition: all 0.2s;">View</button>
                </td>
            </tr>
        `).join('');

        // Re-attach event listeners (using slicedData)
        targetBody.querySelectorAll('.track-btn').forEach((btn, i) => {
            btn.onclick = (e) => {
                e.stopPropagation();
                showShipmentDetails(slicedData[i]);
            };
        });

        targetBody.querySelectorAll('tr').forEach((row, i) => {
            row.onclick = () => showShipmentDetails(slicedData[i]);
        });

        // Render Pagination Controls
        const controls = document.getElementById('paginationControls');
        if (controls) {
            controls.innerHTML = ''; // Clear previous

            // Previous Button
            const prevBtn = document.createElement('button');
            prevBtn.innerText = 'Previous';
            prevBtn.className = 'btn-secondary'; // Use existing class if available or style directly
            prevBtn.style.cssText = `padding: 0.5rem 1rem; border: 1px solid var(--border-default); background: var(--surface-secondary); color: var(--text-primary); border-radius: 6px; cursor: pointer; ${SHIP_PAGE === 1 ? 'opacity: 0.5; pointer-events: none;' : ''}`;
            prevBtn.onclick = () => renderShipmentTable(data, SHIP_PAGE - 1);

            // Info Text
            const info = document.createElement('span');
            info.innerText = `Page ${SHIP_PAGE} of ${totalPages} (${totalItems} items)`;
            info.style.cssText = 'font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);';

            // Next Button
            const nextBtn = document.createElement('button');
            nextBtn.innerText = 'Next';
            nextBtn.style.cssText = `padding: 0.5rem 1rem; border: 1px solid var(--border-default); background: var(--surface-secondary); color: var(--text-primary); border-radius: 6px; cursor: pointer; ${SHIP_PAGE === totalPages ? 'opacity: 0.5; pointer-events: none;' : ''}`;
            nextBtn.onclick = () => renderShipmentTable(data, SHIP_PAGE + 1);

            controls.appendChild(prevBtn);
            controls.appendChild(info);
            controls.appendChild(nextBtn);
        }
    }

    function renderStaffTable() {
        const staffData = [
            { id: 'MXSTF001', name: 'Amit Patel', role: 'Driver', org: 'Andheri East, Mumbai', status: 'On Duty', contact: '+91 98765 00001' },
            { id: 'MXSTF002', name: 'Rohit Sharma', role: 'Manager', org: 'Bhiwandi Warehouse', status: 'Active', contact: '+91 98765 00002' },
            { id: 'MXSTF003', name: 'Priya Singh', role: 'Support Agent', org: 'HQ Call Center', status: 'Active', contact: '+91 98765 00003' }
        ];
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = staffData.map(s => `
            <tr>
                <td>
                    <div style="font-weight: 600;">${s.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">ID: ${s.id}</div>
                </td>
                <td><span class="status-badge" style="background: var(--surface-tertiary); color: var(--text-primary);">${s.role}</span></td>
                <td>${s.org}</td>
                <td><span class="status-badge status-active">${s.status}</span></td>
                <td>${s.contact}</td>
                <td><button class="edit-btn" style="border: 1px solid var(--border-default); background: var(--surface-primary); color: var(--text-primary); padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;">Edit</button></td>
            </tr>
        `).join('');
        tbody.querySelectorAll('.edit-btn').forEach((btn, i) => {
            btn.onclick = () => showToast(`Editing staff: ${staffData[i].name}`, 'info');
        });
        const addBtn = document.querySelector('.page-header button');
        if (addBtn) addBtn.onclick = () => showToast('Staff onboarding modal', 'info');
    }

    function renderBookingTable() {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = MOCK_DATA.shipments.map(s => `
            <tr>
                <td>${s.id.replace('MX', 'BK')}</td>
                <td>${s.sender}</td>
                <td>${s.origin}</td>
                <td>${s.date}</td>
                <td><span class="status-badge status-warn">Pending</span></td>
                <td>
                    <button class="app-btn" style="color:var(--success); border:none; background:none; cursor:pointer; font-weight:600;">Approve</button>
                    <button class="rej-btn" style="color:var(--status-error); border:none; background:none; cursor:pointer; font-weight:600; margin-left:10px;">Reject</button>
                </td>
            </tr>
        `).join('');
        tbody.querySelectorAll('.app-btn').forEach(btn => btn.onclick = () => showToast('Booking Approved', 'success'));
        tbody.querySelectorAll('.rej-btn').forEach(btn => btn.onclick = () => showToast('Booking Rejected', 'error'));
    }

    function renderTags(str) {
        if (!str) return '<span style="color:var(--text-tertiary); font-style:italic;">None</span>';
        return str.split(',').map(tag => `
            <span style="display:inline-block; padding:2px 8px; background:var(--surface-secondary); border:1px solid var(--border-default); border-radius:4px; font-size:0.75rem; font-weight:600; margin:2px;">
                ${tag.trim()}
            </span>
        `).join('');
    }

    function renderFranchiseTable(data = MOCK_DATA.franchises) {
        const tbody = document.getElementById('franchise-table-body');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-secondary);">No franchises found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(f => `
            <tr class="staggered-item visible">
                <td>
                    <div style="font-weight: 700; color: var(--text-primary);">${f.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-tertiary);">ID: FR-${String(f.id).padStart(3, '0')}</div>
                    <div style="font-size: 0.7rem; color: var(--text-tertiary); margin-top:4px; max-width:200px;" title="${f.full_address || ''}">
                        <i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>${f.full_address || 'No address set'}
                    </div>
                </td>
                <td>
                    <div style="font-weight: 600;">${f.owner_name || 'Unassigned'}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${f.owner_username || ''}</div>
                    <div style="font-size: 0.75rem; color: var(--brand-primary); font-weight: 600; margin-top: 2px;">
                        <i class="fas fa-phone-alt" style="font-size: 0.7rem; margin-right: 4px;"></i>${f.owner_phone || 'No Number'}
                    </div>
                </td>
                <td style="max-width: 150px;">
                    <div style="display: flex; flex-wrap: wrap;">
                        ${renderTags(f.non_serviceable_areas)}
                    </div>
                </td>
                <td style="max-width: 200px;">
                    <div style="display: flex; flex-wrap: wrap;">
                        ${renderTags(f.pincodes)}
                    </div>
                </td>
                <td>
                    <span class="status-badge status-${f.status || 'active'}" style="text-transform: capitalize;">
                        ${f.status || 'Active'}
                    </span>
                </td>
                <td>
                    <div style="font-weight: 700; color: ${(f.performance || 0) > 95 ? 'var(--success)' : (f.performance || 0) > 85 ? 'var(--warning)' : 'var(--error)'};">
                        ${f.performance || '0.00'}%
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-tertiary);">SLA Match</div>
                </td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                         <button class="action-btn-small edit-franchise" data-id="${f.id}"
                            style="padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-default); background: var(--surface-primary); cursor: pointer; font-size: 0.75rem;">
                            Edit
                        </button>
                         <button class="action-btn-small status-toggle" data-id="${f.id}" data-status="${f.status}"
                            style="padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-default); background: ${f.status === 'active' ? 'var(--surface-primary)' : 'var(--brand-primary-soft)'}; cursor: pointer; font-size: 0.75rem;">
                            ${f.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Bind events
        tbody.querySelectorAll('.status-toggle').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;
                const currentStatus = btn.dataset.status;
                const newStatus = currentStatus === 'active' ? 'disabled' : 'active';

                try {
                    const res = await fetch('/api/dashboard/admin/franchises/status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, status: newStatus })
                    });
                    const result = await res.json();
                    if (result.success) {
                        showToast(`Franchise ${newStatus} successfully`, 'success');
                        // Refresh
                        if (initializers.franchises) initializers.franchises();
                    } else {
                        showToast(result.error, 'error');
                    }
                } catch (e) { showToast('Network Error', 'error'); }
            };
        });

        tbody.querySelectorAll('.edit-franchise').forEach(btn => {
            btn.onclick = () => {
                const f = data.find(item => item.id == btn.dataset.id);
                if (!f) return;

                createModal(`Edit Franchise: ${f.name}`, `
                    <div style="display:flex; flex-direction:column; gap:1.2rem;">
                        <div>
                            <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Franchise Name</label>
                            <input type="text" id="edit_f_name" value="${f.name || ''}" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Full Address</label>
                            <textarea id="edit_f_address" style="width:100%; min-height:60px;">${f.full_address || ''}</textarea>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Not Serviceable Area</label>
                            <input type="text" id="edit_f_non_serviceable" value="${f.non_serviceable_areas || ''}" placeholder="Comma separated, e.g. Slum Area 1, Hilly Terrain" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Assigned Pincodes</label>
                            <input type="text" id="edit_f_pincodes" value="${f.pincodes || ''}" placeholder="Comma separated, e.g. 560048, 560016" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Performance Score (%)</label>
                            <input type="number" id="edit_f_perf" value="${f.performance || '0.00'}" step="0.01" min="0" max="100" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Owner Full Name</label>
                            <input type="text" id="edit_f_owner_name" value="${f.owner_name || ''}" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Owner Username</label>
                            <input type="text" id="edit_f_owner_username" value="${f.owner_username || ''}" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Owner Phone Number</label>
                            <input type="tel" id="edit_f_phone" value="${f.owner_phone || ''}" placeholder="e.g. +91 9876543210" style="width:100%;">
                        </div>
                        <div style="padding:1rem; background:var(--surface-secondary); border-radius:var(--radius-md); font-size:0.85rem; border-left: 4px solid var(--warning);">
                            <i class="fas fa-info-circle" style="color:var(--warning); margin-right:8px;"></i>
                            <strong>Note:</strong> Password management is handled in the <a href="users" onclick="document.querySelector('a[href=\'users\']').click(); return false;" style="color:var(--brand-primary); text-decoration:none; font-weight:600;">Users Section</a>.
                        </div>
                    </div>
                `, [
                    { label: 'Cancel', onClick: c => c() },
                    {
                        label: 'Save Changes', primary: true, onClick: async (close) => {
                            const name = document.getElementById('edit_f_name').value;
                            const full_address = document.getElementById('edit_f_address').value;
                            const non_serviceable_areas = document.getElementById('edit_f_non_serviceable').value;
                            const pincodes = document.getElementById('edit_f_pincodes').value;
                            const performance = document.getElementById('edit_f_perf').value;
                            const owner_phone = document.getElementById('edit_f_phone').value;
                            const owner_name = document.getElementById('edit_f_owner_name').value;
                            const owner_username = document.getElementById('edit_f_owner_username').value;

                            try {
                                const res = await fetch('/api/dashboard/admin/franchises/update', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        id: f.id,
                                        name,
                                        full_address,
                                        non_serviceable_areas,
                                        pincodes,
                                        performance,
                                        owner_phone,
                                        owner_name,
                                        owner_username
                                    })
                                });
                                const result = await res.json();
                                if (result.success) {
                                    showToast('Franchise updated successfully', 'success');
                                    if (initializers.franchises) initializers.franchises();
                                    close();
                                } else { showToast(result.error, 'error'); }
                            } catch (e) { showToast('Network Error', 'error'); }
                        }
                    }
                ]);
            };
        });
    }

    function renderAuditLogs() {
        const logs = [
            { timestamp: 'Oct 24, 14:32:01', user: 'admin', action: 'Updated System Settings', ip: '192.168.1.1', status: 'Success' },
            { timestamp: 'Oct 24, 14:05:22', user: 'john.doe', action: 'Login Attempt', ip: '10.0.0.52', status: 'Failed' },
            { timestamp: 'Oct 24, 13:55:00', user: 'system', action: 'Cron Job: Invoice Gen', ip: 'localhost', status: 'Success' }
        ];
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = logs.map(l => `
            <tr>
                <td style="font-family: monospace;">${l.timestamp}</td>
                <td>${l.user}</td>
                <td>${l.action}</td>
                <td style="font-family: monospace;">${l.ip}</td>
                <td><span class="status-badge status-${l.status === 'Success' ? 'active' : 'error'}">${l.status}</span></td>
            </tr>
        `).join('');
    }

    function initCustomSelects() {
        const selects = document.querySelectorAll('select:not(.custom-initialized)');
        selects.forEach(select => {
            select.classList.add('custom-initialized');
            select.style.display = 'none';

            const wrapper = document.createElement('div');
            wrapper.className = 'custom-select-wrapper';

            const trigger = document.createElement('div');
            trigger.className = 'custom-select-trigger';
            trigger.innerHTML = `<span>${select.options[select.selectedIndex].text}</span><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>`;

            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'custom-options';

            Array.from(select.options).forEach((option, index) => {
                const opt = document.createElement('div');
                opt.className = `custom-option ${index === select.selectedIndex ? 'selected' : ''}`;
                opt.textContent = option.text;
                opt.onclick = () => {
                    select.selectedIndex = index;
                    trigger.querySelector('span').textContent = option.text;
                    optionsContainer.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    wrapper.classList.remove('open');
                    select.dispatchEvent(new Event('change'));
                };
                optionsContainer.appendChild(opt);
            });

            trigger.onclick = (e) => {
                e.stopPropagation();
                const wasOpen = wrapper.classList.contains('open');

                // Close all other dropdowns
                document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                    w.classList.remove('open');
                    w.closest('.card')?.classList.remove('has-open-dropdown');
                });

                if (!wasOpen) {
                    wrapper.classList.add('open');
                    wrapper.closest('.card')?.classList.add('has-open-dropdown');
                }
            };

            wrapper.appendChild(trigger);
            wrapper.appendChild(optionsContainer);
            select.parentNode.insertBefore(wrapper, select);
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                w.classList.remove('open');
                w.closest('.card')?.classList.remove('has-open-dropdown');
            });
        });
    }



    return {
        init: function (page) {
            console.log('MoveX Core: Initializing', page);

            // Apply page fade-in
            const container = document.querySelector('.dashboard-container');
            if (container) {
                container.classList.add('page-fade-in');
            }

            if (initializers[page]) {
                initializers[page]();
            }

            // Initialize custom UI elements
            initCustomSelects();

            // Initialize Flatpickr for any date inputs
            // Initialize Flatpickr for any date inputs - DISABLED FOR NATIVE UI
            /* 
            if (window.flatpickr) {
                const dateInputs = document.querySelectorAll('input[type="date"]');
                dateInputs.forEach(input => {
                    input.type = 'text';
                    input.placeholder = 'Select Date...';
                    window.flatpickr(input, {
                        dateFormat: "Y-m-d"
                    });
                });
            }
            */
        },
        toast: showToast,
        modal: createModal,
        handleServiceabilityCheck: handleServiceabilityCheck,
        createShipment: function () {
            createModal('Create New Shipment', `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem;">
                    
                    <!-- Sender Section -->
                    <div style="grid-column: span 2; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-subtle); margin-bottom: 0.5rem;">
                        <div style="font-size: 0.95rem; font-weight: 700; color: var(--brand-primary); letter-spacing: 0.02em;">SENDER DETAILS</div>
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Sender Name <span style="color:red">*</span></label>
                        <input type="text" id="ship_sender_name" placeholder="Full Name" style="width:100%;" autocomplete="off">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Sender Mobile <span style="color:red">*</span></label>
                        <input type="tel" id="ship_sender_mobile" placeholder="+91 9876543210" style="width:100%;" autocomplete="off">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Sender Pincode <span style="color:red">*</span></label>
                        <input type="text" id="ship_sender_pincode" placeholder="6-digit Pincode" maxlength="6" style="width:100%;" autocomplete="off">
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Sender Address <span style="color:red">*</span></label>
                        <textarea id="ship_sender_address" placeholder="Complete address" rows="2" style="width:100%; resize: vertical;"></textarea>
                    </div>

                    <!-- Receiver Section -->
                    <div style="grid-column: span 2; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-subtle); margin-bottom: 0.5rem; margin-top: 0.5rem;">
                        <div style="font-size: 0.95rem; font-weight: 700; color: var(--brand-primary); letter-spacing: 0.02em;">RECEIVER DETAILS</div>
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Receiver Name <span style="color:red">*</span></label>
                        <input type="text" id="ship_receiver_name" placeholder="Full Name" style="width:100%;" autocomplete="off">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Receiver Mobile <span style="color:red">*</span></label>
                        <input type="tel" id="ship_receiver_mobile" placeholder="+91 9876543210" style="width:100%;" autocomplete="off">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Receiver Pincode <span style="color:red">*</span></label>
                        <input type="text" id="ship_receiver_pincode" placeholder="6-digit Pincode" maxlength="6" style="width:100%;" autocomplete="off">
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Receiver Address <span style="color:red">*</span></label>
                        <textarea id="ship_receiver_address" placeholder="Complete address" rows="2" style="width:100%; resize: vertical;"></textarea>
                    </div>

                    <!-- Shipment Logisitcs -->
                    <div style="grid-column: span 2; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-subtle); margin-bottom: 0.5rem; margin-top: 0.5rem;">
                         <div style="font-size: 0.95rem; font-weight: 700; color: var(--brand-primary); letter-spacing: 0.02em;">SHIPMENT INFO</div>
                    </div>
                    <div style="position: relative;">
                        <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Origin City <span style="color:red">*</span></label>
                        <input type="text" id="loc_origin_val" placeholder="Select City" style="width:100%;" autocomplete="new-password" name="no-fill-origin">
                    </div>
                    <div style="position: relative;">
                        <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Destination City <span style="color:red">*</span></label>
                        <input type="text" id="loc_dest_val" placeholder="Select City" style="width:100%;" autocomplete="new-password" name="no-fill-destination">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Amount (₹) <span style="color:red">*</span></label>
                        <input type="number" id="ship_amount" placeholder="0.00" style="width:100%;" autocomplete="off">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Weight (Kg) <span style="color:red">*</span></label>
                        <input type="number" id="ship_weight" placeholder="1.0" step="0.1" style="width:100%;" autocomplete="off">
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:600;">Ship Date <span style="color:red">*</span></label>
                        <input type="date" id="ship_date" style="width:100%;">
                    </div>
                </div>
            `, [
                { label: 'Cancel', onClick: (close) => close() },
                {
                    label: 'Create Shipment', primary: true, onClick: async (close) => {
                        // Gather Data
                        const sender_name = document.getElementById('ship_sender_name').value.trim();
                        const sender_mobile = document.getElementById('ship_sender_mobile').value.trim();
                        const sender_address = document.getElementById('ship_sender_address').value.trim();
                        const sender_pincode = document.getElementById('ship_sender_pincode').value.trim();

                        const receiver_name = document.getElementById('ship_receiver_name').value.trim();
                        const receiver_mobile = document.getElementById('ship_receiver_mobile').value.trim();
                        const receiver_address = document.getElementById('ship_receiver_address').value.trim();
                        const receiver_pincode = document.getElementById('ship_receiver_pincode').value.trim();

                        const origin = document.getElementById('loc_origin_val').dataset.value || document.getElementById('loc_origin_val').value;
                        const destination = document.getElementById('loc_dest_val').dataset.value || document.getElementById('loc_dest_val').value;
                        const price = document.getElementById('ship_amount').value.trim();
                        const weight = document.getElementById('ship_weight').value.trim();
                        const date = document.getElementById('ship_date').value;

                        // Mandatory Check
                        if (!sender_name || !sender_mobile || !sender_address || !sender_pincode ||
                            !receiver_name || !receiver_mobile || !receiver_address || !receiver_pincode ||
                            !origin || !destination || !price || !weight || !date) {
                            return showToast('All fields are mandatory', 'error');
                        }

                        // Validation
                        // Allow spaces in names
                        if (!/^[a-zA-Z\s]+$/.test(sender_name) || !/^[a-zA-Z\s]+$/.test(receiver_name)) {
                            return showToast('Names must contain only letters', 'error');
                        }
                        if (!/^[0-9+]+$/.test(sender_mobile) || !/^[0-9+]+$/.test(receiver_mobile)) {
                            return showToast('Mobile numbers must contain only numbers and +', 'error');
                        }
                        if (!/^\d{6}$/.test(sender_pincode) || !/^\d{6}$/.test(receiver_pincode)) {
                            return showToast('Pincodes must be exactly 6 digits', 'error');
                        }
                        if (isNaN(price) || parseFloat(price) <= 0) {
                            return showToast('Invalid amount', 'error');
                        }

                        try {
                            const payload = {
                                sender_name, sender_mobile, sender_address, sender_pincode,
                                receiver_name, receiver_mobile, receiver_address, receiver_pincode,
                                origin, destination, price, weight, date
                            };

                            // Get token for cross-origin auth
                            const session = JSON.parse(sessionStorage.getItem('movexsecuresession') || '{}');
                            const token = session.data?.token;
                            const headers = { 'Content-Type': 'application/json' };
                            if (token) headers['Authorization'] = `Bearer ${token}`;

                            const res = await fetch(`${API_BASE}/api/dashboard/admin/shipments/create`, {
                                method: 'POST',
                                headers: headers,
                                credentials: 'include',
                                body: JSON.stringify(payload)
                            });

                            const data = await res.json();
                            if (data.success) {
                                showToast(`Shipment ${data.shipment.tracking_id} created successfully!`, 'success');
                                close();
                                // Reload shipments if currently viewing them
                                if (document.querySelector('a[href="shipments"].active') || window.location.pathname.endsWith('shipments')) {
                                    if (initializers['shipments']) initializers['shipments']();
                                } else {
                                    // Navigate to shipments page see new data
                                    setTimeout(() => {
                                        const shipmentsLink = document.querySelector('a[href="shipments"]');
                                        if (shipmentsLink) shipmentsLink.click();
                                    }, 1000);
                                }
                            } else {
                                showToast(data.error || 'Failed to create shipment', 'error');
                            }
                        } catch (err) {
                            console.error(err);
                            showToast('Network error while creating shipment', 'error');
                        }
                    }
                }
            ]);

            // Initialize custom city pickers with updated IDs
            initCityPicker('loc_origin_val');
            initCityPicker('loc_dest_val');

            // Re-init flatpickr inside modal
            if (this.init) this.init('modal-date');
        }
    };



    // --- Update Status Modal ---
    function showUpdateStatusModal(s) {
        const statusOptions = ['Pending', 'In Transit', 'Delivered', 'Failed', 'Returned'];
        const currentStatus = s.status ? s.status.toLowerCase().replace('_', ' ') : 'pending';

        // Helper to check selected status (case-insensitive)
        const isSelected = (opt) => opt.toLowerCase() === currentStatus;

        const optionsHTML = statusOptions.map(opt =>
            `<option value="${opt}" ${isSelected(opt) ? 'selected' : ''}>${opt}</option>`
        ).join('');

        createModal(`Update Status: ${s.id}`, `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="background: var(--surface-secondary); padding: 1rem; border-radius: var(--radius-md); border-left: 4px solid var(--brand-primary);">
                    <div style="font-size: 0.8rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700;">Current Status</div>
                    <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-top: 0.25rem;">${s.status}</div>
                </div>

                <div>
                    <label style="display: block; font-size: 0.8rem; margin-bottom: 0.5rem; font-weight: 600;">New Status</label>
                    <select id="update-status-select" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--surface-primary); color: var(--text-primary); font-size: 1rem;">
                        ${optionsHTML}
                    </select>
                </div>
                
                <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
                    <strong style="color: var(--brand-primary);">Note:</strong> Updating the status will immediately reflect on the user tracking page and send an update notification (if enabled).
                </p>
            </div>
        `, [
            { label: 'Cancel', onClick: close => close() },
            {
                label: 'Update Status',
                primary: true,
                onClick: async (close) => {
                    const newStatus = document.getElementById('update-status-select').value;
                    if (!newStatus) return;

                    const btn = document.querySelector('.modal-actions button.btn-primary');
                    if (btn) {
                        btn.textContent = 'Updating...';
                        btn.disabled = true;
                        btn.style.opacity = '0.7';
                    }

                    try {
                        const response = await fetch('/api/dashboard/admin/shipments/update-status', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tracking_id: s.id, status: newStatus })
                        });

                        const result = await response.json();

                        if (result.success) {
                            showToast('Status updated successfully', 'success');
                            close();

                            // Context-Aware Refresh
                            const currentPage = window.location.pathname.split('/').pop().replace('.html', '');

                            // Check manually created 'active' link logic usually managed by layout.js
                            const activeLink = document.querySelector('.nav-link.active');
                            const activeHref = activeLink ? activeLink.getAttribute('href') : '';

                            if (activeHref === 'bookings' || currentPage === 'bookings') {
                                // Refresh Bookings Table
                                if (initializers['bookings']) initializers['bookings']();
                            } else if (typeof renderShipmentTable === 'function') {
                                // Refresh Shipments Table (Default)
                                renderShipmentTable();
                            } else if (activeHref === 'shipments') {
                                activeLink.click();
                            }
                        } else {
                            showToast(result.error || 'Update failed', 'error');
                            if (btn) {
                                btn.textContent = 'Update Status';
                                btn.disabled = false;
                                btn.style.opacity = '1';
                            }
                        }
                    } catch (e) {
                        console.error(e);
                        showToast('Network error', 'error');
                        if (btn) {
                            btn.textContent = 'Update Status';
                            btn.disabled = false;
                            btn.style.opacity = '1';
                        }
                    }
                }
            }
        ]);
    }

})();
