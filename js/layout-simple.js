/**
 * LAYOUT SIMPLE - DEACTIVATED TOGGLE
 */

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    // Sidebar is now static and fixed.
    if (sidebar) sidebar.classList.remove('collapsed', 'active');
    
    console.log('[Layout] Sidebars are now static.');
});
