/* ═══════════════════════════════════════════════════════════
   MOVEX CARD FLIP AUTHENTICATION
   Persistent Login/Registration with Beautiful Animation
   ═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const STORAGE_KEY = 'movex_users_db';
    let isProcessing = false;

    function init() {
        setupCardFlip();
        setupPasswordToggles();
        setupLoginForm();
        setupRegisterForm();
        console.log('✅ Card flip authentication initialized');
    }

    // Setup card flip animation
    function setupCardFlip() {
        const showRegister = document.getElementById('show-register');
        const showLogin = document.getElementById('show-login');
        const flipper = document.getElementById('cardFlipper');

        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
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

    // Setup password visibility toggles
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

                const username = document.getElementById('login-username').value.trim();
                const password = document.getElementById('login-password').value;
                const role = document.querySelector('input[name="login-role"]:checked')?.value;

                if (!username || !password || !role) {
                    showNotification('❌ Please fill all fields', 'error');
                    return;
                }

                isProcessing = true;
                btn.classList.add('loading');

                await new Promise(resolve => setTimeout(resolve, 800));

                const result = await handleLogin(username, password, role);

                if (result.success) {
                    showNotification('✅ Login successful!', 'success');
                    triggerConfetti();

                    setTimeout(() => {
                        const dashboards = {
                            admin: 'admin/dashboard.html',
                            franchisee: 'dashboards/franchisee.html',
                            staff: 'dashboards/staff.html',
                            user: 'dashboards/user.html'
                        };
                        window.location.href = dashboards[role] || 'dashboards/user.html';
                    }, 1500);
                } else {
                    showNotification('❌ ' + result.message, 'error');
                    btn.classList.remove('loading');
                    isProcessing = false;
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

                const username = document.getElementById('register-username').value.trim();
                const password = document.getElementById('register-password').value;
                const confirmPassword = document.getElementById('register-confirm-password').value;
                const role = 'user'; // Role hardcoded - selection removed

                if (!username || !password || !confirmPassword) {
                    showNotification('❌ Please fill all fields', 'error');
                    return;
                }

                if (password !== confirmPassword) {
                    showNotification('❌ Passwords do not match', 'error');
                    return;
                }

                if (password.length < 6) {
                    showNotification('❌ Password must be at least 6 characters', 'error');
                    return;
                }

                isProcessing = true;
                btn.classList.add('loading');

                await new Promise(resolve => setTimeout(resolve, 1000));

                const result = await handleRegister(username, password, role);

                if (result.success) {
                    showNotification('✅ Registration successful! Please login.', 'success');
                    triggerConfetti();

                    // Clear form
                    form.reset();

                    // Flip back to login after 1.5 seconds
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
            });
        }
    }

    // Handle login
    async function handleLogin(username, password, role) {
        const users = getUsersFromStorage();
        const user = users.find(u => u.username === username);

        if (!user) {
            return { success: false, message: 'User not found' };
        }

        if (user.password !== password) {
            return { success: false, message: 'Invalid password' };
        }

        if (user.role !== role) {
            return { success: false, message: 'Invalid role' };
        }

        // Store session
        sessionStorage.setItem('movex_session', JSON.stringify({
            username: user.username,
            role: user.role,
            loginTime: Date.now()
        }));

        return { success: true };
    }

    // Handle registration
    async function handleRegister(username, password, role) {
        const users = getUsersFromStorage();

        // Check if username already exists
        if (users.find(u => u.username === username)) {
            return { success: false, message: 'Username already exists' };
        }

        // Create new user
        const newUser = {
            username: username,
            password: password, // In production, this should be hashed
            role: role,
            createdAt: Date.now()
        };

        users.push(newUser);
        saveUsersToStorage(users);

        return { success: true };
    }

    // Get users from localStorage
    function getUsersFromStorage() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    // Save users to localStorage
    function saveUsersToStorage(users) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }

    // Show notification
    function showNotification(message, type = 'info') {
        // Create notification element
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

    // Trigger confetti animation
    function triggerConfetti() {
        if (typeof createConfetti === 'function') {
            createConfetti();
        }
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// Add slide animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
