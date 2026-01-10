/**
 * MoveX Frontend Configuration
 * This acts like a .env file for the browser.
 */

window.MoveXConfig = {
    // ⬇️ CHANGE THIS URL IF YOUR BACKEND MOVES ⬇️
    API_URL: 'https://movex-ffqu.onrender.com',

    // Feature Flags (Optional)
    ENABLE_LOGS: true
};

// Auto-Override for Local Development (Don't touch this)
if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    console.log('🔧 Local Development Detected: Using localhost:4000');
    window.MoveXConfig.API_URL = 'http://localhost:4000';
}
