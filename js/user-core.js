
/**
 * User (Customer) Core Logic
 * Handles API calls for Customer Dashboard
 */

const UserCore = {
    allShipments: [],

    // Initialize based on current page
    init: function (view) {
        console.log('UserCore: Initializing view', view);
        if (view === 'dashboard') {
            this.loadStats();
            this.loadRecentShipments();
        } else if (view === 'shipments') {
            this.loadFullShipmentsList();
        } else if (view === 'track') {
            // Handle tracking specific ID if present in URL
            const urlParams = new URLSearchParams(window.location.search);
            const tid = urlParams.get('tid');
            if (tid) this.trackShipment(tid);
        }
    },

    // Load Dashboard Stats
    loadStats: function () {
        const hTotal = document.getElementById('kpi-user-total');
        const hActive = document.getElementById('kpi-user-active');
        const hDelivered = document.getElementById('kpi-user-delivered');

        if (!hTotal) return;

        fetch(`${API_URL}/api/dashboard/user/stats`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    hTotal.textContent = data.stats.totalShipments || 0;
                    hActive.textContent = data.stats.activeShipments || 0;
                    hDelivered.textContent = data.stats.deliveredShipments || 0;
                }
            })
            .catch(err => console.error('Error loading stats:', err));
    },

    // Load Recent Shipments for Dashboard
    loadRecentShipments: function () {
        const tbody = document.getElementById('recentShipmentsBody');
        if (!tbody) return;

        fetch(`${API_URL}/api/dashboard/user/shipments`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.renderShipmentsTable(data.shipments.slice(0, 5), 'recentShipmentsBody');
                }
            })
            .catch(err => console.error('Error loading shipments:', err));
    },

    // Load Full Shipments List
    loadFullShipmentsList: function () {
        const tbody = document.getElementById('fullShipmentsBody');
        if (!tbody) return;

        fetch(`${API_URL}/api/dashboard/user/shipments`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.allShipments = data.shipments;
                    this.renderShipmentsTable(data.shipments, 'fullShipmentsBody');
                }
            })
            .catch(err => console.error('Error loading shipments:', err));
    },

    renderShipmentsTable: function (shipments, tbodyId) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        tbody.innerHTML = '';

        if (shipments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-secondary);">No shipments found.</td></tr>`;
            return;
        }

        shipments.forEach(s => {
            const row = document.createElement('tr');
            const statusClass = s.status.toLowerCase().replace(/ /g, '-');
            const dateStr = s.date ? new Date(s.date).toLocaleDateString() : 'N/A';
            row.innerHTML = `
                <td style="font-weight:600; color: var(--brand-primary);">${s.tracking_id}</td>
                <td><span class="status-badge status-${statusClass}">${s.status}</span></td>
                <td>${s.receiver || 'N/A'}</td>
                <td>${s.destination || 'N/A'}</td>
                <td>${dateStr}</td>
                <td style="font-weight:600;">₹${s.price || 0}</td>
                <td>
                    <button class="btn-sm btn-secondary" onclick="window.UserCore.viewDetails('${s.tracking_id}')">Details</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    viewDetails: function (tid) {
        window.location.href = `user-track.html?tid=${tid}`;
    },

    getShipmentDetails: async function (tid) {
        try {
            const res = await fetch(`${API_URL}/api/dashboard/user/shipments`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                return data.shipments.find(s => s.id === tid);
            }
            return null;
        } catch (err) {
            console.error('Fetch error:', err);
            return null;
        }
    }
};

window.UserCore = UserCore;
