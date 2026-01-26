
/**
 * Staff Core Logic
 * Handles API calls for Staff Dashboard
 */

const StaffCore = {

    // Load Dashboard Stats
    loadStats: function () {
        const hPending = document.getElementById('kpi-pending-hub');
        const hOut = document.getElementById('kpi-out-delivery');
        const hDelivered = document.getElementById('kpi-delivered-today');

        if (!hPending) return; // Not on dashboard page

        fetch(`${API_URL}/staff/stats`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    hPending.textContent = data.stats.pendingAtHub || 0;
                    hOut.textContent = data.stats.outForDelivery || 0;
                    hDelivered.textContent = data.stats.deliveredToday || 0;
                }
            })
            .catch(err => console.error(err));
    },

    // Load Tasks (Assignments)
    loadTasks: function () {
        const tbody = document.getElementById('tasksTableBody');
        if (!tbody) return;

        fetch(`${API_URL}/staff/shipments`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.renderTasks(data.shipments);
                    this.allTasks = data.shipments; // Save for filtering
                } else {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error loading tasks</td></tr>`;
                }
            })
            .catch(err => {
                console.error(err);
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Network Error</td></tr>`;
            });
    },

    renderTasks: function (tasks) {
        const tbody = document.getElementById('tasksTableBody');
        tbody.innerHTML = '';

        if (tasks.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">No tasks assigned currently.</td></tr>`;
            return;
        }

        tasks.forEach(t => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight:600; color: var(--brand-primary);">${t.tracking_id}</td>
                <td><span class="status-badge ${t.status.toLowerCase().replace(' ', '-')}">${t.status}</span></td>
                <td>${t.origin || 'N/A'}</td>
                <td>${t.destination || 'N/A'}</td>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>
                    <!-- No Action -->
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    filterTasks: function (query) {
        if (!this.allTasks) return;
        const q = query.toLowerCase();
        const filtered = this.allTasks.filter(t =>
            t.tracking_id.toLowerCase().includes(q) ||
            (t.sender && t.sender.toLowerCase().includes(q)) ||
            (t.receiver && t.receiver.toLowerCase().includes(q))
        );
        this.renderTasks(filtered);
    },

    // Scanner Logic
    searchShipment: function () {
        // Check if ID is in URL (from Assignments page) or input
        let id = document.getElementById('scanInput').value.trim();
        if (!id) {
            // Check URL
            const urlParams = new URLSearchParams(window.location.search);
            id = urlParams.get('id');
        }

        if (!id) {
            if (!document.getElementById('scanInput').value) alert('Please enter a Tracking ID');
            return;
        }

        // Auto-fill input if empty
        document.getElementById('scanInput').value = id;

        fetch(`${API_URL}/staff/search/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Show result card
                    document.getElementById('scanResult').style.display = 'block';
                    document.getElementById('actionArea').style.display = 'block';

                    const s = data.shipment;
                    document.getElementById('res-id').textContent = s.tracking_id;
                    document.getElementById('res-status').textContent = s.status.replace(/_/g, ' ').toUpperCase();
                    document.getElementById('res-sender').textContent = s.sender;
                    document.getElementById('res-receiver').textContent = s.receiver;
                    document.getElementById('res-dest').textContent = s.destination;

                    // Reset buttons
                    document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('selected'));
                    document.getElementById('confirmUpdateBtn').disabled = true;

                } else {
                    alert('Shipment not found');
                    document.getElementById('scanResult').style.display = 'none';
                    document.getElementById('actionArea').style.display = 'none';
                }
            })
            .catch(err => {
                console.error(err);
                alert('Error searching shipment');
            });
    },

    submitStatusUpdate: function () {
        const id = document.getElementById('res-id').textContent;
        const status = window.getSelectedStatus(); // Defined in HTML

        if (!status) {
            alert('Please select a status');
            return;
        }

        fetch(`${API_URL}/staff/shipments/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tracking_id: id, status: status })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('Status Updated Successfully!');
                    window.location.href = 'assignments.html'; // Go back to list
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(err => {
                console.error(err);
                alert('Network Error');
            });
    }

};

window.StaffCore = StaffCore;

// Auto-run search if ID is in URL on scan page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('scan.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('id')) {
            window.StaffCore.searchShipment();
        }
    }
});
