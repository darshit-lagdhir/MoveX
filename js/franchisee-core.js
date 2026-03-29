/**
 * MoveX Franchisee Core Logic
 * Simplified for Exam
 */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('franchisee-dashboard.html')) initDashboard();
    else if (path.includes('franchisee-shipments.html')) loadShipments();
    else if (path.includes('franchisee-assignments.html')) loadAssignments();
});

async function initDashboard() {
    try {
        const data = await window.MoveX.getStats('franchisee');
        if (data.success) {
            const totalE = document.getElementById('kpi-total-shipments');
            const pendingE = document.getElementById('kpi-pending-pickups');
            if (totalE) totalE.textContent = data.stats.totalShipments;
            if (pendingE) pendingE.textContent = data.stats.pendingPickups;
        }
    } catch (err) { console.error(err); }
}

async function loadShipments() {
    const tbody = document.getElementById('shipmentsTableBody');
    if (!tbody) return;

    try {
        const data = await window.MoveX.getShipments('franchisee');
        if (data.success) {
            tbody.innerHTML = '';
            for (let i = 0; i < data.shipments.length; i++) {
                const s = data.shipments[i];
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:700;">${s.tracking_id}</td>
                    <td><span class="status-badge status-${s.status.toLowerCase().replace(/ /g, '-')}">${s.status}</span></td>
                    <td>${s.sender}</td>
                    <td>${s.origin}</td>
                    <td>${s.destination}</td>
                    <td>${new Date(s.date).toLocaleDateString()}</td>
                    <td>₹${s.price}</td>
                    <td>
                        <button class="btn-secondary" onclick="updateShipmentStatus('${s.tracking_id}', '${s.status}')">
                            Status
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        }
    } catch (err) { console.error(err); }
}

window.updateShipmentStatus = async function(id, current) {
    const status = prompt(`Update status for ${id}\n\nCurrent: ${current}\n\nEnter new status (e.g. In Transit, Delivered, Hold):`, current);
    if (status && status !== current) {
        try {
            const data = await window.MoveX.updateStatus('franchisee', id, status);
            if (data.success) {
                alert('Updated!');
                loadShipments();
            }
        } catch (err) { console.error(err); }
    }
};

async function loadAssignments() {
    const tbody = document.getElementById('shipmentsTableBody');
    if (!tbody) return;

    try {
        const [shipData, staffData] = await Promise.all([
            window.MoveX.getAvailableAssignments(),
            window.MoveX.getStaff()
        ]);

        if (shipData.success) {
            tbody.innerHTML = '';
            const staffList = staffData.staff || [];

            for (let i = 0; i < shipData.shipments.length; i++) {
                const s = shipData.shipments[i];
                let staffOptions = '<option value="">-- Choose Staff --</option>';
                for (let staff of staffList) {
                    staffOptions += `<option value="${staff.user_id}">${staff.full_name}</option>`;
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:700;">${s.tracking_id}</td>
                    <td>${s.receiver}</td>
                    <td>${s.destination}</td>
                    <td><select id="assign-${s.tracking_id}" class="form-input">${staffOptions}</select></td>
                    <td>
                        <button class="btn-primary" onclick="assignTask('${s.tracking_id}')">
                            Assign
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        }
    } catch (err) { console.error(err); }
}

window.assignTask = async function(tracking_id) {
    const staff_id = document.getElementById(`assign-${tracking_id}`).value;
    if (!staff_id) return alert('Please select a staff member first!');

    try {
        const data = await window.MoveX.assignShipment(staff_id, tracking_id);
        if (data.success) {
            alert('Successfully assigned task!');
            loadAssignments();
        }
    } catch (err) { console.error(err); }
};

// CREATE SHIPMENT (Simple)
const createBtn = document.getElementById('createNewShipment');
if (createBtn) {
    createBtn.addEventListener('click', () => {
        // Simple logic for an exam: Open a prompt-based creation or redirect
        alert('Please fill the booking form to create a shipment.');
        // For actual booking, redirect to a form if available, or use the modal-less prompt strategy
    });
}
