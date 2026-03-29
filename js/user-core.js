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
            document.getElementById('kpi-user-total').textContent = data.stats.totalShipments;
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
    
    for (let s of shipments) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700;">${s.tracking_id}</td>
            <td><span class="status-badge status-${s.status.toLowerCase().replace(/ /g, '-')}">${s.status}</span></td>
            <td>${s.receiver}</td>
            <td>${s.destination}</td>
            <td>${new Date(s.date).toLocaleDateString()}</td>
            <td>₹${s.price}</td>
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
            const res = await fetch('http://localhost:4000/api/dashboard/user/shipments/create', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Username': sessionStorage.getItem('username')
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                alert(`Shipment Booked! Tracking ID: ${data.tracking_id}`);
                window.location.href = 'user-dashboard.html';
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) { alert('Network Error'); }
    });
}
