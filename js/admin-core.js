/**
 * MoveX Admin Core Logic
 * Simplified for Exam
 */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('admin-dashboard.html')) initDashboard();
    else if (path.includes('admin-shipments.html')) loadShipments();
    else if (path.includes('admin-users.html')) loadUsers();
    else if (path.includes('admin-franchises.html')) loadFranchises();
});

async function initDashboard() {
    try {
        const data = await window.MoveX.getStats('admin');
        if (data.success) {
            document.getElementById('kpi-total-shipments').textContent = data.stats.totalShipments;
            document.getElementById('kpi-total-revenue').textContent = '₹' + data.stats.totalRevenue.toLocaleString();
            document.getElementById('kpi-total-users').textContent = data.stats.totalUsers;
        }
    } catch (err) { console.error(err); }
}

async function loadShipments() {
    const tbody = document.getElementById('shipmentsTableBody');
    if (!tbody) return;
    try {
        const data = await window.MoveX.getShipments('admin');
        if (data.success) {
            tbody.innerHTML = '';
            for (let s of data.shipments) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:700;">${s.tracking_id}</td>
                    <td><span class="status-badge status-${s.status.toLowerCase().replace(/ /g, '-')}">${s.status}</span></td>
                    <td>${s.sender}</td>
                    <td>${s.origin}</td>
                    <td>${s.destination}</td>
                    <td>${new Date(s.date).toLocaleDateString()}</td>
                    <td>₹${s.price}</td>
                    <td><button class="btn-secondary" onclick="alert('${s.tracking_id}: ${s.status}')">View</button></td>
                `;
                tbody.appendChild(tr);
            }
        }
    } catch (err) { console.error(err); }
}

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    try {
        const data = await window.MoveX.getAdminUsers();
        if (data.success) {
            tbody.innerHTML = '';
            for (let u of data.users) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${u.user_id}</td>
                    <td style="font-weight:700;">${u.username}</td>
                    <td>${u.full_name || 'N/A'}</td>
                    <td>${u.role}</td>
                    <td><span class="status-badge status-${u.status.toLowerCase()}">${u.status}</span></td>
                    <td><button class="btn-secondary" onclick="resetPassword('${u.username}')">Reset</button></td>
                `;
                tbody.appendChild(tr);
            }
        }
    } catch (err) { console.error(err); }
}

window.resetPassword = async function(username) {
    const newPass = prompt(`Enter new password for ${username}:`);
    if (newPass) {
        try {
            const data = await window.MoveX.resetUserPassword(username, newPass);
            if (data.success) alert('Password Reset Successful!');
        } catch (err) { console.error(err); }
    }
};

async function loadFranchises() {
    const tbody = document.getElementById('franchiseTableBody');
    if (!tbody) return;
    try {
        const data = await window.MoveX.getAdminFranchises();
        if (data.success) {
            tbody.innerHTML = '';
            for (let f of data.franchises) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${f.organization_id}</td>
                    <td style="font-weight:700;">${f.name}</td>
                    <td>${f.pincodes || 'N/A'}</td>
                    <td><span class="status-badge status-${f.status.toLowerCase()}">${f.status}</span></td>
                    <td><button class="btn-secondary" onclick="alert('Franchise Details: ${f.name}')">Info</button></td>
                `;
                tbody.appendChild(tr);
            }
        }
    } catch (err) { console.error(err); }
}
