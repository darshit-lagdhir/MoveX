/**
 * MoveX Admin Core Logic
 * Handles functionality for all admin sections.
 */

window.MoveXAdmin = (function () {
    'use strict';

    // --- MOCK DATA ---
    const MOCK_DATA = {
        stats: {
            totalShipments: 12450,
            shipmentTrend: '+12.5% vs last month',
            activeFranchises: 48,
            franchiseTrend: '+2 New this week',
            totalRevenue: 845200,
            revenueTrend: '+8.2% vs last month',
            failedDeliveries: 1.2,
            failedTrend: '-0.5% Improved'
        },
        shipments: [
            { id: 'MX290012', status: 'In Transit', origin: 'Mumbai, MH', destination: 'Delhi, NCR', date: 'Oct 24, 2025', amount: 124.00, customer: 'Alice Smith', email: 'alice@example.com' },
            { id: 'MX290013', status: 'Pending', origin: 'Bangalore, KA', destination: 'Chennai, TN', date: 'Oct 24, 2025', amount: 89.50, customer: 'Bob Johnson', email: 'bob@example.com' },
            { id: 'MX290014', status: 'Delivered', origin: 'Hyderabad, TS', destination: 'Pune, MH', date: 'Oct 23, 2025', amount: 45.00, customer: 'Charlie Brown', email: 'charlie@example.com' },
            { id: 'MX290015', status: 'Failed', origin: 'Kolkata, WB', destination: 'Ahmedabad, GJ', date: 'Oct 23, 2025', amount: 210.00, customer: 'David Wilson', email: 'david@example.com' },
            { id: 'MX290016', status: 'In Transit', origin: 'Surat, GJ', destination: 'Jaipur, RJ', date: 'Oct 22, 2025', amount: 315.00, customer: 'Eve Davis', email: 'eve@example.com' }
        ],
        users: [
            { id: 1, name: 'System Administrator', email: 'admin@movex.com', role: 'admin', org: 'MoveX HQ', status: 'active', joined: 'Oct 15, 2023' },
            { id: 2, name: 'John Doe', email: 'john.doe@hub1.com', role: 'franchisee', org: 'Mumbai Hub', status: 'active', joined: 'Jan 10, 2024' },
            { id: 3, name: 'Jane Smith', email: 'jane.smith@support.com', role: 'staff', org: 'Delhi Branch', status: 'active', joined: 'Mar 05, 2024' },
            { id: 4, name: 'Mike Ross', email: 'mike.ross@delivery.com', role: 'staff', org: 'Bangalore Hub', status: 'disabled', joined: 'May 12, 2024' },
            { id: 5, name: 'Sarah Connor', email: 'sarah.c@user.com', role: 'customer', org: 'Direct', status: 'active', joined: 'Jun 20, 2024' }
        ],
        franchises: [
            { id: 'F-001', name: 'West Zone Logistics', owner: 'Robert Fox', location: 'Mumbai, MH', status: 'active', revenue: 45000 },
            { id: 'F-002', name: 'North India Couriers', owner: 'Jenny Wilson', location: 'Delhi, NCR', status: 'active', revenue: 32000 },
            { id: 'F-003', name: 'South Express', owner: 'Cameron Williamson', location: 'Chennai, TN', status: 'pending', revenue: 0 },
            { id: 'F-004', name: 'Gujarat Speed', owner: 'Guy Hawkins', location: 'Ahmedabad, GJ', status: 'active', revenue: 28000 }
        ],
        auditLogs: [
            { id: 1, user: 'admin@movex.com', action: 'Login Success', details: 'User logged in from 192.168.1.1', timestamp: '2025-10-24 10:30:15' },
            { id: 2, user: 'john.doe@hub1.com', action: 'Update Shipment', details: 'Shipment MX290012 status changed to In Transit', timestamp: '2025-10-24 11:15:22' },
            { id: 3, user: 'admin@movex.com', action: 'Create User', details: 'New staff user mike.ross@delivery.com created', timestamp: '2025-10-24 09:45:10' }
        ]
    };

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
                if (header) {
                    const icon = header.querySelector('.card-icon');
                    if (icon) icon.innerHTML = '<div class="skeleton" style="height:48px; width:48px; border-radius:50%;"></div>';
                }
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
        toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.4s var(--easing-smooth) forwards';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
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
            max-width: 520px;
            padding: 0;
            transform: scale(0.95) translateY(20px);
            transition: all 0.3s var(--easing-spring);
            background: var(--surface-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-2xl);
            overflow: hidden;
        `;

        const headerHTML = `
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-default); display: flex; justify-content: space-between; align-items: center; background: var(--surface-secondary);">
                <h3 style="margin:0; font-size: 1.25rem; font-weight: 700;">${title}</h3>
                <button class="modal-close" style="background:var(--surface-primary); border:1px solid var(--border-subtle); cursor:pointer; color: var(--text-secondary); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:all 0.2s;">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `;

        const bodyHTML = `<div style="padding: 2rem;">${content}</div>`;

        const footerHTML = actions.length ? `
            <div style="padding: 1.25rem 2rem; border-top: 1px solid var(--border-default); display: flex; justify-content: flex-end; gap: 1rem; background: var(--surface-secondary);">
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
                a.onClick(() => {
                    btn.innerHTML = a.label;
                    btn.disabled = false;
                    close();
                });
            };
        });

        return { close };
    }

    // --- INITIALIZERS FOR EACH SECTION ---

    const initializers = {
        'dashboard.html': function () {
            // Show Skeletons first
            showSkeletons('.grid-kpi', 'cards');
            showSkeletons('.data-table-container', 'table');

            // Simulate data fetch
            setTimeout(() => {
                const kpiCards = document.querySelectorAll('.grid-kpi .card');
                if (kpiCards.length >= 4) {
                    // Number Counter Animations
                    animateValue(kpiCards[0].querySelector('.card-value'), 0, MOCK_DATA.stats.totalShipments, 1500);
                    animateValue(kpiCards[1].querySelector('.card-value'), 0, MOCK_DATA.stats.activeFranchises, 1000);
                    animateValue(kpiCards[2].querySelector('.card-value'), 0, MOCK_DATA.stats.totalRevenue / 1000, 2000, '₹', 'k');
                    animateValue(kpiCards[3].querySelector('.card-value'), 0, MOCK_DATA.stats.failedDeliveries, 1000, '', '%');

                    kpiCards[0].querySelector('.card-trend span').textContent = MOCK_DATA.stats.shipmentTrend;
                    kpiCards[1].querySelector('.card-trend span').textContent = MOCK_DATA.stats.franchiseTrend;
                    kpiCards[2].querySelector('.card-trend span').textContent = MOCK_DATA.stats.revenueTrend;
                    kpiCards[3].querySelector('.card-trend span').textContent = MOCK_DATA.stats.failedTrend;
                }

                const tbody = document.querySelector('.data-table tbody');
                if (tbody) {
                    tbody.innerHTML = MOCK_DATA.shipments.slice(0, 4).map(s => `
                        <tr>
                            <td style="font-family: monospace; font-weight: 600; color: var(--brand-primary);">${s.id}</td>
                            <td><span class="status-badge status-${s.status.toLowerCase().replace(' ', '-')}">${s.status}</span></td>
                            <td>${s.origin}</td>
                            <td>${s.destination}</td>
                            <td>${s.date}</td>
                            <td><strong style="font-family: monospace;">₹${s.amount.toFixed(2)}</strong></td>
                        </tr>
                    `).join('');

                    tbody.querySelectorAll('tr').forEach((row, i) => {
                        row.onclick = () => showShipmentDetails(MOCK_DATA.shipments[i]);
                    });

                    // Staggered table row entry
                    staggerEntries('.data-table tbody tr', 50);
                }

                // Staggered card entrance
                staggerEntries('.grid-kpi .card', 100);
            }, 600); // Artificial delay to show skeletons

            // Add "Last Updated" timestamp
            const header = document.querySelector('.page-header');
            if (header && !header.querySelector('.live-indicator')) {
                const updated = document.createElement('div');
                updated.className = 'live-indicator';
                updated.style.cssText = 'font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.25rem; display: flex; align-items: center; gap: 0.4rem;';
                updated.innerHTML = '<span style="width: 8px; height: 8px; background: var(--success); border-radius: 50%; display: inline-block; animation: pulse 2s infinite;"></span> System Live • Last updated just now';
                header.appendChild(updated);
            }

            const viewAllBtn = document.querySelector('.card button');
            if (viewAllBtn && viewAllBtn.textContent.includes('View All')) {
                viewAllBtn.onclick = () => document.querySelector('a[href="admin-shipments.html"]')?.click();
            }
        },

        'users.html': function () {
            renderUserTable();
            const addBtn = document.querySelector('.page-header button');
            if (addBtn) {
                addBtn.onclick = () => {
                    createModal('Add New User', `
                        <div style="display:flex; flex-direction:column; gap:1rem;">
                            <div><label style="display:block; margin-bottom:0.4rem; font-size:0.9rem;">Full Name</label><input type="text" id="new_name" placeholder="Enter name" style="width:100%; padding:0.6rem; border:1px solid var(--border-default); border-radius:4px; background:var(--surface-primary); color:var(--text-primary);"></div>
                            <div><label style="display:block; margin-bottom:0.4rem; font-size:0.9rem;">Email</label><input type="email" id="new_email" placeholder="email@movex.com" style="width:100%; padding:0.6rem; border:1px solid var(--border-default); border-radius:4px; background:var(--surface-primary); color:var(--text-primary);"></div>
                            <div><label style="display:block; margin-bottom:0.4rem; font-size:0.9rem;">Role</label>
                                <select id="new_role" style="width:100%; padding:0.6rem; border:1px solid var(--border-default); border-radius:4px; background:var(--surface-primary); color:var(--text-primary);">
                                    <option value="user">User</option>
                                    <option value="staff">Staff</option>
                                    <option value="franchisee">Franchisee</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                    `, [
                        { label: 'Cancel', onClick: (close) => close() },
                        {
                            label: 'Create User', primary: true, onClick: (close) => {
                                const name = document.getElementById('new_name').value;
                                if (!name) return showToast('Name is required', 'error');
                                showToast(`User ${name} created successfully!`, 'success');
                                close();
                            }
                        }
                    ]);
                };
            }
            const searchInput = document.querySelector('input[placeholder*="Search"]');
            if (searchInput) {
                searchInput.oninput = (e) => {
                    const val = e.target.value.toLowerCase();
                    const items = MOCK_DATA.users.filter(u => u.name.toLowerCase().includes(val) || u.email.toLowerCase().includes(val));
                    renderUserTable(items);
                };
            }
        },

        'franchises.html': function () {
            renderFranchiseTable();
            const addBtn = document.querySelector('.page-header button');
            if (addBtn) addBtn.onclick = () => showToast('Franchise onboarding module opened', 'info');
        },

        'shipments.html': function () {
            renderShipmentTable();
            const searchBtn = document.querySelector('.card button');
            if (searchBtn) searchBtn.onclick = () => showToast('Searching shipments...', 'info');
        },

        'staff.html': function () {
            renderStaffTable();
        },

        'bookings.html': function () {
            renderBookingTable();
        },

        'finance.html': function () {
            const kpis = document.querySelectorAll('.card-value');
            if (kpis.length >= 3) {
                kpis[0].textContent = '₹' + (MOCK_DATA.stats.totalRevenue * 2.8 / 1000000).toFixed(1) + 'M';
                kpis[1].textContent = '₹45,200';
                kpis[2].textContent = '₹128k';
            }
            const tbody = document.querySelector('.data-table tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td style="font-family: monospace;">TX-9901</td><td>Oct 24, 10:30 AM</td><td>Shipment Payment</td><td>Customer: Alice</td><td style="color: var(--success);">+₹45.00</td><td><span class="status-badge status-active">Paid</span></td></tr>
                    <tr><td style="font-family: monospace;">TX-9902</td><td>Oct 24, 09:15 AM</td><td>Franchise Payout</td><td>Mumbai Hub</td><td style="color: var(--text-primary);">-₹1,250.00</td><td><span class="status-badge status-warn">Processing</span></td></tr>
                `;
            }
            const exportBtn = document.querySelector('.page-header button');
            if (exportBtn) exportBtn.onclick = () => showToast('Financial report exported', 'success');
        },

        'reports.html': function () {
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
                    <tr><td>Oct 22, 2025</td><td>1,050</td><td>1,020</td><td style="color: var(--warning);">0</td><td>₹19,800</td></tr>
                `;
            }
        },

        'settings.html': function () {
            const saveBtn = document.querySelector('button[style*="background: var(--brand-primary)"]');
            if (saveBtn) saveBtn.onclick = () => showToast('Settings saved successfully', 'success');

            const toggles = document.querySelectorAll('input[type="checkbox"]');
            toggles.forEach(t => {
                t.onchange = () => showToast(`${t.parentElement.textContent.trim()} ${t.checked ? 'enabled' : 'disabled'}`, 'success');
            });
        },

        'audit-logs.html': function () {
            renderAuditLogs();
            const filterBtn = document.querySelector('.card button');
            if (filterBtn) filterBtn.onclick = () => showToast('Logs filtered', 'info');
        }
    };

    function renderUserTable(data = MOCK_DATA.users) {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = data.map(u => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 40px; height: 40px; background: var(--brand-primary-soft); color: var(--brand-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                            ${u.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <div style="font-weight: 600;">${u.name}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">${u.email}</div>
                        </div>
                    </div>
                </td>
                <td><span class="status-badge" style="background: ${getRoleBg(u.role)}; color: white; opacity: 0.9;">${u.role}</span></td>
                <td>${u.org}</td>
                <td><span class="status-badge status-${u.status}">${u.status}</span></td>
                <td>${u.joined}</td>
                <td>
                    <button class="action-btn" data-id="${u.id}" style="border:none; background:none; cursor:pointer; color:var(--text-secondary);"><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg></button>
                </td>
            </tr>
        `).join('');
        tbody.querySelectorAll('.action-btn').forEach(btn => {
            btn.onclick = () => showUserActions(MOCK_DATA.users.find(u => u.id == btn.getAttribute('data-id')));
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
        createModal(`User: ${user.name}`, `<p>Manage access for <strong>${user.email}</strong>.</p>`, [
            { label: 'Close', onClick: close => close() },
            {
                label: user.status === 'active' ? 'Disable' : 'Enable', primary: true, onClick: close => {
                    user.status = user.status === 'active' ? 'disabled' : 'active';
                    showToast(`User ${user.status}`, 'success');
                    renderUserTable();
                    close();
                }
            }
        ]);
    }

    function showShipmentDetails(s) {
        createModal(`Shipment ${s.id}`, `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                <div><label style="color:var(--text-secondary); font-size:0.8rem;">Status</label><div><strong>${s.status}</strong></div></div>
                <div><label style="color:var(--text-secondary); font-size:0.8rem;">Amount</label><div><strong>₹${s.amount}</strong></div></div>
                <div><label style="color:var(--text-secondary); font-size:0.8rem;">Origin</label><div>${s.origin}</div></div>
                <div><label style="color:var(--text-secondary); font-size:0.8rem;">Destination</label><div>${s.destination}</div></div>
                <div><label style="color:var(--text-secondary); font-size:0.8rem;">Customer</label><div>${s.customer}</div></div>
                <div><label style="color:var(--text-secondary); font-size:0.8rem;">Date</label><div>${s.date}</div></div>
            </div>
        `, [
            { label: 'Print Label', onClick: close => { showToast('Generating label...', 'info'); close(); } },
            { label: 'Update Status', primary: true, onClick: close => { showToast('Status updated', 'success'); close(); } }
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

    function renderShipmentTable() {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = MOCK_DATA.shipments.map(s => `
            <tr>
                <td style="font-family: monospace; font-weight: 600;">${s.id}</td>
                <td><span class="status-badge status-${s.status.toLowerCase().replace(' ', '-')}">${s.status}</span></td>
                <td><div>${s.customer}</div><div style="font-size: 0.75rem; color: var(--text-secondary);">${s.email}</div></td>
                <td>${s.origin}</td>
                <td>${s.destination}</td>
                <td>${s.date}</td>
                <td>₹${s.amount.toFixed(2)}</td>
                <td><button class="track-btn" style="background:none; border:none; color:var(--brand-primary); cursor:pointer; font-weight:600;">View</button></td>
            </tr>
        `).join('');
        tbody.querySelectorAll('.track-btn').forEach((btn, i) => btn.onclick = () => showShipmentDetails(MOCK_DATA.shipments[i]));
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
                <td>${s.customer}</td>
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

    function renderAuditLogs() {
        const logs = [
            { timestamp: 'Oct 24, 14:32:01', user: 'admin@movex.com', action: 'Updated System Settings', ip: '192.168.1.1', status: 'Success' },
            { timestamp: 'Oct 24, 14:05:22', user: 'john.doe@franchise.com', action: 'Login Attempt', ip: '10.0.0.52', status: 'Failed' },
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
        },
        toast: showToast,
        modal: createModal
    };

})();
