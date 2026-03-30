/**
 * MOVEX MASTER SCRIPT - V5
 * Final Consolidation - Strict Schema - Search Logic
 */

(function () {
    'use strict';

    let allShipments = [];

    async function init() {
        const path = window.location.pathname;
        const role = path.includes('admin') ? 'admin' : path.includes('franchisee') ? 'franchisee' : 'user';

        try {
            const raw = sessionStorage.getItem('movexsecuresession');
            if (!raw) return;
            const session = JSON.parse(raw);

            // 1. Identity Headers
            const tName = document.getElementById('topBarUserName');
            const tRole = document.getElementById('topBarRole');
            if (tName) tName.textContent = session.full_name || session.username;
            if (tRole) tRole.textContent = role.charAt(0).toUpperCase() + role.slice(1);

            // 2. Fetch Core Data
            const [statsRes, shipRes] = await Promise.all([
                window.MoveX.getStats().catch(() => ({success:false})),
                window.MoveX.getShipments().catch(() => ({success:false}))
            ]);

            if (statsRes.success) renderStats(statsRes.stats);
            if (shipRes.success) {
                allShipments = shipRes.shipments;
                renderTable(allShipments, role);
            }

            // 3. Setup Listeners
            setupListeners();
            if (role === 'admin') setupAdmin();

            // 4. Inject Logout
            injectLogout();

        } catch (err) { console.error('[MoveX] Init Error:', err); }
    }

    function renderStats(stats) {
        const m = {
            'kpi-total-shipments': stats.totalShipments,
            'kpi-total-revenue': stats.totalRevenue ? `₹${stats.totalRevenue.toLocaleString()}` : '0',
            'kpi-total-users': stats.totalUsers,
            'kpi-total-franchises': stats.totalFranchises,
            'kpi-active-areas': (stats.totalFranchises || 0) * 8
        };
        for (const [id, val] of Object.entries(m)) {
            const el = document.getElementById(id);
            if (el) el.textContent = val ?? '0';
        }
    }

    function renderTable(data, role) {
        const tbody = document.getElementById('shipmentsTableBody') || document.getElementById('recentShipmentsBody') || document.getElementById('fullShipmentsBody');
        if (!tbody) return;
        tbody.innerHTML = (data || []).length === 0 ? '<tr><td colspan="10" style="text-align:center;padding:2rem;">No shipments found.</td></tr>' : '';
        
        (data || []).forEach(s => {
            const tr = document.createElement('tr');
            const d = new Date(s.created_at).toLocaleDateString();
            const sL = (s.status || '').toLowerCase();
            const sC = sL.includes('transit')?'status-transit':sL.includes('delivery')?'status-out':sL.includes('deliv')?'status-active':sL.includes('return')?'status-return':sL.includes('cancel')?'status-error':'status-warn';
            
            // Standard Table Rows
            tr.innerHTML = `<td>${s.tracking_id}</td><td><span class="status-badge ${sC}">${s.status}</span></td><td>${s.sender_name}</td><td>${s.sender_pincode || '-'}</td><td>${s.receiver_pincode || '-'}</td><td>${d}</td><td>₹${s.price}</td><td><button class="btn-secondary" style="height:auto;padding:4px 8px;font-size:11px;">View</button></td>`;
            tbody.appendChild(tr);
        });
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
        
        const bCheck = document.getElementById('action-check-service');
        if (bCheck) bCheck.onclick = () => window.location.href = 'admin-franchises.html';
    }

    function openModal(type) {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;";
        
        if (type === 'shipment') {
            modal.innerHTML = `<div class="card" style="width:600px;padding:2rem;"><h2 style="margin:0 0 1rem;color:var(--brand-primary);">Book Shipment</h2><form id="mForm" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><input type="text" name="sender_name" placeholder="Sender Name" required><input type="text" name="sender_phone" placeholder="Sender Phone" required maxlength="10"><input type="text" name="sender_pincode" placeholder="Sender Pincode" required maxlength="6"><input type="text" name="receiver_name" placeholder="Receiver Name" required><input type="text" name="receiver_phone" placeholder="Receiver Phone" required maxlength="10"><input type="text" name="receiver_pincode" placeholder="Receiver Pincode" required maxlength="6"><input type="number" name="price" placeholder="Amount" required><input type="number" name="weight" placeholder="Weight (kg)" required><div style="grid-column:span 2;display:flex;gap:10px;margin-top:15px;"><button type="submit" class="btn-primary" style="flex:2;">CREATE SHIPMENT</button><button type="button" class="btn-secondary" onclick="this.closest('.modal-backdrop').remove()" style="flex:1;">CANCEL</button></div></form></div>`;
        } else {
            modal.innerHTML = `<div class="card" style="width:450px;padding:2rem;"><h2 style="margin:0 0 1rem;color:var(--brand-primary);">Create Administrator</h2><form id="mForm" style="display:grid;gap:10px;"><input type="text" name="username" placeholder="Admin Username" required><input type="password" name="password" placeholder="Password" required><input type="text" name="full_name" placeholder="Full Display Name" required><input type="text" name="phone" placeholder="Phone (10 Digits)" required maxlength="10"><input type="hidden" name="role" value="admin"><div style="padding:10px;background:#f8fafc;border-radius:6px;text-align:center;font-weight:700;color:var(--brand-primary);">ROLE: SYSTEM ADMIN</div><div style="display:flex;gap:10px;margin-top:15px;"><button type="submit" class="btn-primary" style="flex:2;">SAVE ADMIN</button><button type="button" class="btn-secondary" onclick="this.closest('.modal-backdrop').remove()" style="flex:1;">CANCEL</button></div></form></div>`;
        }
        document.body.appendChild(modal);
        const f = document.getElementById('mForm');
        f.onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(f).entries());
            const res = type === 'shipment' ? await window.MoveX.createShipment(data) : await window.MoveX.adminCreateUser(data);
            if (res.success) { alert(type==='shipment'?'Shipment Created!':'Admin Created!'); location.reload(); }
            else alert(res.message || 'Creation failed.');
        };
    }

    async function setupAdmin() {
        if (document.getElementById('usersTableBody')) {
            const res = await window.MoveX.getAdminUsers();
            if (res.success) {
                const tb = document.getElementById('usersTableBody');
                tb.innerHTML = res.users.map(u => `<tr><td>${u.user_id}</td><td>${u.username}</td><td>${u.full_name}</td><td>${u.role}</td><td><span class="status-badge status-active">${u.status}</span></td><td>-</td></tr>`).join('');
            }
        }
        if (document.getElementById('franchiseTableBody')) {
            const res = await window.MoveX.getAdminFranchises();
            if (res.success) {
                const tb = document.getElementById('franchiseTableBody');
                tb.innerHTML = res.franchises.map(f => `<tr><td>${f.organization_id}</td><td>${f.name}</td><td>${f.pincodes || 'National'}</td><td><span class="status-badge status-active">${f.status}</span></td><td>-</td></tr>`).join('');
            }
        }
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
