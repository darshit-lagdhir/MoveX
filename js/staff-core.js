
/**
 * Staff Core Logic
 * Handles API calls for Staff Dashboard
 * Note: API_URL is defined globally in dashboard-layout.js
 */

const StaffCore = {

    allTasks: [],
    selectedTasks: new Set(),

    // Load Dashboard Stats
    loadStats: function () {
        const hPending = document.getElementById('kpi-pending-hub');
        const hOut = document.getElementById('kpi-out-delivery');
        const hDelivered = document.getElementById('kpi-delivered-today');

        if (!hPending) return; // Not on dashboard page

        fetch(`${API_URL}/api/dashboard/staff/stats`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    hPending.textContent = data.stats.pendingTasks || 0;
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

        fetch(`${API_URL}/api/dashboard/staff/shipments`, { credentials: 'include' })
            .then(res => {
                if (!res.ok) throw new Error(`Server Error: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.success) {
                    this.allTasks = data.shipments;
                    this.selectedTasks.clear();
                    this.renderTasks(data.shipments);
                    this.updateBulkUI();
                    this.bindSelectAll();
                } else {
                    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">${data.error || 'Error loading tasks'}</td></tr>`;
                }
            })
            .catch(err => {
                console.error(err);
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">${err.message}</td></tr>`;
            });
    },

    renderTasks: function (tasks) {
        const tbody = document.getElementById('tasksTableBody');
        tbody.innerHTML = '';
        this.selectedTasks.clear();

        if (tasks.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-secondary);">No tasks assigned currently.</td></tr>`;
            return;
        }

        tasks.forEach(t => {
            const row = document.createElement('tr');
            const statusClass = t.status.toLowerCase().replace(/ /g, '-');
            row.innerHTML = `
                <td><input type="checkbox" class="task-checkbox" value="${t.tracking_id}"></td>
                <td style="font-weight:600; color: var(--brand-primary);">${t.tracking_id}</td>
                <td><span class="status-badge status-${statusClass}">${t.status}</span></td>
                <td>
                    <div style="font-weight:600;">${t.sender || 'N/A'}</div>
                    <div style="font-size:0.75rem; color: var(--text-secondary);">${t.sender_address || ''}</div>
                </td>
                <td>
                    <div style="font-weight:600;">${t.receiver || 'N/A'}</div>
                    <div style="font-size:0.75rem; color: var(--text-secondary);">${t.receiver_address || ''}</div>
                </td>
                <td style="font-weight: 500; color: var(--brand-primary);">${t.receiver_phone || 'N/A'}</td>
                <td>
                    <button class="btn-sm btn-secondary" onclick="window.StaffCore.openModal('${t.tracking_id}')">Update</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Bind checkbox events
        tbody.querySelectorAll('.task-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedTasks.add(e.target.value);
                } else {
                    this.selectedTasks.delete(e.target.value);
                }
                this.updateBulkUI();
            });
        });
    },

    bindSelectAll: function () {
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.onclick = (e) => {
                const checkboxes = document.querySelectorAll('.task-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    if (e.target.checked) {
                        this.selectedTasks.add(cb.value);
                    } else {
                        this.selectedTasks.delete(cb.value);
                    }
                });
                this.updateBulkUI();
            };
        }
    },

    updateBulkUI: function () {
        const countEl = document.getElementById('selectedCount');
        const btn = document.getElementById('bulkUpdateBtn');
        const select = document.getElementById('bulkStatusSelect');

        if (!countEl || !btn) return;

        const count = this.selectedTasks.size;
        countEl.textContent = `${count} selected`;

        if (count > 0 && select && select.value) {
            btn.disabled = false;
            btn.textContent = `Update ${count} Parcel${count > 1 ? 's' : ''}`;
        } else {
            btn.disabled = true;
            btn.textContent = count > 0 ? 'Select Status' : 'Select Parcels';
        }
    },

    // Bulk Update Status
    bulkUpdateStatus: async function () {
        const select = document.getElementById('bulkStatusSelect');
        const newStatus = select ? select.value : '';
        const trackingIds = Array.from(this.selectedTasks);

        if (!newStatus || trackingIds.length === 0) {
            alert('Please select parcels and a status');
            return;
        }

        const btn = document.getElementById('bulkUpdateBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Updating...';
        }

        try {
            const res = await fetch(`${API_URL}/api/dashboard/staff/shipments/bulk-update`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tracking_ids: trackingIds, status: newStatus })
            });
            const data = await res.json();

            if (data.success) {
                alert(`Successfully updated ${trackingIds.length} parcels to "${newStatus}"`);
                this.loadTasks(); // Refresh
                this.loadStats(); // Refresh stats too
            } else {
                alert('Error: ' + (data.error || 'Failed to update'));
            }
        } catch (err) {
            console.error(err);
            alert('Network Error');
        } finally {
            if (btn) {
                btn.disabled = false;
            }
            this.updateBulkUI();
        }
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

    // --- Modal Logic (Single Update) ---

    currentUpdateId: null,

    openModal: function (trackingId) {
        this.currentUpdateId = trackingId;
        const t = this.allTasks.find(item => item.tracking_id === trackingId);

        if (t) {
            document.getElementById('detSenderName').textContent = t.sender || 'N/A';
            document.getElementById('detSenderPhone').textContent = t.sender_phone || 'N/A';
            document.getElementById('detSenderAddress').textContent = t.sender_address || 'N/A';

            document.getElementById('detReceiverName').textContent = t.receiver || 'N/A';
            document.getElementById('detReceiverPhone').textContent = t.receiver_phone || 'N/A';
            document.getElementById('detReceiverAddress').textContent = t.receiver_address || 'N/A';

            document.getElementById('detWeight').textContent = t.weight || '0';
            document.getElementById('detDate').textContent = t.date ? new Date(t.date).toLocaleDateString() : 'N/A';

            document.getElementById('modalTrackingId').textContent = 'Tracking ID: ' + trackingId;

            const select = document.getElementById('newStatusSelect');
            if (select) {
                // Pre-select current status if it exists in options
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value.toLowerCase() === t.status.toLowerCase()) {
                        select.selectedIndex = i;
                        break;
                    }
                }
            }
        }

        const modal = document.getElementById('statusModal');
        modal.style.display = 'flex';
    },

    closeModal: function () {
        this.currentUpdateId = null;
        document.getElementById('statusModal').style.display = 'none';
    },

    submitModalUpdate: function () {
        if (!this.currentUpdateId) return;

        const newStatus = document.getElementById('newStatusSelect').value;
        const btn = document.querySelector('#statusModal .btn-primary');
        const originalText = btn ? btn.textContent : 'Update Status';
        if (btn) {
            btn.textContent = 'Updating...';
            btn.disabled = true;
        }

        fetch(`${API_URL}/api/dashboard/staff/shipments/update-status`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tracking_id: this.currentUpdateId,
                status: newStatus
            })
        })
            .then(res => res.json())
            .then(data => {
                if (btn) {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }

                if (data.success) {
                    // Refresh list
                    this.loadTasks();
                    this.loadStats(); // Refresh stats too
                    this.closeModal();
                    alert('Status Updated Successfully!');
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(err => {
                console.error(err);
                if (btn) {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
                alert('Network Error');
            });
    }

};

// Listen for bulk select change
document.addEventListener('DOMContentLoaded', () => {
    const bulkSelect = document.getElementById('bulkStatusSelect');
    if (bulkSelect) {
        bulkSelect.addEventListener('change', () => {
            StaffCore.updateBulkUI();
        });
    }
});

window.StaffCore = StaffCore;
