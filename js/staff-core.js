/**
 * MoveX Staff Core Logic
 * Simplified for Exam
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('staff-dashboard.html')) {
        initDashboard();
    } else if (window.location.pathname.includes('staff-assignments.html')) {
        loadTasks();
    }
});

async function initDashboard() {
    try {
        const data = await window.MoveX.getStats('staff');
        if (data.success) {
            document.getElementById('kpi-pending-hub').textContent = data.stats.pendingTasks;
            document.getElementById('kpi-delivered-today').textContent = data.stats.deliveredToday;
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadTasks() {
    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) return;

    try {
        const data = await window.MoveX.getShipments('staff');
        if (data.success) {
            tbody.innerHTML = '';
            
            if (data.shipments.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem;">No tasks assigned yet.</td></tr>';
                return;
            }

            for (let i = 0; i < data.shipments.length; i++) {
                const s = data.shipments[i];
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${i + 1}</td>
                    <td style="font-weight:700;">${s.tracking_id}</td>
                    <td><span class="status-badge status-${s.status.toLowerCase().replace(/ /g, '-')}">${s.status}</span></td>
                    <td>${s.sender}</td>
                    <td>${s.receiver}</td>
                    <td>${s.phone}</td>
                    <td>
                        <button class="btn-primary" onclick="openUpdateModal('${s.tracking_id}', '${s.status}')">
                           Update
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

window.openUpdateModal = function(id, currentStatus) {
    const status = prompt(`Update status for ${id}\n\nCurrent: ${currentStatus}\n\nEnter new status (e.g. Out for Delivery, Delivered, Not Delivered):`, currentStatus);
    if (status && status !== currentStatus) {
        submitStatusUpdate(id, status);
    }
};

async function submitStatusUpdate(id, status) {
    try {
        const data = await window.MoveX.updateStatus('staff', id, status);
        if (data.success) {
            alert('Status updated successfully!');
            loadTasks();
        }
    } catch (err) {
        console.error(err);
    }
}
