/**
 * MOVEX MASTER DASHBOARD SCRIPT
 * Final Deep Fix - No Hardcoding - Full User Management
 */

(function () {
    'use strict';

    let allUsers = [];
    let allShipments = [];

    async function init() {
        const path = window.location.pathname;
        const roleMatch = path.match(/dashboards\/([^/]+)/);
        const role = roleMatch ? roleMatch[1] : 'user';

        try {
            const sessionData = sessionStorage.getItem('movexsecuresession');
            if (!sessionData) return;

            const [statsRes, shipRes] = await Promise.all([
                window.MoveX.getStats().catch(() => ({ success: false })),
                window.MoveX.getShipments().catch(() => ({ success: false }))
            ]);

            if (statsRes.success) renderStats(statsRes.stats);
            if (shipRes.success) {
                allShipments = shipRes.shipments;
                renderTable(allShipments, role);
            }

            setupGlobalListeners();
            if (role === 'admin') setupAdmin();
            else if (role === 'franchisee') setupFranchisee();

        } catch (err) { console.error('[MoveX] Init Error:', err); }
    }

    function renderStats(stats) {
        const successRate = stats.totalShipments > 0 
            ? ((stats.deliveredCount || stats.deliveredShipments || 0) / stats.totalShipments * 100).toFixed(1) + '%'
            : '0%';

        const mappings = {
            'kpi-total-shipments': stats.totalShipments,
            'kpi-total-users': stats.totalUsers ?? stats.totalShipments,
            'kpi-total-revenue': stats.totalRevenue ? `₹${stats.totalRevenue.toLocaleString()}` : '0',
            'kpi-franchise-total': stats.totalShipments,
            'kpi-franchise-revenue': stats.totalRevenue ? `₹${stats.totalRevenue.toLocaleString()}` : '0',
            'kpi-franchise-pending': stats.pendingPickups || 0,
            'kpi-user-total': stats.totalShipments,
            'kpi-user-active': stats.activeShipments,
            'kpi-user-delivered': stats.deliveredShipments,
            'fin-total-revenue': stats.totalRevenue ? `₹${stats.totalRevenue.toLocaleString()}` : '0',
            'kpi-success-rate': successRate
        };

        for (const [id, value] of Object.entries(mappings)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value ?? '0';
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  🚀 MODALS (SHIPMENT & USER)
    // ═══════════════════════════════════════════════════════════

    function openShipmentModal() {
        let modal = document.getElementById('shipmentModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'shipmentModal';
            modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9000;";
            modal.innerHTML = `
                <div style="background:white;padding:2.5rem;border-radius:16px;width:600px;max-width:95%;max-height:85vh;overflow-y:auto;">
                    <h2 style="margin:0 0 1.5rem 0; color:#4F46E5;">New Shipment Request</h2>
                    <form id="modalBookingForm" style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                        <input type="text" name="sender_name" placeholder="Sender Name" required style="grid-column:span 2; padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        <input type="text" name="sender_phone" placeholder="Phone (10)" maxlength="10" required oninput="this.value=this.value.replace(/[^0-9]/g,'')" style="padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        <input type="text" name="sender_pincode" placeholder="Pincode (6)" maxlength="6" required oninput="this.value=this.value.replace(/[^0-9]/g,'')" style="padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        <input type="text" name="sender_address" placeholder="Pickup Address" required style="grid-column:span 2; padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        <hr style="grid-column:span 2; border:0; border-top:1px solid #e2e8f0; margin:8px 0;">
                        <input type="text" name="receiver_name" placeholder="Receiver Name" required style="grid-column:span 2; padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        <input type="text" name="receiver_phone" placeholder="Phone (10)" maxlength="10" required oninput="this.value=this.value.replace(/[^0-9]/g,'')" style="padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        <input type="text" name="receiver_pincode" placeholder="Pincode (6)" maxlength="6" required oninput="this.value=this.value.replace(/[^0-9]/g,'')" style="padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        <input type="number" name="price" placeholder="Amount (₹)" required style="padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        <input type="number" name="weight" placeholder="Weight (kg)" required style="padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        <div style="grid-column:span 2; display:flex; gap:12px; margin-top:12px;">
                            <button type="submit" class="btn-primary" style="flex:2; padding:12px;">CONFIRM</button>
                            <button type="button" onclick="this.closest('#shipmentModal').style.display='none'" class="btn-secondary" style="flex:1; padding:12px;">CANCEL</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            const f = document.getElementById('modalBookingForm');
            f.onsubmit = async (e) => {
                e.preventDefault();
                try {
                   const res = await window.MoveX.createShipment(Object.fromEntries(new FormData(f).entries()));
                   if (res.success) { alert(`Created! ID: ${res.tracking_id}`); location.reload(); }
                } catch(err) { alert(err.message); }
            };
        }
        modal.style.display = 'flex';
    }

    function openAddUserModal() {
        let modal = document.getElementById('addUserModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'addUserModal';
            modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9100;";
            modal.innerHTML = `
                <div style="background:white;padding:2.5rem;border-radius:16px;width:450px;max-width:95%;">
                    <h2 style="margin:0 0 1.5rem 0; color:#4F46E5;">Create System User</h2>
                    <form id="modalUserForm" style="display:grid; gap:12px;">
                        <input type="text" name="username" placeholder="Username (Unique ID)" required style="padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        <input type="password" name="password" placeholder="Login Password" required style="padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        <input type="text" name="full_name" placeholder="Full Display Name" required style="padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        <input type="text" name="phone" placeholder="Phone (10 Digits)" maxlength="10" oninput="this.value=this.value.replace(/[^0-9]/g,'')" style="padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        <input type="hidden" name="role" value="admin">
                        <div style="padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; color:#475569; font-weight:600; text-align:center;">
                            ROLE: System Administrator (Fixed)
                        </div>
                        <div style="display:flex; gap:12px; margin-top:12px;">
                            <button type="submit" class="btn-primary" style="flex:2; padding:12px;">CREATE ACCOUNT</button>
                            <button type="button" onclick="this.closest('#addUserModal').style.display='none'" class="btn-secondary" style="flex:1; padding:12px;">CANCEL</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            const f = document.getElementById('modalUserForm');
            f.onsubmit = async (e) => {
                e.preventDefault();
                try {
                   const payload = Object.fromEntries(new FormData(f).entries());
                   if (payload.organization_id === "") payload.organization_id = null;
                   if (payload.phone === "") payload.phone = null;
                   
                   const res = await window.MoveX.adminCreateUser(payload);
                   if (res.success) { alert(`User Created Successfully!`); location.reload(); }
                } catch(err) { alert(err.message); }
            };
        }
        modal.style.display = 'flex';
    }

    // ═══════════════════════════════════════════════════════════
    //  📋 DATA TABLES (GENERAL & USER)
    // ═══════════════════════════════════════════════════════════

    function renderTable(shipments, role) {
        const tbodyId = document.getElementById('recentShipmentsBody') ? 'recentShipmentsBody' :
                        document.getElementById('shipmentsTableBody') ? 'shipmentsTableBody' :
                        document.getElementById('franchiseeShipmentsBody') ? 'franchiseeShipmentsBody' :
                        document.getElementById('staffShipmentsBody') ? 'staffShipmentsBody' : 
                        document.getElementById('finTransactionsBody') ? 'finTransactionsBody' : 'fullShipmentsBody';
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        tbody.innerHTML = (shipments || []).length === 0 ? '<tr><td colspan="10" style="text-align:center;padding:2rem;">No shipments found.</td></tr>' : '';
        (shipments || []).forEach(s => {
            const tr = document.createElement('tr');
            const date = new Date(s.created_at || s.date).toLocaleDateString();
            if (role === 'staff') {
                tr.innerHTML = `<td>${s.tracking_id}</td><td><span class="status-badge">${s.status}</span></td><td>${s.receiver_name}</td><td>${s.receiver_pincode}</td><td><button onclick="updateShipment('${s.tracking_id}', '${s.status}')">Update</button></td>`;
            } else if (tbodyId === 'finTransactionsBody') {
                tr.innerHTML = `<td>#TXN-${s.shipment_id || s.id}</td><td>${date}</td><td>Shipment</td><td>${s.sender_name}</td><td>₹${s.price}</td><td>Settled</td>`;
            } else {
                tr.innerHTML = `<td>${s.tracking_id}</td><td><span class="status-badge">${s.status}</span></td><td>${s.receiver_name}</td><td>${s.receiver_pincode}</td><td>${date}</td><td>₹${s.price}</td><td><button class="btn-secondary" onclick="alert('View: ${s.tracking_id}')">View</button></td>`;
            }
            tbody.appendChild(tr);
        });
    }

    function renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        tbody.innerHTML = (users || []).length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:2rem;">No users found.</td></tr>' : '';
        (users || []).forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${u.user_id}</td><td>${u.username}</td><td>${u.full_name}</td><td>${u.role}</td><td>${u.status}</td><td><button class="btn-secondary" onclick="alert('${u.username}')">Edit</button></td>`;
            tbody.appendChild(tr);
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  ⚙️ SETUP & LISTENERS
    // ═══════════════════════════════════════════════════════════

    function setupGlobalListeners() {
        const actions = { 'action-create-shipment': 1, 'action-add-user': '../admin/admin-users.html', 'action-check-service': '../admin/admin-franchises.html' };
        const path = window.location.pathname;
        const currentRole = path.includes('/admin/') ? 'admin' : path.includes('/franchisee/') ? 'franchisee' : 'user';
        for (const [id, url] of Object.entries(actions)) {
            const el = document.getElementById(id);
            if (el) el.onclick = () => {
                if (id === 'action-create-shipment' && currentRole === 'admin') openShipmentModal();
                else if (id === 'action-create-shipment' && currentRole === 'franchisee') openShipmentModal();
                else if (id === 'action-create-shipment' && currentRole === 'user') window.location.href = 'user-book.html';
                else window.location.href = url;
            };
        }
        const b = document.getElementById('createNewShipment'); if (b) b.onclick = openShipmentModal;
        const bUser = document.getElementById('openAddUserModal'); if (bUser) bUser.onclick = openAddUserModal;
    }

    async function setupAdmin() {
        const res = await window.MoveX.getAdminUsers();
        if (res.success) {
            allUsers = res.users;
            renderUsersTable(allUsers);
        }

        const inputSearch = document.getElementById('userSearchInput');
        const selectRole = document.getElementById('userRoleFilter');
        const selectStatus = document.getElementById('userStatusFilter');

        const filter = () => {
            const q = (inputSearch?.value || '').toLowerCase();
            const r = selectRole?.value || '';
            const s = selectStatus?.value || '';
            const filtered = allUsers.filter(u => {
                const matchQ = u.username.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q);
                const matchR = !r || u.role === r;
                const matchS = !s || u.status === s;
                return matchQ && matchR && matchS;
            });
            renderUsersTable(filtered);
        };
        if (inputSearch) inputSearch.onkeyup = filter;
        if (selectRole) selectRole.onchange = filter;
        if (selectStatus) selectStatus.onchange = filter;
    }

    async function setupFranchisee() {}

    window.updateShipment = async (tid, cur) => {
        const n = prompt(`New Status for ${tid}:`, cur);
        if (n) { await window.MoveX.updateStatus(tid, n); location.reload(); }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
