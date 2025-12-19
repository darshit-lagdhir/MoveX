/* ═══════════════════════════════════════════════════════════
   THEME MANAGER - ALWAYS DEFAULTS TO LIGHT MODE
   ═══════════════════════════════════════════════════════════ */

(function() {
    'use strict';
    
    const themeToggle = document.getElementById('themeToggle');
    
    function init() {
        // IMPORTANT: Always default to light mode on fresh load
        // Only use saved theme if it exists
        const savedTheme = localStorage.getItem('movex_theme');
        
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            // Force light mode as default
            setTheme('light');
        }
        
        // Setup toggle button
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
    }
    
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('movex_theme', theme);
        
        if (themeToggle) {
            themeToggle.setAttribute('aria-label', 
                theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            );
        }
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }
    
    // Initialize immediately
    init();
})();
