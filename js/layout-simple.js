/**
 * MoveX Simple Layout Script
 * Handles Sidebar toggle and Logout
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sidebar Toggle
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // 2. User Info & Logout
    const username = sessionStorage.getItem('username') || 'User';
    const topBarName = document.getElementById('topBarUserName');
    if (topBarName) topBarName.textContent = username;

    const navRight = document.querySelector('.nav-right');
    if (navRight && !document.getElementById('logoutBtn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logoutBtn';
        logoutBtn.textContent = 'Logout';
        logoutBtn.className = 'btn-secondary';
        logoutBtn.style.padding = '0.5rem 1rem';
        logoutBtn.onclick = () => {
            if (confirm('Logout?')) {
                sessionStorage.clear();
                window.location.href = '/index.html';
            }
        };
        navRight.prepend(logoutBtn);
    }
});
