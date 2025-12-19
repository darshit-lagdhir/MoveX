/* ═══════════════════════════════════════════════════════════
   MOVEX CARD FLIP WITH MAXIMUM SECURITY (FIXED)
   Non-blocking initialization | Graceful fallback
   ═══════════════════════════════════════════════════════════ */

(function() {
    'use strict';
    
    let isProcessing = false;
    let securityInitialized = false;
    
    async function init() {
        // Setup UI immediately (don't wait for security)
        setupCardFlip();
        setupPasswordToggles();
        setupLoginForm();
        setupRegisterForm();
        
        console.log('✅ UI initialized');
        
        // Initialize security in background (non-blocking)
        initializeSecurity().catch(err => {
            console.warn('⚠️ Security initialization delayed:', err);
        });
    }
    
    // Initialize security systems (non-blocking)
    async function initializeSecurity() {
        try {
            // Wait for modules with longer timeout
            await waitForSecurityModules();
            
            // Initialize secure authentication
            if (window.SecureAuth) {
                await window.SecureAuth.initialize();
            }
            
            // Initialize identity manager
            if (window.IdentityManager) {
                await window.IdentityManager.initialize();
            }
            
            securityInitialized = true;
            console.log('✅ Security systems initialized');
        } catch (error) {
            console.warn('⚠️ Security initialization failed, using fallback mode');
            securityInitialized = false;
        }
    }
    
    // Wait for security modules (longer timeout, non-critical)
    function waitForSecurityModules() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 100; // Increased timeout
            
            const checkInterval = setInterval(() => {
                attempts++;
                
                const allLoaded = 
                    window.CryptoEngine &&
                    window.DeviceBinding &&
                    window.VaultManager &&
                    window.SessionManager &&
                    window.ChallengeAuth &&
                    window.AntiTamper &&
                    window.IdentityManager &&
                    window.SecureAuth;
                
                if (allLoaded) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    // Don't reject, just resolve (graceful fallback)
                    resolve();
                }
            }, 100);
        });
    }
    
    // Setup card flip animation (works immediately)
    function setupCardFlip() {
        const showRegister = document.getElementById('show-register');
        const showLogin = document.getElementById('show-login');
        const flipper = document.getElementById('cardFlipper');
        
        if (showRegister) {
            showRegister.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Check if identity already exists (with fallback)
                const identityExists = await checkIdentityExists();
                
                if (identityExists) {
                    showNotification('⚠️ An identity already exists on this device. Please login.', 'error');
                    return;
                }
                
                flipper.classList.add('flipped');
            });
        }
        
        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                flipper.classList.remove('flipped');
            });
        }
    }
    
    // Check if user identity exists (with fallback)
    async function checkIdentityExists() {
        try {
            // Simple check - doesn't require full security initialization
            const vaultData = localStorage.getItem('movex_encrypted_vault');
            if (!vaultData) return false;
            
            const vault = JSON.parse(vaultData);
            const preProvisionedKeys = ['admin', 'franchisee_blr', 'staff_blr01', 'user01', 'customer_abc'];
            
            for (const key in vault.users) {
                if (!preProvisionedKeys.includes(key)) {
                    const user = vault.users[key];
                    if (user && user.verificationBlob) {
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error checking identity:', error);
            return false;
        }
    }
    
    // Setup password toggles
    function setupPasswordToggles() {
        const toggleButtons = document.querySelectorAll('.password-toggle');
        
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                
                if (input) {
                    const type = input.getAttribute('type');
                    input.setAttribute('type', type === 'password' ? 'text' : 'password');
                    btn.classList.toggle('active');
                }
            });
        });
    }
    
    // Setup login form
    function setupLoginForm() {
        const form = document.getElementById('loginForm');
        const btn = document.getElementById('loginBtn');
        
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (isProcessing) return;
                
                const username = document.getElementById('login-username')?.value.trim();
                const password = document.getElementById('login-password')?.value;
                const role = document.querySelector('input[name="login-role"]:checked')?.value;
                
                // Wait for security to initialize (if not ready yet)
                if (!securityInitialized) {
                    // showNotification('⏳ Initializing security...', 'info');
                    await initializeSecurity();
                    
                    if (!securityInitialized) {
                        showNotification('❌ Security initialization failed. Please refresh.', 'error');
                        return;
                    }
                }
                
                // Check if user-created identity exists
                const userIdentityExists = await checkIdentityExists();
                
                if (userIdentityExists) {
                    // User-created identity: username ignored, read from vault
                    if (!password || !role) {
                        showNotification('❌ Please enter password and select role', 'error');
                        return;
                    }
                    
                    isProcessing = true;
                    btn.classList.add('loading');
                    
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    // Authenticate using vault-based method
                    const result = await window.SecureAuth.authenticateVaultBased({
                        password: password,
                        role: role
                    });
                    
                    if (result.success) {
                        showNotification('✅ Login successful!', 'success');
                        triggerConfetti();
                        // Redirect handled by SecureAuth
                    } else {
                        showNotification('❌ Invalid credentials', 'error');
                        btn.classList.remove('loading');
                        isProcessing = false;
                    }
                } else {
                    // Pre-provisioned users: traditional auth
                    if (!username || !password || !role) {
                        showNotification('❌ Please fill all fields', 'error');
                        return;
                    }
                    
                    isProcessing = true;
                    btn.classList.add('loading');
                    
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    const result = await window.SecureAuth.authenticate({
                        username: username,
                        password: password,
                        role: role
                    });
                    
                    if (result.success) {
                        showNotification('✅ Login successful!', 'success');
                        triggerConfetti();
                        // Redirect handled by SecureAuth
                    } else {
                        showNotification('❌ Invalid credentials', 'error');
                        btn.classList.remove('loading');
                        isProcessing = false;
                    }
                }
            });
        }
    }
    
    // Setup registration form
    function setupRegisterForm() {
        const form = document.getElementById('registerForm');
        const btn = document.getElementById('registerBtn');
        const flipper = document.getElementById('cardFlipper');
        
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (isProcessing) return;
                
                // Wait for security to initialize (if not ready yet)
                if (!securityInitialized) {
                    showNotification('⏳ Initializing security...', 'info');
                    await initializeSecurity();
                    
                    if (!securityInitialized) {
                        showNotification('❌ Security initialization failed. Please refresh.', 'error');
                        return;
                    }
                }
                
                // Check if identity already exists
                const identityExists = await checkIdentityExists();
                if (identityExists) {
                    showNotification('❌ Identity already exists on this device', 'error');
                    return;
                }
                
                const username = document.getElementById('register-username')?.value.trim();
                const password = document.getElementById('register-password')?.value;
                const confirmPassword = document.getElementById('register-confirm-password')?.value;
                const role = document.querySelector('input[name="register-role"]:checked')?.value;
                
                // Validation
                if (!username || !password || !confirmPassword || !role) {
                    showNotification('❌ Please fill all fields', 'error');
                    return;
                }
                
                if (username.length < 3) {
                    showNotification('❌ Username must be at least 3 characters', 'error');
                    return;
                }
                
                if (password.length < 8) {
                    showNotification('❌ Password must be at least 8 characters', 'error');
                    return;
                }
                
                if (!/[A-Z]/.test(password)) {
                    showNotification('❌ Password must contain uppercase letter', 'error');
                    return;
                }
                
                if (!/[a-z]/.test(password)) {
                    showNotification('❌ Password must contain lowercase letter', 'error');
                    return;
                }
                
                if (!/[0-9]/.test(password)) {
                    showNotification('❌ Password must contain a number', 'error');
                    return;
                }
                
                if (!/[@#$%^&*!]/.test(password)) {
                    showNotification('❌ Password must contain special character', 'error');
                    return;
                }
                
                if (password !== confirmPassword) {
                    showNotification('❌ Passwords do not match', 'error');
                    return;
                }
                
                isProcessing = true;
                btn.classList.add('loading');
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                try {
                    // Create identity using secure vault system
                    const result = await window.IdentityManager.createIdentity({
                        username: username,
                        password: password,
                        confirmPassword: confirmPassword,
                        role: role
                    });
                    
                    if (result.success) {
                        showNotification('✅ Registration successful! Please login.', 'success');
                        triggerConfetti();
                        
                        // Clear form
                        form.reset();
                        
                        // Flip back to login
                        setTimeout(() => {
                            flipper.classList.remove('flipped');
                            btn.classList.remove('loading');
                            isProcessing = false;
                        }, 1500);
                    } else {
                        showNotification('❌ ' + result.message, 'error');
                        btn.classList.remove('loading');
                        isProcessing = false;
                    }
                } catch (error) {
                    console.error('Registration error:', error);
                    showNotification('❌ Registration failed. Please try again.', 'error');
                    btn.classList.remove('loading');
                    isProcessing = false;
                }
            });
        }
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 12px;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Trigger confetti
    function triggerConfetti() {
        if (typeof createConfetti === 'function') {
            createConfetti();
        }
    }
    
    // Auto-initialize (run immediately)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// Animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
