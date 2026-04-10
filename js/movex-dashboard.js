/**
 * MOVEX MASTER SCRIPT - V5
 * Final Consolidation - Strict Schema - Search Logic
 */

(function () {
    'use strict';

    let allShipments = [];

    async function init() {
        const path = window.location.pathname;
        const role = path.includes('admin') ? 'admin' : path.includes('franchisee') ? 'franchisee' : path.includes('staff') ? 'staff' : 'user';

        try {
            const raw = sessionStorage.getItem('movexsecuresession');
            if (!raw) return;
            const session = JSON.parse(raw);

            // 1. Identity Headers
            const tName = document.getElementById('topBarUserName');
            const tRole = document.getElementById('topBarRole');
            if (tName) tName.textContent = session.full_name || session.username;
            if (tRole) tRole.textContent = role.charAt(0).toUpperCase() + role.slice(1);

            // 2. Fetch Base Data (Stats and Shipments)
            const [statsRes, shipRes] = await Promise.all([
                window.MoveX.getStats().catch(() => ({success:false})),
                window.MoveX.getShipments().catch(() => ({success:false}))
            ]);

            if (shipRes.success) allShipments = shipRes.shipments;
            if (statsRes.success) renderStats(statsRes.stats, role);

            // 3. Role-Aware Orchestration
            if (role === 'admin') {
                await setupAdminController(path);
            } else if (role === 'franchisee') {
                await setupFranchiseeController(path, statsRes.stats);
            } else if (role === 'staff') {
                await setupStaffController(path, statsRes.stats);
            } else if (role === 'user') {
                await setupUserController(path, statsRes.stats);
            }

            // Global UI Listeners (Modals, Settings)
            if (document.getElementById('profile_full_name')) await setupSettings();
            setupListeners();
            injectLogout();

        } catch (err) { console.error('[MoveX] Init Error:', err); }
    }

    async function setupAdminController(path) {
        if (allShipments.length > 0) renderTable(allShipments);
        if (path.includes('admin-users')) setupAdmin('users');
        if (path.includes('admin-franchises')) setupAdmin('franchises');
        if (path.includes('admin-finance') || document.getElementById('fin-total-revenue')) setupFinance();
        if (path.includes('admin-reports')) setupReports();
    }

    async function setupFranchiseeController(path, stats) {
        // Hydrate specific tables by ID
        if (document.getElementById('shipmentsTableBody')) {
            const list = allShipments.filter(s => s.status !== 'booked');
            renderTable(list, 'default', 'shipmentsTableBody');
        }
        if (document.getElementById('pickupRequestsTableBody')) {
            const pickups = allShipments.filter(s => s.status === 'booked');
            renderTable(pickups, 'pickup', 'pickupRequestsTableBody');
        }
        if (document.getElementById('assignmentsTableBody')) {
            const pendingStaff = allShipments.filter(s => s.status === 'pending' || s.status === 'in_transit');
            renderTable(pendingStaff, 'assignment', 'assignmentsTableBody');
        }
        if (document.getElementById('transactionsTableBody')) {
            renderTable(allShipments, 'revenue', 'transactionsTableBody');
        }
        if (document.getElementById('recentShipmentsBody')) {
            const delivered = allShipments.filter(s => s.status && s.status.toLowerCase() === 'delivered');
            renderTable(delivered, 'default', 'recentShipmentsBody');
        }
        if (document.getElementById('staffTableBody')) {
            const staffRes = await window.MoveX.getStaff().catch(() => ({ success: false }));
            if (staffRes.success) renderStaffTable(staffRes.staff);
        }
        
        // Populate KPIs from stats
        if (stats) {
            const m = {
                'kpi-total-shipments': stats.totalShipments,
                'kpi-pending-pickups': stats.pendingPickups,
                'kpi-new-bookings': stats.pendingPickups,
                'kpi-scheduled-today': stats.pendingPickups // Simplified for now
            };
            for (const [id, val] of Object.entries(m)) {
                const el = document.getElementById(id);
                if (el) el.textContent = val ?? '0';
            }
        }
    }

    async function setupStaffController(path, stats) {
        // Hydrate specific tables by ID for Staff
        if (document.getElementById('tasksTableBody')) {
            renderTable(allShipments, 'staff_assignment', 'tasksTableBody');
        }

        // Populate KPIs from shipments manually
        const elPending = document.getElementById('kpi-pending-hub');
        const elOut = document.getElementById('kpi-out-delivery');
        const elDelivered = document.getElementById('kpi-delivered-today');
        
        if (elPending || elOut || elDelivered) {
            const pendingStaff = allShipments.filter(s => s.status === 'in_transit' || s.status === 'pending').length;
            const processOut = allShipments.filter(s => s.status === 'out_for_delivery').length;
            const delToday = allShipments.filter(s => s.status.toLowerCase() === 'delivered').length;

            if (elPending) elPending.textContent = pendingStaff;
            if (elOut) elOut.textContent = processOut;
            if (elDelivered) elDelivered.textContent = delToday;
        }
    }
    
    async function setupUserController(path, stats) {
        // 1. Hydrate specific tables by ID for User
        if (document.getElementById('fullShipmentsBody')) {
            renderTable(allShipments, 'customer', 'fullShipmentsBody');
        }

        // 2. Booking Form Handling
        const bookForm = document.getElementById('bookingForm');
        if (bookForm) {
            bookForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = e.submitter || bookForm.querySelector('button[type="submit"]');
                const originalText = btn ? btn.innerHTML : 'Confirm Booking';
                
                if (btn) {
                    btn.innerHTML = '<span class="loading-spinner"></span> PROCESSING...';
                    btn.disabled = true;
                }

                try {
                    const formData = new FormData(bookForm);
                    const payload = Object.fromEntries(formData.entries());
                    
                    // Simple price calculation logic (e.g., ₹50 per kg)
                    const weight = parseFloat(payload.weight) || 0;
                    payload.price = weight * 50;

                    const res = await window.MoveX.createShipment(payload);
                    if (res.success) {
                        alert(`Booking Confirmed!\nTracking ID: ${res.tracking_id}`);
                        window.location.href = 'user-dashboard.html';
                    } else {
                        alert(res.message || 'Booking failed.');
                    }
                } catch (err) {
                    console.error('Booking Error:', err);
                    alert('An error occurred during booking. Please try again.');
                } finally {
                    if (btn) {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                    }
                }
            });
        }

        // 3. Populate KPIs from stats
        const elTotal = document.getElementById('kpi-user-total');
        const elActive = document.getElementById('kpi-user-active');
        const elDelivered = document.getElementById('kpi-user-delivered');
        
        if (stats) {
            if (elTotal) elTotal.textContent = stats.totalShipments || 0;
            if (elActive) elActive.textContent = stats.activeShipments || 0;
            if (elDelivered) elDelivered.textContent = stats.deliveredShipments || 0;
        } else if (allShipments && allShipments.length >= 0) {
            if (elTotal) elTotal.textContent = allShipments.length;
            if (elActive) elActive.textContent = allShipments.filter(s => s.status !== 'delivered' && s.status !== 'cancelled').length;
            if (elDelivered) elDelivered.textContent = allShipments.filter(s => s.status && s.status.toLowerCase() === 'delivered').length;
        }
    }

    function renderStats(stats, role) {
        const m = {
            'kpi-total-shipments': stats.totalShipments,
            'kpi-total-revenue': stats.totalRevenue ? `₹${stats.totalRevenue.toLocaleString()}` : '0',
            'kpi-total-users': stats.totalUsers,
            'kpi-total-franchises': stats.totalFranchises,
            'kpi-pending-pickups': stats.pendingPickups || 0,
            'kpi-monthly-revenue': stats.monthlyRevenue ? `₹${stats.monthlyRevenue.toLocaleString()}` : '₹0',
            'kpi-delivered-count': stats.deliveredCount || 0
        };
        for (const [id, val] of Object.entries(m)) {
            const el = document.getElementById(id);
            if (el) el.textContent = val ?? '0';
        }
    }

    function renderTable(data, mode = 'default', targetId = null) {
        const tbody = targetId ? document.getElementById(targetId) : (
                      document.getElementById('shipmentsTableBody') || 
                      document.getElementById('recentShipmentsBody') || 
                      document.getElementById('fullShipmentsBody') ||
                      document.getElementById('pickupRequestsTableBody') ||
                      document.getElementById('assignmentsTableBody') ||
                      document.getElementById('transactionsTableBody'));

        if (!tbody) return;
        tbody.innerHTML = (data || []).length === 0 ? `<tr><td colspan="10" style="text-align:center;padding:3rem;color:var(--text-tertiary);">No shipments found in this category.</td></tr>` : '';
        
        (data || []).forEach(s => {
            const tr = document.createElement('tr');
            const d = new Date(s.created_at).toLocaleDateString();
            
            let status = (s.status || 'Pending').replace(/_/g, ' ').toLowerCase();
            if (status === 'failed') status = 'cancelled';
            if (status === 'rto') status = 'return';
            
            const sC = status.includes('transit')?'status-transit':status.includes('delivery')?'status-out':status.includes('deliv')?'status-active':status.includes('return')?'status-return':status.includes('cancel')?'status-error':'status-warn';
            const displayStatus = status.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            if (mode === 'pickup') {
                tr.innerHTML = `<td><strong>${s.tracking_id}</strong></td><td>${s.sender_name}<br><span style="font-size:10px;color:var(--text-secondary);">To: ${s.receiver_name}</span></td><td style="font-size:11px;">${s.sender_address}</td><td style="font-size:11px;">${s.receiver_address}</td><td>${s.weight}kg</td><td><span class="status-badge ${sC}">${displayStatus}</span></td><td style="text-align:right;"><button class="btn-secondary manage-shipment-btn">Review Request</button></td>`;
            } else if (mode === 'assignment') {
                const staffDisplay = s.staff_name ? `<span class="status-badge status-active">${s.staff_name.toUpperCase()}</span>` : `<span class="status-badge status-warn">NOT ASSIGNED</span>`;
                tr.innerHTML = `<td><strong>${s.tracking_id}</strong></td><td>${s.receiver_name}</td><td style="font-size:12px;color:var(--text-secondary);">${s.receiver_address}</td><td>${staffDisplay}</td><td><button class="btn-secondary manage-shipment-btn">${s.staff_name ? 'Reassign' : 'Assign Staff'}</button></td>`;
            } else if (mode === 'staff_assignment') {
                tr.innerHTML = `<td><span style="color:var(--text-secondary);font-size:12px;">#${s.tracking_id.slice(-6)}</span></td><td><strong>${s.tracking_id}</strong></td><td><span class="status-badge ${sC}">${displayStatus}</span></td><td>${s.sender_name}</td><td>${s.receiver_name}</td><td>${s.receiver_phone || '-'}</td><td><button class="btn-secondary manage-shipment-btn">Update Task</button></td>`;
            } else if (mode === 'revenue') {
                tr.innerHTML = `<td><strong>${s.tracking_id}</strong></td><td>${d}</td><td>${s.receiver_name}</td><td><span class="status-badge ${sC}">${displayStatus}</span></td><td><strong>₹${s.price}</strong></td>`;
            } else if (mode === 'customer') {
                tr.innerHTML = `<td><strong>${s.tracking_id}</strong></td><td><span class="status-badge ${sC}">${displayStatus}</span></td><td>${s.sender_name}</td><td>${s.receiver_name}</td><td>${s.receiver_pincode || '-'}</td><td>${d}</td><td>₹${s.price}</td><td style="text-align:right;"><button class="btn-secondary manage-shipment-btn">Details</button></td>`;
            } else {
                tr.innerHTML = `<td><strong>${s.tracking_id}</strong></td><td><span class="status-badge ${sC}">${displayStatus}</span></td><td>${s.sender_name}</td><td>${s.sender_pincode || '-'}</td><td>${s.receiver_pincode || '-'}</td><td>${d}</td><td>₹${s.price}</td><td><button class="btn-secondary manage-shipment-btn">Manage</button></td>`;
            }
            const btn = tr.querySelector('.manage-shipment-btn');
            if (btn) btn.onclick = () => openManageModal(s, mode);
            
            tbody.appendChild(tr);
        });
    }

    function renderStaffTable(staff) {
        const tb = document.getElementById('staffTableBody');
        if (!tb) return;
        tb.innerHTML = (staff || []).length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:3rem;">No staff found in this hub.</td></tr>' : '';
        (staff || []).forEach(st => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${st.full_name}</strong></td><td>${st.phone || '-'}</td><td><span class="status-badge status-active">${st.status.toUpperCase()}</span></td><td style="text-align:right;"><button class="btn-secondary info-staff-btn">Details</button></td>`;
            tr.querySelector('.info-staff-btn').onclick = () => openStaffDetailModal(st);
            tb.appendChild(tr);
        });
    }

    function openStaffDetailModal(st) {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:9999;";
        
        modal.innerHTML = `
            <div class="modal-card" style="width:400px; padding:0; overflow:hidden;">
                <!-- Header with Icon -->
                <div style="background:var(--brand-primary); padding:30px; text-align:center; color:#ffffff;">
                    <div style="width:80px; height:80px; background:rgba(255,255,255,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 15px;">
                        <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 style="font-size:1.5rem; font-weight:800; margin-bottom:5px;">${st.full_name}</h2>
                    <span style="font-size:0.875rem; opacity:0.8; text-transform:uppercase; letter-spacing:0.05em; font-weight:600;">Hub Staff Account</span>
                </div>

                <!-- Info Grid -->
                <div style="padding:25px; display:grid; gap:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:15px; border-bottom:1px solid #f1f5f9;">
                        <span style="color:var(--text-secondary); font-size:0.85rem; font-weight:600;">Authentication Handle</span>
                        <span style="font-weight:700; color:var(--text-primary); background:#f1f5f9; padding:4px 10px; border-radius:6px; font-size:0.9rem;">@${st.username}</span>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:15px; border-bottom:1px solid #f1f5f9;">
                        <span style="color:var(--text-secondary); font-size:0.85rem; font-weight:600;">Verified Phone</span>
                        <span style="font-weight:700; color:var(--text-primary); font-size:0.9rem;">${st.phone || 'No Phone Link'}</span>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:15px; border-bottom:1px solid #f1f5f9;">
                        <span style="color:var(--text-secondary); font-size:0.85rem; font-weight:600;">Hub Context</span>
                        <span style="font-weight:700; color:var(--brand-primary); font-size:0.9rem;">Regional Cluster #${st.organization_id}</span>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:var(--text-secondary); font-size:0.85rem; font-weight:600;">Service Status</span>
                        <span class="status-badge status-active" style="margin:0;">${st.status.toUpperCase()}</span>
                    </div>
                </div>

                <div style="padding:20px; background:#f8fafc; border-top:1px solid #f1f5f9;">
                    <button type="button" class="btn-primary" onclick="this.closest('.modal-backdrop').remove()" style="width:100%; padding:15px; font-size:1rem; font-weight:700;">✅ ACKNOWLEDGE IDENTITY</button>
                </div>
            </div>`;

        document.body.appendChild(modal);
    }

    async function openManageModal(s, mode = 'default') {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:9999;";
        
        let staffDropdown = '';
        if (mode === 'assignment') {
            const staffRes = await window.MoveX.getStaff();
            if (staffRes.success && staffRes.staff.length > 0) {
                staffDropdown = `
                    <div class="modal-section-title">👤 Assign Operational Staff</div>
                    <select name="staff_id" class="modal-input" style="cursor:pointer; margin-bottom: 2rem;">
                        <option value="">-- Choose Field Executive --</option>
                        ${staffRes.staff.map(st => `<option value="${st.user_id}">${st.full_name} (${st.username})</option>`).join('')}
                    </select>
                `;
            } else {
                staffDropdown = `<p style="color:#dc2626; font-size:0.8rem; margin-bottom:1rem;">⚠️ No staff registered in this hub.</p>`;
            }
        }

        let status = (s.status || 'Pending').replace(/_/g, ' ').toLowerCase();
        const sC = status.includes('transit')?'status-transit':status.includes('delivery')?'status-out':status.includes('deliv')?'status-active':status.includes('return')?'status-return':status.includes('cancel')?'status-error':'status-warn';
        const displayStatus = status.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        modal.innerHTML = `
            <div class="modal-card" style="width:600px;">
                <h2 class="modal-header-title">${mode==='assignment'?'Task Assignment':'Shipment Control'}: ${s.tracking_id}</h2>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
                    <div style="background: #fff; padding: 15px; border-radius: 10px; border: 1px solid #f1f5f9; box-shadow: var(--shadow-sm);">
                        <div class="modal-section-title" style="margin-top:0; color:var(--brand-primary); font-size:10px; padding-bottom:5px; border-bottom:2px solid var(--brand-primary-soft);">📤 Origin (Sender)</div>
                        <p style="margin:10px 0 5px;"><strong>${s.sender_name}</strong></p>
                        <p style="margin-bottom:5px; font-size:13px;"><svg style="width:14px;height:14px;vertical-align:middle;margin-right:5px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>${s.sender_phone || 'N/A'}</p>
                        <p style="margin-bottom:8px; font-size:12px; color:var(--text-secondary); line-height:1.4;"><strong>Address:</strong><br>${s.sender_address}, ${s.sender_city || ''}</p>
                        <p style="font-size:12px;"><strong>PIN:</strong> <span style="background:var(--brand-primary-soft); color:var(--brand-primary); padding:2px 6px; border-radius:4px; font-weight:700;">${s.sender_pincode}</span></p>
                    </div>
                    <div style="background: #fff; padding: 15px; border-radius: 10px; border: 1px solid #f1f5f9; box-shadow: var(--shadow-sm);">
                        <div class="modal-section-title" style="margin-top:0; color:var(--accent-purple); font-size:10px; padding-bottom:5px; border-bottom:2px solid #f5f3ff;">📥 Destination (Receiver)</div>
                        <p style="margin:10px 0 5px;"><strong>${s.receiver_name}</strong></p>
                        <p style="margin-bottom:5px; font-size:13px;"><svg style="width:14px;height:14px;vertical-align:middle;margin-right:5px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>${s.receiver_phone || 'N/A'}</p>
                        <p style="margin-bottom:8px; font-size:12px; color:var(--text-secondary); line-height:1.4;"><strong>Address:</strong><br>${s.receiver_address}, ${s.receiver_city || ''}</p>
                        <p style="font-size:12px;"><strong>PIN:</strong> <span style="background:#f5f3ff; color:var(--accent-purple); padding:2px 6px; border-radius:4px; font-weight:700;">${s.receiver_pincode}</span></p>
                    </div>
                </div>
                
                <div class="modal-section-title">📦 Shipment Inventory Details</div>
                <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:15px;background:#f8fafc;padding:15px;border-radius:12px;margin-bottom:20px; border:1px solid #e2e8f0;">
                    <div><span style="color:var(--text-secondary);font-size:10px;text-transform:uppercase;font-weight:700;">Weight</span><br><strong style="font-size:1.1rem;">${s.weight}</strong><small>kg</small></div>
                    <div><span style="color:var(--text-secondary);font-size:10px;text-transform:uppercase;font-weight:700;">Total Bill</span><br><strong style="font-size:1.1rem;color:var(--success);">₹${s.price}</strong></div>
                    <div style="grid-column: span 2;"><span style="color:var(--text-secondary);font-size:10px;text-transform:uppercase;font-weight:700;">Item Description</span><br><strong style="font-size:0.9rem;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.contents || 'No description'}">${s.contents || 'General Parcel'}</strong></div>
                </div>

                ${mode === 'customer' ? `
                    <div style="background:#f1f5f9; padding:20px; border-radius:12px; margin-top:10px;">
                        <span style="font-size:12px; color:var(--text-secondary); text-transform:uppercase; font-weight:700;">Live Journey Status</span>
                        <div style="display:flex; align-items:center; gap:12px; margin-top:8px;">
                            <div class="status-badge ${sC}" style="margin:0; font-size:1rem; padding:8px 16px;">${displayStatus}</div>
                        </div>
                        <p style="margin-top:15px; font-size:13px; color:var(--text-secondary); line-height:1.5;">This shipment is currently being handled by our logistics network. Please contact support if you have any questions regarding your delivery.</p>
                        <button type="button" class="btn-primary" onclick="this.closest('.modal-backdrop').remove()" style="width:100%; margin-top:20px; padding:15px;">Close View</button>
                    </div>
                ` : mode === 'pickup' ? `
                    <div style="margin-top:20px; padding:20px; border:1px solid var(--border-subtle); border-radius:12px; background:#fff;">
                        <div class="modal-section-title">🛡️ Hub Decision Required</div>
                        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:20px;">Review the order details above. Accepting this request will move it to your active shipments pipeline.</p>
                        <div style="display:flex; gap:12px;">
                            <button id="acceptPickupBtn" class="btn-primary" style="flex:2; background:#10b981; border-color:#10b981;">✅ ACCEPT PICKUP</button>
                            <button id="rejectPickupBtn" class="btn-secondary" style="flex:1; color:#ef4444; border-color:#fee2e2; background:#fef2f2;">❌ REJECT</button>
                        </div>
                    </div>
                ` : `
                    <form id="manageForm">
                        ${staffDropdown}
                        <div class="modal-section-title">🛠️ Operational Status</div>
                        <select name="status" class="modal-input" style="cursor:pointer; margin-bottom: 2rem;">
                            <option value="pending" ${s.status==='pending'?'selected':''}>Pending</option>
                            <option value="in_transit" ${s.status==='in_transit'?'selected':''}>In Transit</option>
                            <option value="out_for_delivery" ${s.status==='out_for_delivery'?'selected':''}>Out for Delivery</option>
                            <option value="delivered" ${s.status==='delivered'?'selected':''}>Delivered</option>
                            <option value="return" ${s.status==='return'?'selected':''}>Return</option>
                            <option value="cancelled" ${s.status==='cancelled'?'selected':''}>Cancelled</option>
                        </select>
                        <div class="modal-footer">
                            <button type="submit" class="btn-primary" style="flex:2; padding:1rem;">✅ COMMIT CHANGES</button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal-backdrop').remove()" style="flex:1; padding:1rem;">Dismiss</button>
                        </div>
                    </form>
                `}
            </div>`;

        document.body.appendChild(modal);

        if (mode === 'pickup') {
            document.getElementById('acceptPickupBtn').onclick = async () => {
                const res = await window.MoveX.updateStatus(s.tracking_id, 'pending');
                if (res.success) { alert('Request accepted. Moved to Shipments.'); location.reload(); }
            };
            document.getElementById('rejectPickupBtn').onclick = async () => {
                if (confirm('Are you sure you want to reject and delete this pickup request?')) {
                    const res = await window.MoveX.deleteShipment(s.tracking_id);
                    if (res.success) { alert('Request rejected and deleted.'); location.reload(); }
                }
            };
        }
        
        const mForm = document.getElementById('manageForm');
        if (mForm) {
            mForm.onsubmit = async (e) => {
            e.preventDefault();
            const status = e.target.status.value;
            const staffId = e.target.staff_id?.value;

            const res = await window.MoveX.updateStatus(s.tracking_id, status);
            if (res.success) { 
                if (staffId) {
                    await window.MoveX.assignShipment(s.tracking_id, staffId);
                }
                alert('Logistics pipeline updated!'); 
                location.reload(); 
            }
            else alert('Failed to update pipeline.');
        };
    }
}

    function filterShipments() {
        const sId = document.getElementById('shipmentSearchInput')?.value.toLowerCase().trim();
        const sStat = document.getElementById('shipmentStatusFilter')?.value.toLowerCase();
        const sDate = document.getElementById('shipmentDateFilter')?.value;

        const filtered = allShipments.filter(s => {
            const matchId = !sId || s.tracking_id.toLowerCase().includes(sId);
            const matchStat = !sStat || sStat === 'all' || s.status.toLowerCase() === sStat;
            const matchDate = !sDate || new Date(s.created_at).toISOString().split('T')[0] === sDate;
            return matchId && matchStat && matchDate;
        });

        renderTable(filtered);
    }

    function setupListeners() {
        const bSearch = document.getElementById('shipmentSearchBtn');
        if (bSearch) bSearch.onclick = filterShipments;

        const bShip = document.getElementById('createNewShipment') || document.getElementById('action-create-shipment');
        if (bShip) bShip.onclick = () => openModal('shipment');

        const bUser = document.getElementById('openAddUserModal') || document.getElementById('action-add-user');
        if (bUser) bUser.onclick = () => openModal('user');
        
        const btnCheck = document.getElementById('action-check-service');
        if (btnCheck) btnCheck.onclick = () => openServiceCheckModal();

        const btnFran = document.getElementById('openAddFranchiseModal');
        if (btnFran) btnFran.onclick = () => openModal('franchise');

        const btnStaff = document.getElementById('addStaffBtn');
        if (btnStaff) btnStaff.onclick = () => openModal('staff');
    }

    function openModal(type) {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:9999;";
        
        if (type === 'shipment') {
            modal.innerHTML = `
                <div class="modal-card">
                    <h2 class="modal-header-title">Create New Shipment</h2>
                    <form id="mForm" class="modal-form-grid">
                        <div class="modal-section-title">📦 Sender Details</div>
                        <input type="text" name="sender_name" class="modal-input" placeholder="Sender Full Name" required>
                        <input type="text" name="sender_phone" class="modal-input" placeholder="Sender Mobile (10)" required maxlength="10">
                        <textarea name="sender_address" class="modal-input modal-textarea" placeholder="Complete Pickup Address" required></textarea>
                        <input type="text" name="sender_pincode" class="modal-input" placeholder="Sender Pincode (6)" required maxlength="6" style="grid-column: span 2;">
                        
                        <div class="modal-section-title">📍 Receiver Details</div>
                        <input type="text" name="receiver_name" class="modal-input" placeholder="Receiver Full Name" required>
                        <input type="text" name="receiver_phone" class="modal-input" placeholder="Receiver Mobile (10)" required maxlength="10">
                        <textarea name="receiver_address" class="modal-input modal-textarea" placeholder="Complete Delivery Address" required></textarea>
                        <input type="text" name="receiver_pincode" class="modal-input" placeholder="Receiver Pincode (6)" required maxlength="6" style="grid-column: span 2;">
                        
                        <div class="modal-section-title">💰 Billing Information</div>
                        <input type="number" name="price" class="modal-input" placeholder="Booking Amount (₹)" required>
                        <input type="number" name="weight" class="modal-input" placeholder="Total Weight (kg)" required>
                        
                        <div class="modal-footer" style="grid-column: span 2;">
                            <button type="submit" class="btn-primary" style="flex:2; padding:1rem;">🚀 CONFIRM BOOKING</button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal-backdrop').remove()" style="flex:1;">Cancel</button>
                        </div>
                    </form>
                </div>`;
        } else if (type === 'franchise') {
            modal.innerHTML = `
                <div class="modal-card" style="width:600px; max-height: 90vh; overflow-y: auto;">
                    <h2 class="modal-header-title">Register New Franchise Hub</h2>
                    <form id="mForm" class="modal-form-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        
                        <div class="modal-section-title" style="grid-column: span 2;">🏢 Hub Details</div>
                        <div style="grid-column: span 2;">
                            <label style="font-size:11px; color:var(--text-secondary); text-transform:uppercase;">Franchise Official Name</label>
                            <input type="text" name="name" class="modal-input" placeholder="e.g. MoveX Bangalore Central" required>
                        </div>
                        <div style="grid-column: span 2;">
                            <label style="font-size:11px; color:var(--text-secondary); text-transform:uppercase;">Serviceable Pincodes (Comma separated)</label>
                            <input type="text" name="pincodes" class="modal-input" placeholder="e.g. 560001, 560002" required>
                        </div>
                        <div style="grid-column: span 2;">
                            <label style="font-size:11px; color:var(--text-secondary); text-transform:uppercase;">Full Regional Address</label>
                            <textarea name="full_address" class="modal-input modal-textarea" placeholder="Complete Hub Address" required style="height: 60px;"></textarea>
                        </div>

                        <div class="modal-section-title" style="grid-column: span 2;">🔐 Management Account</div>
                        <div>
                            <label style="font-size:11px; color:var(--text-secondary); text-transform:uppercase;">Username</label>
                            <input type="text" name="username" class="modal-input" placeholder="franchise_manager" required>
                        </div>
                        <div>
                            <label style="font-size:11px; color:var(--text-secondary); text-transform:uppercase;">Password</label>
                            <input type="password" name="password" class="modal-input" placeholder="••••••••" required>
                        </div>
                        <div style="grid-column: span 2;">
                            <label style="font-size:11px; color:var(--text-secondary); text-transform:uppercase;">Contact Phone Number</label>
                            <input type="text" name="phone" class="modal-input" placeholder="10 Digit Mobile" required maxlength="10">
                        </div>

                        <div class="modal-role-badge" style="grid-column: span 2;">📍 ARCHITECTING REGIONAL LOGISTICS HUB ASSET</div>
                        
                        <div class="modal-footer" style="grid-column: span 2; margin-top: 15px;">
                            <button type="submit" class="btn-primary" style="flex:2; padding:12px;">🚀 DEPLOY FRANCHISE HUB</button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal-backdrop').remove()" style="flex:1;">Cancel</button>
                        </div>
                    </form>
                </div>`;
        } else if (type === 'staff') {
            modal.innerHTML = `
                <div class="modal-card" style="width:400px;">
                    <h2 class="modal-header-title">Provision New Hub Staff</h2>
                    <form id="mForm" style="display: flex; flex-direction: column; gap: 15px;">
                        <input type="text" name="username" class="modal-input" placeholder="Staff Username" required>
                        <input type="password" name="password" class="modal-input" placeholder="Temporary Password" required>
                        <input type="text" name="full_name" class="modal-input" placeholder="Staff Full Name" required>
                        <input type="text" name="phone" class="modal-input" placeholder="Staff Mobile" required maxlength="10">
                        <input type="hidden" name="role" value="staff">
                        <div class="modal-role-badge">👷 LOCAL HUB OPERATIONAL STAFF</div>
                        <div class="modal-footer" style="margin-top: 15px;">
                            <button type="submit" class="btn-primary" style="flex:2;">CREATE STAFF</button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal-backdrop').remove()" style="flex:1;">Cancel</button>
                        </div>
                    </form>
                </div>`;
        } else {
            modal.innerHTML = `
                <div class="modal-card" style="width:480px;">
                    <h2 class="modal-header-title">Register Administrator</h2>
                    <form id="mForm" style="display: flex; flex-direction: column; gap: 15px;">
                        <input type="text" name="username" class="modal-input" placeholder="Desired Username" required>
                        <input type="password" name="password" class="modal-input" placeholder="Secure Password" required>
                        <input type="text" name="full_name" class="modal-input" placeholder="Full Employee Name" required>
                        <input type="text" name="phone" class="modal-input" placeholder="Mobile Number (10 Digits)" required maxlength="10">
                        <input type="hidden" name="role" value="admin">
                        <div class="modal-role-badge">🛡️ SECURED SYSTEM ADMINISTRATOR ROLE</div>
                        <div class="modal-footer" style="margin-top: 15px;">
                            <button type="submit" class="btn-primary" style="flex:2;">SAVE ACCOUNT</button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal-backdrop').remove()" style="flex:1;">Cancel</button>
                        </div>
                    </form>
                </div>`;
        }
        document.body.appendChild(modal);
        const f = document.getElementById('mForm');
        f.onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(f).entries());
            let res;
            if (type === 'shipment') res = await window.MoveX.createShipment(data);
            else if (type === 'franchise') res = await window.MoveX.adminCreateFranchise(data);
            else if (type === 'staff') res = await window.MoveX.staffCreate(data);
            else res = await window.MoveX.adminCreateUser(data);

            if (res.success) { 
                alert(type==='shipment'?'Shipment Created!':type==='franchise'?'Franchise Created!':'Staff Created!'); 
                location.reload(); 
            }
            else alert(res.message || 'Action failed.');
        };
    }

    function openFranchiseManageModal(f) {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:9999;";
        
        modal.innerHTML = `
            <div class="modal-card" style="width:500px;">
                <h2 class="modal-header-title">Regional Hub Report: ${f.name}</h2>
                <div style="margin-bottom:20px; background:#f8fafc; padding:20px; border-radius:12px; border: 1px solid var(--border-subtle); display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="grid-column: span 2;">
                        <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:700;">Hub Official Name</span>
                        <div style="font-size:16px; font-weight:700; color:var(--brand-primary);">${f.name}</div>
                    </div>
                    <div>
                        <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:700;">Registration ID</span>
                        <div style="font-size:14px; font-weight:600;">#FR-${f.organization_id}</div>
                    </div>
                    <div>
                        <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:700;">Service Status</span>
                        <div style="font-size:14px; color:var(--status-success-text); font-weight:700;">${f.status.toUpperCase()}</div>
                    </div>
                    <div style="grid-column: span 2;">
                        <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:700;">Assigned Pincode Block</span>
                        <div style="font-size:14px; font-weight:500; background:#eef2ff; color:#4338ca; padding:8px; border-radius:6px;">${f.pincodes || 'National Access'}</div>
                    </div>
                    <div style="grid-column: span 2;">
                        <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:700;">Regional Hub Address</span>
                        <div style="font-size:13px; line-height:1.6; color:#334155;">${f.full_address || 'Detailed address not registered'}</div>
                    </div>
                    <div>
                        <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:700;">Enterprise Type</span>
                        <div style="font-size:14px; font-weight:500; text-transform:capitalize;">${f.type || 'Franchise'}</div>
                    </div>
                    <div>
                        <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:700;">Establishment Date</span>
                        <div style="font-size:14px; font-weight:500;">${new Date(f.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style="grid-column: span 2;">
                        <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:700;">Regional Helpline</span>
                        <div style="font-size:15px; font-weight:700; color:var(--brand-primary);">${f.phone || 'NA'}</div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn-primary" onclick="this.closest('.modal-backdrop').remove()" style="flex:1;">✅ DOCUMENT AUDITED</button>
                </div>
            </div>`;

        document.body.appendChild(modal);
    }

    function openServiceCheckModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:9999;";
        
        modal.innerHTML = `
            <div class="modal-card" style="width:400px; text-align:center; padding:30px;">
                <div style="background:var(--warning-soft); color:var(--warning); width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
                    <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                </div>
                <h2 style="margin-bottom:10px; font-size:1.5rem; font-weight:700;">Serviceability Audit</h2>
                <p style="color:var(--text-secondary); margin-bottom:25px; font-size:0.9rem;">Enter any 6-digit pincode to identify the governing regional franchise hub.</p>
                
                <input type="text" id="checkPincodeInput" class="modal-input" placeholder="000000" maxlength="6" style="text-align:center; font-size:2rem; letter-spacing:10px; margin-bottom:20px; font-weight:900; height:70px; border-radius:12px; border: 2px solid var(--border-default);">
                
                <div class="modal-footer" style="flex-direction:column; gap:10px;">
                    <button id="runCheckBtn" class="btn-primary" style="width:100%; padding:15px; font-weight:700; background:var(--warning); border-color:var(--warning);">🔍 RUN COVERAGE SEARCH</button>
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal-backdrop').remove()" style="width:100%;">Cancel Audit</button>
                </div>
            </div>`;

        document.body.appendChild(modal);
        
        const input = document.getElementById('checkPincodeInput');
        input.focus();
        const btn = document.getElementById('runCheckBtn');

        btn.onclick = async () => {
            const pin = input.value.trim();
            if (pin.length !== 6) return alert('Please enter a valid 6-digit pincode.');
            
            btn.innerHTML = '<span class="loading-spinner"></span> VERIFYING COVERAGE...';
            btn.disabled = true;

            try {
                const res = await window.MoveX.adminCheckServiceability(pin);
                modal.remove(); // Close search modal
                
                if (res.success) {
                    // Reuse the existing detail modal logic
                    openFranchiseManageModal(res.franchise);
                } else {
                    alert(res.message || 'No coverage found for this area.');
                }
            } catch (err) {
                btn.innerHTML = '🔍 RUN COVERAGE SEARCH';
                btn.disabled = false;
            }
        };
    }

    async function setupSettings() {
        // Fetch current profile
        const res = await window.MoveX.getUserProfile();
        if (res.success) {
            const u = res.user;
            const elProfileName = document.getElementById('profile_full_name');
            const elProfilePhone = document.getElementById('profile_phone');
            
            if (elProfileName) elProfileName.value = u.full_name || '';
            if (elProfilePhone) elProfilePhone.value = u.phone || '';

            // Handle Franchise Hub Settings if available
            if (document.getElementById('franchise-name-display')) {
                const franchiseRes = await window.MoveX.getStats(); // Uses stats for hub info
                if (franchiseRes.success) {
                    const fName = document.getElementById('franchise-name-display');
                    const fAddr = document.getElementById('franchise_address');
                    const fPin = document.getElementById('franchise_pincodes');
                    if (fName) fName.textContent = u.full_name; // Assuming hub name is user's name for now
                    // We need a specific endpoint for hub details if address is required
                }
            }
        }

        // Save Profile
        const btnSaveProfile = document.getElementById('btn-save-profile');
        if (btnSaveProfile) {
            btnSaveProfile.onclick = async () => {
                const full_name = document.getElementById('profile_full_name').value;
                const phone = document.getElementById('profile_phone').value;
                const updateRes = await window.MoveX.updateUserProfile({ full_name, phone });
                if (updateRes.success) {
                    alert('Profile updated successfully!');
                    location.reload();
                }
            };
        }

        // Change Password
        const btnSavePass = document.getElementById('btn-save-password');
        if (btnSavePass) {
            btnSavePass.onclick = async () => {
                const old_password = document.getElementById('old_password').value;
                const new_password = document.getElementById('new_password').value;
                const confirm_password = document.getElementById('confirm_password').value;

                if (new_password !== confirm_password) return alert('New passwords do not match');
                if (new_password.length < 8) return alert('New password must be at least 8 characters');

                const passRes = await window.MoveX.changePassword({ old_password, new_password });
                if (passRes.success) {
                    alert('Password changed successfully!');
                    location.reload();
                } else {
                    alert(passRes.message || 'Verification failed. Password not changed.');
                }
            };
        }
    }

    async function setupAdmin() {
        if (document.getElementById('usersTableBody')) {
            const res = await window.MoveX.getAdminUsers();
            if (res.success) {
                window._allUsers = res.users;
                renderUsersTable(res.users);
            }
            // Only search on button click per request
            document.getElementById('userSearchBtn')?.addEventListener('click', filterUsers);
        }
        if (document.getElementById('franchiseTableBody')) {
            const res = await window.MoveX.getAdminFranchises();
            if (res.success) {
                const tb = document.getElementById('franchiseTableBody');
                tb.innerHTML = '';
                res.franchises.forEach(f => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${f.organization_id}</td><td>${f.name}</td><td>${f.pincodes || 'National'}</td><td><span class="status-badge status-active">${f.status.toUpperCase()}</span></td><td><button class="btn-secondary manage-franchise-btn" style="height:auto;padding:4px 8px;font-size:11px;">Manage</button></td>`;
                    tr.querySelector('.manage-franchise-btn').onclick = () => openFranchiseManageModal(f);
                    tb.appendChild(tr);
                });
                
                // Update KPIs for Franchise Page
                const elTotal = document.getElementById('kpi-total-franchises');
                const elArea = document.getElementById('kpi-active-areas');
                if (elTotal) elTotal.textContent = res.franchises.length;
                if (elArea) elArea.textContent = res.franchises.reduce((acc, curr) => acc + (curr.pincodes ? curr.pincodes.split(',').length : 1), 0);
            }
        }
    }

    async function setupFinance() {
        const res = await window.MoveX.adminGetFinances();
        if (!res.success) return;

        // KPI Update
        const elTotal = document.getElementById('fin-total-revenue');
        const elPend = document.getElementById('fin-pending-cod');
        
        if (elTotal) elTotal.textContent = `₹${res.totalRevenue.toLocaleString()}`;
        if (elPend) elPend.textContent = `₹${res.pendingRevenue.toLocaleString()}`;

        // Table Update
        const tb = document.getElementById('finTransactionsBody');
        if (tb) {
            tb.innerHTML = res.transactions.map(t => `
                <tr>
                    <td>#${t.id.slice(-6)}</td>
                    <td>${new Date(t.date).toLocaleDateString()}</td>
                    <td><span class="status-badge" style="background:#e0f2fe; color:#0369a1;">Shipment</span></td>
                    <td>${t.entity}</td>
                    <td style="font-weight:600;">₹${parseFloat(t.amount || 0).toLocaleString()}</td>
                    <td><span class="status-badge status-active">${t.status.toUpperCase()}</span></td>
                </tr>
            `).join('');
        }
    }

    async function setupReports() {
        const res = await window.MoveX.adminGetReports();
        if (!res.success) return;

        // Stats Update
        const elTotal = document.getElementById('kpi-total-shipments');
        const elSuccess = document.getElementById('kpi-success-rate');
        
        if (elTotal) elTotal.textContent = res.totalShipments;
        if (elSuccess) {
            const rate = res.totalShipments > 0 ? ((res.deliveredCount / res.totalShipments) * 100).toFixed(1) : 0;
            elSuccess.textContent = `${rate}%`;
        }

        // Table Update
        const tb = document.getElementById('reportsTableBody');
        if (tb) {
            tb.innerHTML = res.dailyReports.map(d => `
                <tr>
                    <td>${new Date(d.date).toLocaleDateString()}</td>
                    <td style="font-weight:600;">${d.total}</td>
                    <td style="color:var(--status-success-text);">${d.completed}</td>
                    <td style="color:var(--status-error-text);">${d.total - d.completed}</td>
                    <td style="font-weight:700;">₹${parseFloat(d.revenue || 0).toLocaleString()}</td>
                </tr>
            `).join('');
        }
    }

    function renderUsersTable(users) {
        const tb = document.getElementById('usersTableBody');
        if (!tb) return;
        tb.innerHTML = '';
        if (users.length === 0) {
            tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">No users found matching filters.</td></tr>';
            return;
        }
        users.forEach(u => {
            const tr = document.createElement('tr');
            const sC = u.status === 'active' ? 'status-active' : 'status-error';
            tr.innerHTML = `<td>${u.user_id}</td><td>${u.username}</td><td>${u.full_name}</td><td><span style="text-transform:capitalize;">${u.role}</span></td><td><span class="status-badge ${sC}">${u.status.toUpperCase()}</span></td><td><button class="btn-secondary manage-user-btn" style="height:auto;padding:4px 8px;font-size:11px;">Manage</button></td>`;
            tr.querySelector('.manage-user-btn').onclick = () => openUserManageModal(u);
            tb.appendChild(tr);
        });
    }

    function filterUsers() {
        const query = document.getElementById('userSearchInput')?.value.toLowerCase().trim();
        const role = document.getElementById('userRoleFilter')?.value;
        const status = document.getElementById('userStatusFilter')?.value;

        let filtered = window._allUsers || [];
        if (query) {
            filtered = filtered.filter(u => 
                u.username.toLowerCase().includes(query) || 
                u.full_name.toLowerCase().includes(query) || 
                u.user_id.toString().includes(query)
            );
        }
        if (role) filtered = filtered.filter(u => u.role === role);
        if (status) filtered = filtered.filter(u => u.status === status);

        renderUsersTable(filtered);
    }

    function openUserManageModal(u) {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:9999;";
        
        modal.innerHTML = `
            <div class="modal-card" style="width:400px;">
                <h2 class="modal-header-title">Manage User: ${u.username}</h2>
                <div style="margin-bottom:20px; background:#f8fafc; padding:15px; border-radius:10px;">
                    <p><strong>Full Name:</strong> ${u.full_name}</p>
                    <p><strong>Role:</strong> <span style="text-transform:capitalize;">${u.role}</span></p>
                    <p><strong>Phone:</strong> ${u.phone || 'N/A'}</p>
                </div>

                <div class="modal-section-title">🛡️ Security Status</div>
                <select id="userStatusSelect" class="modal-input" style="margin-bottom:20px;">
                    <option value="active" ${u.status==='active'?'selected':''}>Active (Full Access)</option>
                    <option value="disabled" ${u.status==='disabled'?'selected':''}>Disabled (No Login)</option>
                </select>

                <div class="modal-footer" style="flex-direction:column; gap:10px;">
                    <button id="saveUserStatus" class="btn-primary" style="width:100%;">APPLY STATUS CHANGE</button>
                    <div style="margin-top:10px; border-top:1px solid var(--border-subtle); padding-top:10px;">
                        <button id="deleteUserBtn" class="btn-secondary" style="width:100%; color:#dc2626; border-color:#fee2e2; background:#fef2f2;">🗑️ DELETE ACCOUNT PERMANENTLY</button>
                    </div>
                    <button class="btn-secondary" style="width:100%; margin-top:10px;" onclick="this.closest('.modal-backdrop').remove()">Close</button>
                </div>
            </div>`;

        document.body.appendChild(modal);

        document.getElementById('saveUserStatus').onclick = async () => {
            const status = document.getElementById('userStatusSelect').value;
            const res = await window.MoveX.adminUpdateUserStatus(u.user_id, status);
            if (res.success) { alert('User status updated!'); location.reload(); }
        };

        document.getElementById('deleteUserBtn').onclick = async () => {
            if (confirm(`Are you absolutely sure you want to PERMANENTLY DELETE user "${u.username}"? This cannot be undone.`)) {
                const res = await window.MoveX.adminDeleteUser(u.user_id);
                if (res.success) { alert('Account deleted!'); location.reload(); }
            }
        };
    }

    function injectLogout() {
        const nav = document.querySelector('.sidebar-nav');
        if (nav && !document.getElementById('sidebarLogout')) {
            const h = document.createElement('div'); h.className = 'nav-group-title'; h.textContent = 'Session';
            const l = document.createElement('a'); l.id = 'sidebarLogout'; l.className = 'nav-item'; l.innerHTML = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg><span>Logout</span>`;
            l.onclick = () => { if(confirm('Logout?')) { sessionStorage.removeItem('movexsecuresession'); window.location.href = '../../index.html'; } };
            nav.appendChild(h); nav.appendChild(l);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
