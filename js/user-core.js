
/**
 * User (Customer) Core Logic
 * Handles API calls for Customer Dashboard
 */

const UserCore = {
    allShipments: [],

    // Initialize based on current page
    init: function (view) {
        console.log('UserCore: Initializing view', view);

        // Always try to load user info for top bar if not already there
        this.updateTopBar();

        if (view === 'dashboard' || view === '') {
            this.loadStats();
            this.loadRecentShipments();
        } else if (view === 'shipments') {
            this.loadFullShipmentsList();
        } else if (view === 'track') {
            const urlParams = new URLSearchParams(window.location.search);
            const tid = urlParams.get('tid');
            if (tid) this.loadTrackingDetails(tid);
        } else if (view === 'profile') {
            this.loadProfileData();
        } else if (view === 'book') {
            this.initBookingForm();
        }
    },

    updateTopBar: function () {
        if (window.MoveXUser) {
            const nameEl = document.getElementById('topBarUserName');
            const roleEl = document.getElementById('topBarRole');
            if (nameEl) nameEl.textContent = window.MoveXUser.full_name || window.MoveXUser.username;
            if (roleEl) roleEl.textContent = 'Customer';
        }
    },

    // Load Dashboard Stats
    loadStats: function () {
        const hTotal = document.getElementById('kpi-user-total');
        const hActive = document.getElementById('kpi-user-active');
        const hDelivered = document.getElementById('kpi-user-delivered');

        if (!hTotal) return;

        fetch(`${window.API_URL}/api/dashboard/user/stats`, { credentials: 'include' })
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

        fetch(`${window.API_URL}/api/dashboard/user/shipments`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.renderShipmentsTable(data.shipments.slice(0, 5), 'recentShipmentsBody');
                } else {
                    this.showTableError('recentShipmentsBody', data.error || 'Failed to load shipments');
                }
            })
            .catch(err => {
                console.error('Error loading shipments:', err);
                this.showTableError('recentShipmentsBody', 'Network error. Please try again.');
            });
    },

    // Load Full Shipments List
    loadFullShipmentsList: function () {
        const tbody = document.getElementById('fullShipmentsBody');
        if (!tbody) return;

        fetch(`${window.API_URL}/api/dashboard/user/shipments`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.allShipments = data.shipments;
                    this.renderShipmentsTable(data.shipments, 'fullShipmentsBody');
                    this.initSearch();
                } else {
                    this.showTableError('fullShipmentsBody', data.error || 'Failed to load shipments');
                }
            })
            .catch(err => {
                console.error('Error loading shipments:', err);
                this.showTableError('fullShipmentsBody', 'Network error. Please try again.');
            });
    },

    initSearch: function () {
        const searchInput = document.getElementById('shipmentSearch');
        if (searchInput && !searchInput.dataset.listener) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = this.allShipments.filter(s =>
                    s.tracking_id.toLowerCase().includes(query) ||
                    (s.receiver && s.receiver.toLowerCase().includes(query)) ||
                    (s.destination && s.destination.toLowerCase().includes(query))
                );
                this.renderShipmentsTable(filtered, 'fullShipmentsBody');
            });
            searchInput.dataset.listener = 'true';
        }
    },

    renderShipmentsTable: function (shipments, tbodyId) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!shipments || shipments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 3rem; color: var(--text-secondary);">No shipments found.</td></tr>`;
            return;
        }

        shipments.forEach(s => {
            const row = document.createElement('tr');
            const statusClass = s.status ? s.status.toLowerCase().replace(/ /g, '-') : 'pending';
            const dateStr = s.date ? new Date(s.date).toLocaleDateString() : 'N/A';
            row.innerHTML = `
                <td style="font-weight:600; color: var(--brand-primary);">${s.tracking_id}</td>
                <td><span class="status-badge status-${statusClass}">${s.status || 'Pending'}</span></td>
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

    showTableError: function (tbodyId, message) {
        const tbody = document.getElementById(tbodyId);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 3rem; color: var(--danger);">${message}</td></tr>`;
        }
    },

    viewDetails: function (tid) {
        // If SPA is active, use navigateTo, otherwise window.location
        if (window.navigateTo) {
            window.navigateTo(`user-track.html?tid=${tid}`);
        } else {
            window.location.href = `user-track.html?tid=${tid}`;
        }
    },

    // --- TRACKING PAGE LOGIC ---
    loadTrackingDetails: async function (tid) {
        const container = document.getElementById('trackingContent');
        if (!container) return;

        try {
            const res = await fetch(`${window.API_URL}/api/dashboard/user/shipments`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                const shipment = data.shipments.find(s => s.id === tid || s.tracking_id === tid);
                if (shipment) {
                    this.renderTrackingUI(shipment);
                } else {
                    container.innerHTML = `<div class="card" style="padding:3rem; text-align:center;"><h3>Shipment Not Found</h3><p>We couldn't find a shipment with ID ${tid}</p></div>`;
                }
            } else {
                container.innerHTML = `<div class="card" style="padding:3rem; text-align:center;"><h3 style="color:var(--danger)">Error</h3><p>${data.error || 'Failed to fetch details'}</p></div>`;
            }
        } catch (err) {
            console.error(err);
            container.innerHTML = `<div class="card" style="padding:3rem; text-align:center;"><h3>Connection Error</h3><p>Could not reach the server.</p></div>`;
        }
    },

    renderTrackingUI: function (s) {
        const container = document.getElementById('trackingContent');
        if (!container) return;

        const statusClass = s.status ? s.status.toLowerCase().replace(/ /g, '-') : 'pending';
        container.innerHTML = `
            <div class="card" style="padding: 2.5rem; margin-bottom: 2rem; border-top: 4px solid var(--brand-primary);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <div>
                        <span style="font-size: 0.875rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">TRACKING ID</span>
                        <h2 style="margin: 0.25rem 0; font-size: 2rem; font-weight: 800; color: var(--text-primary);">${s.tracking_id}</h2>
                    </div>
                    <div class="status-badge status-${statusClass}" style="padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 700;">
                        ${s.status}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border-default);">
                    <div>
                        <h4 style="margin-bottom: 1rem; color: var(--text-secondary);">SHIPMENT INFO</h4>
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: var(--text-secondary);">Weight:</span>
                                <span style="font-weight: 600;">${s.weight} kg</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: var(--text-secondary);">Booked On:</span>
                                <span style="font-weight: 600;">${new Date(s.date).toLocaleDateString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: var(--text-secondary);">Est. Delivery:</span>
                                <span style="font-weight: 600;">${s.estimated_delivery ? new Date(s.estimated_delivery).toLocaleDateString() : 'TBD'}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 style="margin-bottom: 1rem; color: var(--text-secondary);">ROUTE</h4>
                        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                            <div style="position: relative; padding-left: 2rem;">
                                <div style="position: absolute; left: 0; top: 0; width: 12px; height: 12px; border-radius: 50%; background: var(--brand-primary);"></div>
                                <div style="position: absolute; left: 5px; top: 12px; width: 2px; height: 30px; background: var(--border-default);"></div>
                                <div style="font-weight: 600;">${s.origin}</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">Origin</div>
                            </div>
                            <div style="position: relative; padding-left: 2rem;">
                                <div style="position: absolute; left: 0; top: 0; width: 12px; height: 12px; border-radius: 50%; background: var(--success);"></div>
                                <div style="font-weight: 600;">${s.destination}</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">Destination</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="padding: 2.5rem;">
                <h3 style="margin-top: 0; margin-bottom: 2rem; font-weight: 700;">Journey History</h3>
                <div id="journeyTimeline" style="display: flex; flex-direction: column; gap: 2rem;">
                    <div style="display: flex; gap: 1.5rem;">
                        <div style="width: 100px; color: var(--text-secondary); font-size: 0.875rem; padding-top: 0.25rem;">
                            ${new Date(s.date).toLocaleDateString()}<br>${new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style="flex: 1; padding-bottom: 1.5rem; border-left: 2px solid var(--brand-primary); padding-left: 2rem; position: relative;">
                            <div style="position: absolute; left: -7px; top: 5px; width: 12px; height: 12px; border-radius: 50%; background: var(--surface-primary); border: 3px solid var(--brand-primary);"></div>
                            <div style="font-weight: 700; font-size: 1.1rem;">Shipment Booked</div>
                            <p style="margin: 0.25rem 0; color: var(--text-secondary);">Order successfully received at ${s.origin}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // --- PROFILE PAGE LOGIC ---
    loadProfileData: async function () {
        try {
            const res = await fetch(`${window.API_URL}/api/me`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                const fullNameInput = document.getElementById('profile_full_name');
                const phoneInput = document.getElementById('profile_phone');
                const usernameInput = document.getElementById('profile_username');

                if (fullNameInput) fullNameInput.value = data.user.full_name || '';
                if (phoneInput) phoneInput.value = data.user.phone || '';
                if (usernameInput) usernameInput.value = data.user.username || '';

                this.initProfileListeners();
            }
        } catch (err) {
            console.error('Failed to load profile:', err);
        }
    },

    initProfileListeners: function () {
        const saveProfileBtn = document.getElementById('btn-save-profile');
        const savePassBtn = document.getElementById('btn-save-password');

        if (saveProfileBtn && !saveProfileBtn.dataset.listener) {
            saveProfileBtn.addEventListener('click', async () => {
                saveProfileBtn.disabled = true;
                saveProfileBtn.textContent = 'Saving...';

                const payload = {
                    full_name: document.getElementById('profile_full_name').value,
                    phone: document.getElementById('profile_phone').value
                };

                try {
                    const res = await fetch(`${window.API_URL}/api/me`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        credentials: 'include'
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Profile updated successfully!');
                        if (window.MoveXUser) window.MoveXUser.full_name = payload.full_name;
                        this.updateTopBar();
                    } else {
                        alert('Error: ' + data.error);
                    }
                } catch (err) {
                    alert('Connection error');
                } finally {
                    saveProfileBtn.disabled = false;
                    saveProfileBtn.textContent = 'Update Profile';
                }
            });
            saveProfileBtn.dataset.listener = 'true';
        }

        if (savePassBtn && !savePassBtn.dataset.listener) {
            savePassBtn.addEventListener('click', async () => {
                const oldPass = document.getElementById('old_password').value;
                const newPass = document.getElementById('new_password').value;
                const confPass = document.getElementById('confirm_password').value;

                if (!oldPass || !newPass) return alert('Please fill passwords');
                if (newPass !== confPass) return alert('Passwords do not match');

                savePassBtn.disabled = true;
                savePassBtn.textContent = 'Updating...';

                try {
                    const res = await fetch(`${window.API_URL}/api/auth/change-password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
                        credentials: 'include'
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Password updated successfully!');
                        document.getElementById('old_password').value = '';
                        document.getElementById('new_password').value = '';
                        document.getElementById('confirm_password').value = '';
                    } else {
                        alert('Error: ' + data.error);
                    }
                } catch (err) {
                    alert('Connection error');
                } finally {
                    savePassBtn.disabled = false;
                    savePassBtn.textContent = 'Save Password';
                }
            });
            savePassBtn.dataset.listener = 'true';
        }
    },

    // --- BOOKING PAGE LOGIC ---
    initBookingForm: function () {
        const form = document.getElementById('bookingForm');
        if (!form) return;

        // 1. Pre-fill Sender Details from Profile
        if (window.MoveXUser) {
            const fields = {
                'sender_name': window.MoveXUser.full_name || window.MoveXUser.username,
                'sender_phone': window.MoveXUser.phone || ''
            };
            Object.keys(fields).forEach(name => {
                const input = form.querySelector(`[name="${name}"]`);
                if (input && !input.value) input.value = fields[name];
            });
        }

        // 2. Live Price Calculation
        const weightInput = document.getElementById('ship_weight');
        const amountInput = document.getElementById('ship_amount');

        if (weightInput && amountInput) {
            const calculatePrice = () => {
                const w = parseFloat(weightInput.value) || 0;
                const price = Math.max(50, Math.ceil(w * 50));
                amountInput.value = price;
            };

            weightInput.addEventListener('input', calculatePrice);
            calculatePrice(); // Initial calculation
        }

        // 3. Form Submission
        if (!form.dataset.listener) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = form.querySelector('button[type="submit"]');
                const originalText = btn.textContent;
                btn.disabled = true;
                btn.textContent = 'Processing...';

                const formData = new FormData(form);
                const payload = Object.fromEntries(formData.entries());

                try {
                    const res = await fetch(`${window.API_URL}/api/dashboard/user/shipments/create`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        credentials: 'include'
                    });
                    const data = await res.json();

                    if (data.success) {
                        // Success Toast/Modal
                        alert(`Shipment Booked Successfully!\n\nTracking ID: ${data.tracking_id}\nBooking Amount: ₹${data.price}`);

                        if (window.navigateTo) window.navigateTo('user-dashboard.html');
                        else window.location.href = 'user-dashboard.html';
                    } else {
                        alert('Error: ' + (data.error || 'Failed to book shipment'));
                    }
                } catch (err) {
                    console.error(err);
                    alert('Network error. Please try again.');
                } finally {
                    btn.disabled = false;
                    btn.textContent = originalText;
                }
            });
            form.dataset.listener = 'true';
        }
    }
};

window.UserCore = UserCore;
window.MoveXAdmin = UserCore; // Fallback for some layout checks
