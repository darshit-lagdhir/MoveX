/**
 * MoveX User Core Logic
 * Simplified for Exam
 */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('user-dashboard.html')) initDashboard();
    else if (path.includes('user-shipments.html')) loadShipments();
    else if (path.includes('user-book.html')) initBookingForm();
});

async function initDashboard() {
    try {
        const data = await window.MoveX.getStats('user');
        if (data.success) {
            const totalE = document.getElementById('kpi-user-total');
            const activeE = document.getElementById('kpi-user-active');
            const deliveredE = document.getElementById('kpi-user-delivered');

            if (totalE) totalE.textContent = data.stats.totalShipments;
            if (activeE) activeE.textContent = data.stats.activeShipments;
            if (deliveredE) deliveredE.textContent = data.stats.deliveredShipments;
            
            loadRecentShipments();
        }
    } catch (err) { console.error(err); }
}

async function loadRecentShipments() {
    const tbody = document.getElementById('recentShipmentsBody');
    if (!tbody) return;
    try {
        const data = await window.MoveX.getShipments('user');
        if (data.success) {
            renderTable(data.shipments.slice(0, 5), 'recentShipmentsBody');
        }
    } catch (err) { console.error(err); }
}

async function loadShipments() {
    const tbody = document.getElementById('fullShipmentsBody');
    if (!tbody) return;
    try {
        const data = await window.MoveX.getShipments('user');
        if (data.success) {
            renderTable(data.shipments, 'fullShipmentsBody');
        }
    } catch (err) { console.error(err); }
}

function renderTable(shipments, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (shipments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem;">No shipments found.</td></tr>';
        return;
    }

    for (let s of shipments) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700;">${s.tracking_id}</td>
            <td><span class="status-badge status-${s.status.toLowerCase().replace(/ /g, '-')}">${s.status}</span></td>
            <td>${s.receiver}</td>
            <td>${s.destination}</td>
            <td>${new Date(s.date).toLocaleDateString()}</td>
            <td>₹${s.price || '0'}</td>
            <td><button class="btn-secondary" onclick="alert('Tracking ID: ${s.tracking_id}\\nStatus: ${s.status}')">View</button></td>
        `;
        tbody.appendChild(tr);
    }
}

function initBookingForm() {
    const form = document.getElementById('bookingForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        try {
            const data = await window.MoveX.createShipment(payload);
            if (data.success) {
                alert(`Shipment Booked! Tracking ID: ${data.tracking_id}`);
                window.location.href = 'user-dashboard.html';
            }
        } catch (err) { console.error(err); }
    });
}
