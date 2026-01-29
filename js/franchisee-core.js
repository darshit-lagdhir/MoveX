/**
 * MoveX Franchisee Core Logic (Fully Developed)
 * Handles functionality for following franchisee sections:
 * - Dashboard
 * - Shipments (Full CRUD - same as admin)
 * - Pickup Requests
 * - Staff
 * - Finance
 * - Settings
 */

window.MoveXAdmin = (function () {
    'use strict';

    const API_BASE = window.MoveXConfig ? window.MoveXConfig.API_URL : 'https://movex-ffqu.onrender.com';

    // Data store
    let SHIPMENTS = [];
    let CURRENT_PAGE = 1;
    const PER_PAGE = 20;

    // --- SESSION HELPERS ---

    function getAuthHeaders() {
        const session = JSON.parse(sessionStorage.getItem('movexsecuresession') || '{}');
        const token = session.data?.token;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    }

    // --- UI UTILITIES ---

    function animateValue(obj, start, end, duration, prefix = '', suffix = '') {
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            obj.innerHTML = prefix + value.toLocaleString() + suffix;
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `position:fixed; bottom:2rem; right:2rem; background:${type === 'error' ? 'var(--error)' : type === 'success' ? 'var(--success)' : 'var(--brand-primary)'}; color:white; padding:1rem 1.5rem; border-radius:12px; z-index:10000; animation:slideInRight 0.3s ease; font-weight:600;`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    function createModal(title, content, actions = []) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:9999;';
        const modal = document.createElement('div');
        modal.className = 'card';
        modal.style.cssText = 'width:90%; max-width:650px; padding:0; overflow:hidden;';
        modal.innerHTML = `
            <div style="padding:1.5rem; background:var(--surface-secondary); border-bottom:1px solid var(--border-default); display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0;">${title}</h3>
                <button id="modal-close-btn" style="background:none; border:none; cursor:pointer; font-size:1.5rem;">&times;</button>
            </div>
            <div style="padding:2rem; max-height:70vh; overflow-y:auto;">${content}</div>
            <div style="padding:1.5rem; background:var(--surface-secondary); border-top:1px solid var(--border-default); display:flex; justify-content:flex-end; gap:1rem;">
                ${actions.map((a, i) => `<button data-idx="${i}" class="${a.primary ? 'btn-primary' : 'btn-secondary'}" style="padding:0.6rem 1.2rem; border-radius:8px;">${a.label}</button>`).join('')}
            </div>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        document.getElementById('modal-close-btn').onclick = close;
        actions.forEach((a, i) => {
            modal.querySelector(`button[data-idx="${i}"]`).onclick = () => a.onClick(close);
        });
        return { close };
    }

    // --- SHIPMENT TABLE RENDERING ---

    function renderShipmentTable(shipments = SHIPMENTS) {
        const tbody = document.getElementById('shipmentsTableBody');
        if (!tbody) return;

        if (shipments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:3rem; color:var(--text-secondary);">No shipments found.</td></tr>`;
            return;
        }

        // Pagination
        const start = (CURRENT_PAGE - 1) * PER_PAGE;
        const pageData = shipments.slice(start, start + PER_PAGE);

        tbody.innerHTML = pageData.map(s => {
            const statusClass = (s.status || 'pending').toLowerCase().replace(/\s+/g, '-');
            return `
            <tr>
                <td style="font-family:monospace; font-weight:700; color:var(--brand-primary);">${s.tracking_id || s.id}</td>
                <td><span class="status-badge status-${statusClass}">${s.status || 'Pending'}</span></td>
                <td>
                    <div style="font-weight:600;">${s.sender_name || s.sender || '-'}</div>
                    <div style="font-size:0.75rem; color:var(--text-tertiary);">${s.sender_phone || ''}</div>
                </td>
                <td style="max-width:120px;" title="${s.sender_address || s.origin || ''}">${(s.sender_city || s.origin || '-').split(',')[0]}</td>
                <td style="max-width:120px;" title="${s.receiver_address || s.destination || ''}">${(s.receiver_city || s.destination || '-').split(',')[0]}</td>
                <td>${s.created_at ? new Date(s.created_at).toLocaleDateString() : (s.date || '-')}</td>
                <td style="font-weight:700;">₹ ${s.amount || s.price || 0}</td>
                <td>
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                        <button class="action-btn view-shipment" data-id="${s.shipment_id || s.id}" style="padding:4px 8px; border-radius:4px; border:1px solid var(--border-default); background:var(--surface-primary); cursor:pointer; font-size:0.75rem;">View</button>
                        <button class="action-btn update-status" data-id="${s.shipment_id || s.id}" data-tracking="${s.tracking_id || s.id}" data-status="${s.status}" style="padding:4px 8px; border-radius:4px; border:1px solid var(--brand-primary); background:var(--brand-primary-soft); color:var(--brand-primary); cursor:pointer; font-size:0.75rem;">Status</button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');

        // Bind action buttons
        tbody.querySelectorAll('.view-shipment').forEach(btn => {
            btn.onclick = () => showShipmentDetails(btn.dataset.id);
        });

        tbody.querySelectorAll('.update-status').forEach(btn => {
            btn.onclick = () => showUpdateStatusModal(btn.dataset.tracking, btn.dataset.status);
        });

        // Render pagination
        renderPagination(shipments.length);
    }

    function renderPagination(total) {
        const container = document.getElementById('paginationControls');
        if (!container) return;

        const totalPages = Math.ceil(total / PER_PAGE);

        container.innerHTML = `
            <span style="font-size:0.85rem; color:var(--text-secondary);">Page ${CURRENT_PAGE} of ${totalPages} (${total} items)</span>
            <div style="display:flex; gap:0.5rem;">
                <button id="prevPage" ${CURRENT_PAGE === 1 ? 'disabled' : ''} style="padding:6px 12px; border-radius:6px; border:1px solid var(--border-default); background:var(--surface-primary); cursor:pointer;">Prev</button>
                <button id="nextPage" ${CURRENT_PAGE === totalPages ? 'disabled' : ''} style="padding:6px 12px; border-radius:6px; border:1px solid var(--border-default); background:var(--surface-primary); cursor:pointer;">Next</button>
            </div>
        `;

        document.getElementById('prevPage').onclick = () => { if (CURRENT_PAGE > 1) { CURRENT_PAGE--; renderShipmentTable(); } };
        document.getElementById('nextPage').onclick = () => { if (CURRENT_PAGE < totalPages) { CURRENT_PAGE++; renderShipmentTable(); } };
    }

    function filterShipments() {
        const searchTerm = document.getElementById('shipmentSearchInput')?.value?.toLowerCase() || '';
        const statusFilter = document.getElementById('shipmentStatusFilter')?.value || 'All Status';
        const dateFilter = document.getElementById('shipmentDateFilter')?.value || '';

        let filtered = SHIPMENTS;

        if (searchTerm) {
            filtered = filtered.filter(s =>
                (s.tracking_id || s.id || '').toLowerCase().includes(searchTerm) ||
                (s.sender_name || s.sender || '').toLowerCase().includes(searchTerm)
            );
        }

        if (statusFilter && statusFilter !== 'All Status') {
            filtered = filtered.filter(s => (s.status || '').toLowerCase() === statusFilter.toLowerCase());
        }

        if (dateFilter) {
            filtered = filtered.filter(s => {
                const shipDate = new Date(s.created_at || s.date).toISOString().split('T')[0];
                return shipDate === dateFilter;
            });
        }

        CURRENT_PAGE = 1;
        renderShipmentTable(filtered);
    }

    // --- SHIPMENT MODALS ---

    function showShipmentDetails(id) {
        const s = SHIPMENTS.find(ship => (ship.shipment_id == id) || (ship.id == id));
        if (!s) return showToast('Shipment not found', 'error');

        createModal(`Shipment Details: ${s.tracking_id || s.id}`, `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
                <div>
                    <div style="font-size:0.75rem; color:var(--text-tertiary); text-transform:uppercase; font-weight:700;">Tracking ID</div>
                    <div style="font-family:monospace; font-weight:700; color:var(--brand-primary); font-size:1.1rem;">${s.tracking_id || s.id}</div>
                </div>
                <div>
                    <div style="font-size:0.75rem; color:var(--text-tertiary); text-transform:uppercase; font-weight:700;">Status</div>
                    <span class="status-badge status-${(s.status || 'pending').toLowerCase()}">${s.status || 'Pending'}</span>
                </div>
                <div style="grid-column:span 2; border-top:1px solid var(--border-default); padding-top:1rem;">
                    <div style="font-size:0.9rem; font-weight:700; color:var(--brand-primary); margin-bottom:0.5rem;">SENDER</div>
                    <div style="font-weight:600;">${s.sender_name || s.sender || '-'}</div>
                    <div style="font-size:0.85rem; color:var(--text-secondary);">${s.sender_phone || ''}</div>
                    <div style="font-size:0.85rem; color:var(--text-tertiary);">${s.sender_address || s.origin || ''}</div>
                </div>
                <div style="grid-column:span 2; border-top:1px solid var(--border-default); padding-top:1rem;">
                    <div style="font-size:0.9rem; font-weight:700; color:var(--brand-primary); margin-bottom:0.5rem;">RECEIVER</div>
                    <div style="font-weight:600;">${s.receiver_name || '-'}</div>
                    <div style="font-size:0.85rem; color:var(--text-secondary);">${s.receiver_phone || ''}</div>
                    <div style="font-size:0.85rem; color:var(--text-tertiary);">${s.receiver_address || s.destination || ''}</div>
                </div>
                <div>
                    <div style="font-size:0.75rem; color:var(--text-tertiary); text-transform:uppercase; font-weight:700;">Weight</div>
                    <div>${s.weight || 0} kg</div>
                </div>
                <div>
                    <div style="font-size:0.75rem; color:var(--text-tertiary); text-transform:uppercase; font-weight:700;">Amount</div>
                    <div style="font-weight:700; font-size:1.1rem;">₹ ${s.amount || s.price || 0}</div>
                </div>
                <div>
                    <div style="font-size:0.75rem; color:var(--text-tertiary); text-transform:uppercase; font-weight:700;">Created</div>
                    <div>${s.created_at ? new Date(s.created_at).toLocaleString() : '-'}</div>
                </div>
            </div>
        `, [
            {
                label: 'Print Label',
                onClick: (c) => {
                    const cleanOrigin = (s.origin || s.sender_city || '').split(',')[0].trim();
                    const cleanDest = (s.destination || s.receiver_city || '').split(',')[0].trim();

                    const params = new URLSearchParams({
                        id: s.tracking_id || s.id,
                        sender: s.sender_name || s.sender || 'N/A',
                        receiver: s.receiver_name || 'N/A',
                        r_addr: (s.receiver_address || s.destination || '').trim(),
                        r_phone: s.receiver_phone || s.receiver_mobile || '',
                        origin: cleanOrigin,
                        dest: cleanDest,
                        price: s.amount || s.price || 0,
                        weight: s.weight || '1.0',
                        r_pincode: s.receiver_pincode || '',
                        s_addr: (s.sender_address || s.origin || '').trim()
                    });
                    window.open(`../admin/admin-print_label.html?${params.toString()}`, '_blank');
                }
            },
            { label: 'Close', primary: true, onClick: c => c() }
        ]);
    }

    function showUpdateStatusModal(trackingId, currentStatus) {
        createModal(`Update Status: ${trackingId}`, `
            <div style="display:flex; flex-direction:column; gap:1.5rem;">
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Current Status</label>
                    <span class="status-badge status-${(currentStatus || 'pending').toLowerCase()}">${currentStatus || 'Pending'}</span>
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">New Status</label>
                    <select id="newStatusSelect" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                        <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Picked Up" ${currentStatus === 'Picked Up' ? 'selected' : ''}>Picked Up</option>
                        <option value="In Transit" ${currentStatus === 'In Transit' ? 'selected' : ''}>In Transit</option>
                        <option value="Reached at Final Delivery Hub" ${currentStatus === 'Reached at Final Delivery Hub' ? 'selected' : ''}>Reached at Final Delivery Hub</option>
                        <option value="Out for Delivery" ${currentStatus === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                        <option value="Delivered" ${currentStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="Returned" ${currentStatus === 'Returned' ? 'selected' : ''}>Returned</option>
                    </select>
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Remarks (Optional)</label>
                    <textarea id="statusRemarks" placeholder="Add notes about this status change..." style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px; min-height:80px;"></textarea>
                </div>
            </div>
        `, [
            { label: 'Cancel', onClick: c => c() },
            {
                label: 'Update Status', primary: true, onClick: async (close) => {
                    const newStatus = document.getElementById('newStatusSelect').value;
                    const remarks = document.getElementById('statusRemarks').value;

                    try {
                        const res = await fetch(`${API_BASE}/api/dashboard/franchisee/shipments/update-status`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ tracking_id: trackingId, status: newStatus, remarks })
                        });
                        const data = await res.json();
                        if (data.success) {
                            showToast('Status updated successfully', 'success');
                            close();
                            initializers.shipments();
                        } else {
                            showToast(data.error || 'Failed to update status', 'error');
                        }
                    } catch (err) {
                        showToast('Network error', 'error');
                    }
                }
            }
        ]);
    }

    function showCreateShipmentModal() {
        createModal('Create New Shipment', `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
                <div style="grid-column:span 2; padding-bottom:0.5rem; border-bottom:1px solid var(--border-subtle);">
                    <div style="font-weight:700; color:var(--brand-primary);">SENDER DETAILS</div>
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Sender Name *</label>
                    <input type="text" id="cs_sender_name" placeholder="Full name" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Sender Phone *</label>
                    <input type="tel" id="cs_sender_phone" placeholder="10-digit Mobile" maxlength="10" oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <div style="grid-column:span 2;">
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Sender Address *</label>
                    <textarea id="cs_sender_address" placeholder="Complete pickup address" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px; min-height:60px;"></textarea>
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Sender Pincode *</label>
                    <input type="text" id="cs_sender_pincode" placeholder="6-digit Pincode" maxlength="6" oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Sender City</label>
                    <input type="text" id="cs_sender_city" placeholder="City name" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>

                <div style="grid-column:span 2; padding:0.5rem 0; border-bottom:1px solid var(--border-subtle); margin-top:1rem;">
                    <div style="font-weight:700; color:var(--brand-primary);">RECEIVER DETAILS</div>
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Receiver Name *</label>
                    <input type="text" id="cs_receiver_name" placeholder="Full name" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Receiver Phone *</label>
                    <input type="tel" id="cs_receiver_phone" placeholder="10-digit Mobile" maxlength="10" oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <div style="grid-column:span 2;">
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Receiver Address *</label>
                    <textarea id="cs_receiver_address" placeholder="Complete delivery address" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px; min-height:60px;"></textarea>
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Receiver Pincode *</label>
                    <input type="text" id="cs_receiver_pincode" placeholder="6-digit Pincode" maxlength="6" oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Receiver City</label>
                    <input type="text" id="cs_receiver_city" placeholder="City name" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>

                <div style="grid-column:span 2; padding:0.5rem 0; border-bottom:1px solid var(--border-subtle); margin-top:1rem;">
                    <div style="font-weight:700; color:var(--brand-primary);">PACKAGE DETAILS</div>
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Weight (kg) *</label>
                    <input type="number" id="cs_weight" placeholder="0.5" step="0.1" min="0" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Amount (₹) *</label>
                    <input type="number" id="cs_amount" placeholder="100" min="0" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Contents Description</label>
                    <input type="text" id="cs_contents" placeholder="e.g. Books, Clothes" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
            </div>
        `, [
            { label: 'Cancel', onClick: c => c() },
            {
                label: 'Create Shipment', primary: true, onClick: async (close) => {
                    // Collect form data
                    const data = {
                        sender_name: document.getElementById('cs_sender_name').value,
                        sender_phone: document.getElementById('cs_sender_phone').value,
                        sender_address: document.getElementById('cs_sender_address').value,
                        sender_pincode: document.getElementById('cs_sender_pincode').value,
                        sender_city: document.getElementById('cs_sender_city').value,
                        receiver_name: document.getElementById('cs_receiver_name').value,
                        receiver_phone: document.getElementById('cs_receiver_phone').value,
                        receiver_address: document.getElementById('cs_receiver_address').value,
                        receiver_pincode: document.getElementById('cs_receiver_pincode').value,
                        receiver_city: document.getElementById('cs_receiver_city').value,
                        weight: document.getElementById('cs_weight').value,
                        amount: document.getElementById('cs_amount').value,
                        contents: document.getElementById('cs_contents').value
                    };

                    // Validation
                    if (!data.sender_name || !data.sender_phone || !data.sender_address || !data.sender_pincode ||
                        !data.receiver_name || !data.receiver_phone || !data.receiver_address || !data.receiver_pincode ||
                        !data.weight || !data.amount) {
                        return showToast('Please fill all required fields', 'error');
                    }

                    try {
                        const res = await fetch(`${API_BASE}/api/dashboard/franchisee/shipments/create`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(data)
                        });
                        const result = await res.json();
                        if (result.success) {
                            showToast(`Shipment created: ${result.tracking_id}`, 'success');
                            close();
                            initializers.shipments();
                        } else {
                            showToast(result.error || 'Failed to create shipment', 'error');
                        }
                    } catch (err) {
                        showToast('Network error', 'error');
                    }
                }
            }
        ]);
    }

    // --- INITIALIZERS ---

    const initializers = {
        'dashboard': async function () {
            try {
                const res = await fetch(`${API_BASE}/api/dashboard/franchisee/stats`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    const s = data.stats;
                    animateValue(document.getElementById('kpi-total-shipments'), 0, s.totalShipments || 0, 800);
                    animateValue(document.getElementById('kpi-pending-pickups'), 0, s.pendingPickups || 0, 800);
                }
            } catch (err) { console.error('Dashboard stats error:', err); }

            // Bind create shipment button
            const createBtn = document.getElementById('action-create-shipment');
            if (createBtn) createBtn.onclick = () => showCreateShipmentModal();
        },

        'shipments': async function () {
            const tbody = document.getElementById('shipmentsTableBody');
            if (!tbody) return;

            try {
                const res = await fetch(`${API_BASE}/api/dashboard/franchisee/shipments`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    SHIPMENTS = data.shipments || [];
                    renderShipmentTable();
                } else {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:3rem; color:var(--error);">Failed to load shipments.</td></tr>';
                }
            } catch (err) {
                console.error('Shipments fetch error:', err);
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:3rem; color:var(--error);">Network error.</td></tr>';
            }

            // Bind search/filter
            const searchBtn = document.getElementById('shipmentSearchBtn');
            if (searchBtn) searchBtn.onclick = filterShipments;

            const searchInput = document.getElementById('shipmentSearchInput');
            if (searchInput) searchInput.onkeypress = (e) => { if (e.key === 'Enter') filterShipments(); };

            // Bind create button
            const createBtn = document.getElementById('createNewShipment');
            if (createBtn) createBtn.onclick = () => showCreateShipmentModal();
        },

        'pickup-requests': async function () {
            const tbody = document.getElementById('pickup-requests-table-body');
            if (!tbody) return;

            try {
                const res = await fetch(`${API_BASE}/api/dashboard/franchisee/pickup-requests`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success && data.requests) {
                    if (data.requests.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:3rem; color:var(--text-tertiary);">No pickup requests in your assigned areas.</td></tr>';
                    } else {
                        tbody.innerHTML = data.requests.map(r => `
                            <tr>
                                <td style="font-family:monospace; color:var(--brand-primary);">${r.id}</td>
                                <td>
                                    <div style="font-weight:600;">${r.customer_name || 'Customer'}</div>
                                    <div style="font-size:0.8rem; color:var(--text-tertiary);">${r.customer_phone || ''}</div>
                                </td>
                                <td style="max-width:200px;">
                                    <div style="font-size:0.85rem;">${r.pickup_address || ''}</div>
                                    <div style="font-size:0.75rem; color:var(--text-tertiary);">${r.pincode || ''}</div>
                                </td>
                                <td>${r.weight || 0} kg</td>
                                <td><span class="status-badge status-pending">${r.status || 'Pending'}</span></td>
                                <td>
                                    <button class="btn-primary approve-pickup" data-id="${r.id}" style="padding:4px 12px; font-size:0.8rem; margin-right:4px;">Approve</button>
                                    <button class="btn-secondary reject-pickup" data-id="${r.id}" style="padding:4px 12px; font-size:0.8rem;">Reject</button>
                                </td>
                            </tr>
                        `).join('');

                        // Bind approve/reject buttons
                        tbody.querySelectorAll('.approve-pickup').forEach(btn => {
                            btn.onclick = () => handlePickupAction(btn.dataset.id, 'approve');
                        });
                        tbody.querySelectorAll('.reject-pickup').forEach(btn => {
                            btn.onclick = () => handlePickupAction(btn.dataset.id, 'reject');
                        });
                    }

                    // Update KPIs
                    const newKpi = document.getElementById('kpi-new-bookings');
                    if (newKpi) newKpi.textContent = data.requests.length;
                }
            } catch (err) {
                console.error('Pickup requests error:', err);
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:3rem; color:var(--error);">Failed to load requests.</td></tr>';
            }
        },

        'staff': async function () {
            const tbody = document.getElementById('staff-table-body');
            if (!tbody) return;

            try {
                const res = await fetch(`${API_BASE}/api/dashboard/franchisee/staff`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success && tbody) {
                    if (!data.staff || data.staff.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--text-tertiary);">No staff members found. Add your first staff member!</td></tr>';
                    } else {
                        tbody.innerHTML = data.staff.map(s => `
                            <tr>
                                <td>
                                    <div style="font-weight:600;">${s.full_name || s.name}</div>
                                    <div style="font-size:0.8rem; color:var(--text-tertiary);">@${s.username}</div>
                                </td>
                                <td style="text-transform:capitalize;">Staff</td>
                                <td>${s.phone || '-'}</td>
                                <td><span class="status-badge status-${(s.status || 'active').toLowerCase()}">${s.status || 'Active'}</span></td>
                                <td>
                                    <div style="display:flex; gap:0.5rem;">
                                        <button class="action-btn edit-staff" data-id="${s.user_id}" data-name="${s.full_name || s.name}" data-phone="${s.phone || ''}" data-role="${s.staff_role || 'Staff'}" style="padding:4px 8px; border-radius:4px; border:1px solid var(--border-default); background:var(--surface-primary); cursor:pointer; font-size:0.75rem;">Edit</button>
                                        <button class="action-btn toggle-staff" data-id="${s.user_id}" data-status="${s.status || 'Active'}" style="padding:4px 8px; border-radius:4px; border:1px solid var(--warning); background:var(--warning-soft); color:var(--warning); cursor:pointer; font-size:0.75rem;">${(s.status || 'Active') === 'Active' ? 'Disable' : 'Enable'}</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('');

                        // Bind edit buttons
                        tbody.querySelectorAll('.edit-staff').forEach(btn => {
                            btn.onclick = () => showEditStaffModal(btn.dataset);
                        });

                        // Bind toggle buttons
                        tbody.querySelectorAll('.toggle-staff').forEach(btn => {
                            btn.onclick = () => toggleStaffStatus(btn.dataset.id, btn.dataset.status);
                        });
                    }
                }
            } catch (err) { console.error('Staff fetch error:', err); }

            // Bind Add Staff button
            const addBtn = document.getElementById('addStaffBtn');
            if (addBtn) addBtn.onclick = showAddStaffModal;
        },

        'finance': async function () {
            const tbody = document.getElementById('transactions-table-body');
            try {
                // 1. Fetch Stats
                const res = await fetch(`${API_BASE}/api/dashboard/franchisee/stats`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (data.success) {
                    animateValue(document.getElementById('kpi-total-revenue'), 0, data.stats.totalRevenue || 0, 800, '₹ ');
                    animateValue(document.getElementById('kpi-monthly-revenue'), 0, data.stats.monthlyRevenue || 0, 800, '₹ ');
                }

                // 2. Fetch Transactions (using shipments API)
                const shipRes = await fetch(`${API_BASE}/api/dashboard/franchisee/shipments`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const shipData = await shipRes.json();
                if (shipData.success && tbody) {
                    if (shipData.shipments.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--text-tertiary);">No shipment revenue data found.</td></tr>';
                    } else {
                        tbody.innerHTML = shipData.shipments.slice(0, 10).map(s => `
                            <tr>
                                <td style="font-family:monospace; font-weight:700; color:var(--brand-primary);">${s.tracking_id}</td>
                                <td>${new Date(s.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div style="font-weight:600;">${s.sender_name}</div>
                                    <div style="font-size:0.75rem; color:var(--text-tertiary);">${s.sender_phone}</div>
                                </td>
                                <td><span class="status-badge status-${(s.status || 'pending').toLowerCase().replace(/\s+/g, '-')}">${s.status}</span></td>
                                <td style="font-weight:700;">₹ ${s.amount || 0}</td>
                            </tr>
                        `).join('');
                    }
                }
            } catch (err) {
                console.error('Finance error:', err);
                if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--error);">Failed to load revenue data.</td></tr>';
            }
        },

        'settings': async function () {
            const nameInp = document.getElementById('profile_full_name');
            const phoneInp = document.getElementById('profile_phone');
            if (window.MoveXUser) {
                if (nameInp) {
                    nameInp.value = window.MoveXUser.full_name || '';
                    nameInp.placeholder = 'Full Name';
                }
                if (phoneInp) {
                    phoneInp.value = window.MoveXUser.phone || '';
                    phoneInp.placeholder = 'Phone Number';
                }
            }

            const saveBtn = document.getElementById('btn-save-profile');
            if (saveBtn) {
                saveBtn.onclick = async () => {
                    const full_name = document.getElementById('profile_full_name')?.value;
                    const phone = document.getElementById('profile_phone')?.value;

                    try {
                        const res = await fetch(`${API_BASE}/api/me`, {
                            method: 'PUT',
                            credentials: 'include',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ full_name, phone })
                        });
                        const data = await res.json();
                        if (data.success) {
                            showToast('Profile updated successfully', 'success');
                            const displayEl = document.getElementById('profile-name-display');
                            if (displayEl) displayEl.textContent = full_name;
                            const topName = document.getElementById('topBarUserName');
                            if (topName) topName.textContent = full_name;
                        } else {
                            showToast(data.error || 'Failed to update', 'error');
                        }
                    } catch (err) {
                        showToast('Network error', 'error');
                    }
                };
            }

            const pwdBtn = document.getElementById('btn-save-password');
            if (pwdBtn) {
                pwdBtn.onclick = async () => {
                    const oldPwd = document.getElementById('old_password')?.value;
                    const newPwd = document.getElementById('new_password')?.value;
                    const confirmPwd = document.getElementById('confirm_password')?.value;

                    if (!oldPwd || !newPwd) {
                        return showToast('Please fill all password fields', 'error');
                    }
                    if (newPwd !== confirmPwd) {
                        return showToast('Passwords do not match', 'error');
                    }
                    if (newPwd.length < 6) {
                        return showToast('Password must be at least 6 characters', 'error');
                    }

                    try {
                        const res = await fetch(`${API_BASE}/api/auth/change-password`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
                        });
                        const data = await res.json();
                        if (data.success) {
                            showToast('Password changed successfully', 'success');
                            document.getElementById('old_password').value = '';
                            document.getElementById('new_password').value = '';
                            document.getElementById('confirm_password').value = '';
                        } else {
                            showToast(data.error || 'Failed to change password', 'error');
                        }
                    } catch (err) {
                        showToast('Network error', 'error');
                    }
                };
            }

            if (window.MoveXOrganization) {
                const org = window.MoveXOrganization;
                const nameEl = document.getElementById('franchise-name-display');
                if (nameEl) nameEl.textContent = org.name || 'Your Franchise';

                const addrEl = document.getElementById('franchise_address');
                if (addrEl) {
                    addrEl.value = org.address || '';
                    addrEl.placeholder = 'Enter franchise address';
                }

                const pinEl = document.getElementById('franchise_pincodes');
                if (pinEl) {
                    pinEl.value = org.pincodes || '';
                    pinEl.placeholder = 'No pincodes assigned';
                }

                const emailEl = document.getElementById('franchise_email');
                if (emailEl) {
                    emailEl.style.display = 'none';
                }

                const avatarEl = document.getElementById('profile-avatar');
                if (avatarEl) avatarEl.textContent = (org.name || 'F').charAt(0).toUpperCase();
            }
        },

        'assignments': async function () {
            console.log('Initializing Assignments Page');
            let allShipments = [];
            let selectedShipments = new Set();
            const API_BASE = window.MoveXConfig ? window.MoveXConfig.API_URL : 'https://movex-ffqu.onrender.com';

            // 1. Load Staff
            async function loadStaff() {
                try {
                    const res = await fetch(`${API_BASE}/api/dashboard/franchisee/staff`, { credentials: 'include', headers: getAuthHeaders() });
                    const data = await res.json();
                    const select = document.getElementById('staffSelect');
                    if (!select) return;
                    select.innerHTML = '<option value="">-- Select Staff to Assign --</option>';

                    if (data.success && data.staff && data.staff.length > 0) {
                        data.staff.forEach(s => {
                            if (s.status === 'Active') {
                                const option = document.createElement('option');
                                option.value = s.user_id;
                                option.textContent = s.full_name;
                                select.appendChild(option);
                            }
                        });
                    } else {
                        const option = document.createElement('option');
                        option.textContent = 'No Active Staff Found';
                        select.appendChild(option);
                    }
                } catch (err) { console.error("Load Staff Error:", err); }
            }

            // 2. Load Shipments
            async function loadAvailableShipments() {
                const tbody = document.getElementById('shipmentsTableBody');
                if (!tbody) return;
                try {
                    const res = await fetch(`${API_BASE}/api/dashboard/franchisee/assignments/available`, { credentials: 'include', headers: getAuthHeaders() });
                    const data = await res.json();

                    tbody.innerHTML = '';

                    if (data.success && data.shipments && data.shipments.length > 0) {
                        allShipments = data.shipments;
                        data.shipments.forEach(s => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td><input type="checkbox" class="shipment-checkbox" value="${s.tracking_id}"></td>
                                <td class="font-medium" style="color:var(--brand-primary); font-weight:600;">${s.tracking_id}</td>
                                <td>${s.receiver_name}</td>
                                <td>${s.destination_address}</td>
                                <td><span class="status-badge status-reached-at-final-delivery-hub" style="background:#e0e7ff; color:#4338ca; border:1px solid #4338ca;">At Hub</span></td>
                                <td>${new Date(s.created_at).toLocaleDateString()}</td>
                            `;
                            tbody.appendChild(tr);
                        });

                        // Re-bind checkbox listeners
                        tbody.querySelectorAll('.shipment-checkbox').forEach(cb => {
                            cb.addEventListener('change', (e) => {
                                if (e.target.checked) selectedShipments.add(e.target.value);
                                else selectedShipments.delete(e.target.value);
                                updateAssignButton();
                            });
                        });
                    } else {
                        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color:var(--text-secondary);">No shipments at hub ready for assignment.</td></tr>`;
                    }
                } catch (err) {
                    console.error(err);
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--error);">Error loading shipments</td></tr>`;
                }
            }

            function updateAssignButton() {
                const btn = document.getElementById('assignBtn');
                const select = document.getElementById('staffSelect');
                if (!btn || !select) return;

                const count = selectedShipments.size;

                if (count > 0 && select.value) {
                    btn.disabled = false;
                    btn.textContent = `Assign ${count} Shipment${count > 1 ? 's' : ''}`;
                } else {
                    btn.disabled = true;
                    btn.textContent = count > 0 ? `Select Staff to Assign` : 'Select Shipments';
                }
            }

            // 3. Bind Events
            const selectAll = document.getElementById('selectAll');
            if (selectAll) {
                selectAll.addEventListener('change', (e) => {
                    const checkboxes = document.querySelectorAll('.shipment-checkbox');
                    checkboxes.forEach(cb => {
                        cb.checked = e.target.checked;
                        if (e.target.checked) selectedShipments.add(cb.value);
                        else selectedShipments.delete(cb.value);
                    });
                    updateAssignButton();
                });
            }

            const staffSelect = document.getElementById('staffSelect');
            if (staffSelect) staffSelect.addEventListener('change', updateAssignButton);

            const assignBtn = document.getElementById('assignBtn');
            if (assignBtn) {
                assignBtn.onclick = async () => {
                    const staffIds = staffSelect.value;
                    const trackingIds = Array.from(selectedShipments);

                    if (!staffIds || trackingIds.length === 0) return;

                    assignBtn.disabled = true;
                    assignBtn.textContent = 'Assigning...';

                    try {
                        const res = await fetch(`${API_BASE}/api/dashboard/franchisee/assign`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ staff_id: staffIds, tracking_ids: trackingIds })
                        });
                        const data = await res.json();
                        if (data.success) {
                            showToast(`Successfully assigned ${trackingIds.length} shipments!`, 'success');
                            selectedShipments.clear();
                            if (selectAll) selectAll.checked = false;
                            loadAvailableShipments();
                        } else {
                            showToast(data.error || 'Assignment failed', 'error');
                        }
                    } catch (e) { showToast('Network Error', 'error'); }
                    finally { updateAssignButton(); }
                };
            }

            // Initial Load
            loadStaff();
            loadAvailableShipments();
        }
    };

    // --- STAFF MANAGEMENT FUNCTIONS ---

    function showAddStaffModal() {
        createModal('Add New Staff', `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Full Name *</label>
                    <input type="text" id="staff_name" placeholder="Enter full name" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Phone Number *</label>
                    <input type="tel" id="staff_phone" placeholder="10-digit Mobile" maxlength="10" oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Username *</label>
                    <input type="text" id="staff_username" placeholder="e.g. john_staff" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Password *</label>
                    <input type="password" id="staff_password" placeholder="Min 6 characters" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <!-- Role selection removed: simplified to default 'Staff' -->
            </div>
        `, [
            { label: 'Cancel', onClick: c => c() },
            {
                label: 'Add Staff', primary: true, onClick: async (close) => {
                    const data = {
                        full_name: document.getElementById('staff_name').value,
                        phone: document.getElementById('staff_phone').value,
                        username: document.getElementById('staff_username').value,
                        password: document.getElementById('staff_password').value,
                        staff_role: 'Staff'
                    };

                    if (!data.full_name || !data.phone || !data.username || !data.password) {
                        return showToast('Please fill all required fields', 'error');
                    }

                    try {
                        const res = await fetch(`${API_BASE}/api/dashboard/franchisee/staff/create`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(data)
                        });
                        const result = await res.json();
                        if (result.success) {
                            showToast('Staff added successfully', 'success');
                            close();
                            initializers.staff();
                        } else {
                            showToast(result.error || 'Failed to add staff', 'error');
                        }
                    } catch (err) {
                        showToast('Network error', 'error');
                    }
                }
            }
        ]);
    }

    function showEditStaffModal(dataset) {
        createModal(`Edit Staff: ${dataset.name}`, `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Full Name</label>
                    <input type="text" id="edit_staff_name" value="${dataset.name || ''}" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Phone Number</label>
                    <input type="tel" id="edit_staff_phone" value="${dataset.phone || ''}" placeholder="10-digit Mobile" maxlength="10" oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
                <div>
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem;">New Password (leave blank to keep)</label>
                    <input type="password" id="edit_staff_password" placeholder="Enter new password" style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px;">
                </div>
            </div>
        `, [
            { label: 'Cancel', onClick: c => c() },
            {
                label: 'Save Changes', primary: true, onClick: async (close) => {
                    const updateData = {
                        user_id: dataset.id,
                        full_name: document.getElementById('edit_staff_name').value,
                        phone: document.getElementById('edit_staff_phone').value,
                        staff_role: 'Staff',
                        password: document.getElementById('edit_staff_password').value || undefined
                    };

                    try {
                        const res = await fetch(`${API_BASE}/api/dashboard/franchisee/staff/update`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(updateData)
                        });
                        const result = await res.json();
                        if (result.success) {
                            showToast('Staff updated successfully', 'success');
                            close();
                            initializers.staff();
                        } else {
                            showToast(result.error || 'Failed to update', 'error');
                        }
                    } catch (err) {
                        showToast('Network error', 'error');
                    }
                }
            }
        ]);
    }

    async function toggleStaffStatus(userId, currentStatus) {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        if (!confirm(`Are you sure you want to ${newStatus === 'Active' ? 'enable' : 'disable'} this staff member?`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/dashboard/franchisee/staff/status`, {
                method: 'POST',
                credentials: 'include',
                headers: getAuthHeaders(),
                body: JSON.stringify({ user_id: userId, status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Staff ${newStatus === 'Active' ? 'enabled' : 'disabled'}`, 'success');
                initializers.staff();
            } else {
                showToast(data.error || 'Failed', 'error');
            }
        } catch (err) {
            showToast('Network error', 'error');
        }
    }

    function handlePickupAction(id, action) {
        createModal(`${action === 'approve' ? 'Approve' : 'Reject'} Pickup Request`, `
            <div>
                <label style="display:block; font-weight:600; margin-bottom:0.5rem;">Remarks</label>
                <textarea id="pickup_remarks" placeholder="Add notes..." style="width:100%; padding:0.75rem; border:1px solid var(--border-default); border-radius:8px; min-height:100px;"></textarea>
            </div>
        `, [
            { label: 'Cancel', onClick: c => c() },
            {
                label: action === 'approve' ? 'Approve & Create Shipment' : 'Reject Request',
                primary: true,
                onClick: async (close) => {
                    const remarks = document.getElementById('pickup_remarks').value;
                    try {
                        const res = await fetch(`${API_BASE}/api/dashboard/franchisee/pickup-requests/${action}`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ id, remarks })
                        });
                        const data = await res.json();
                        if (data.success) {
                            showToast(`Request ${action}d successfully`, 'success');
                            close();
                            initializers['pickup-requests']();
                        } else {
                            showToast(data.error || 'Failed', 'error');
                        }
                    } catch (err) {
                        showToast('Network error', 'error');
                    }
                }
            }
        ]);
    }

    return {
        init: function (page) {
            console.log("Franchisee Core Init:", page);
            if (initializers[page]) initializers[page]();
        },
        createShipment: showCreateShipmentModal,
        handleServiceabilityCheck: function () {
            showToast("Checking coverage...", "info");
        },
        updateStatus: showUpdateStatusModal,
        processBooking: function (id) {
            handlePickupAction(id, 'approve');
        },
        addStaff: showAddStaffModal,
        _source: '/js/franchisee-core.js'
    };
})();

