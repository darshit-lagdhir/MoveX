/* ═══════════════════════════════════════════════════════════
   MOVEX AUTH UI LAYER - UNTRUSTED ENVIRONMENT

   OFFLINE MODE: Collects input and calls SecureAuth.authenticate
   ONLINE MODE: Will only collect input and display responses

   Last Updated: 2025-12-15 (Cleaned structure / fixed IDs)
   ═══════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    const AuthUI = (function() {
        let isProcessing = false;
        const UI_DELAY_MS = 300;

        async function init() {
            attachInputListeners();
            attachFormHandler();
            console.log('✅ Auth UI initialized');

            if (window.MoveXDebugLog) {
                window.MoveXDebugLog.log('✅ Auth UI initialized', 'success');
            }
        }

        // Input listeners
        function attachInputListeners() {
            const usernameInput = document.getElementById('login-username');
            const passwordInput = document.getElementById('login-password');

            if (usernameInput) {
                usernameInput.addEventListener('input', () =>
                    clearFieldError('login-username')
                );
            }

            if (passwordInput) {
                passwordInput.addEventListener('input', () =>
                    clearFieldError('login-password')
                );
            }

            const roleInputs = document.querySelectorAll('input[name="login-role"]');
            roleInputs.forEach(input => {
                input.addEventListener('change', () => clearRoleError());
            });
        }

        // Form handler
        function attachFormHandler() {
            const loginForm = document.querySelector('.login-form');
            if (!loginForm) {
                console.error('❌ Login form not found!');
                if (window.MoveXDebugLog) {
                    window.MoveXDebugLog.log('❌ Login form not found!', 'error');
                }
                return;
            }

            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleAuthRequest();
            });

            console.log('✅ Form handler attached');
        }

        // Main authentication handler
        async function handleAuthRequest() {
            if (isProcessing) return;

            const usernameInput = document.getElementById('login-username');
            const passwordInput = document.getElementById('login-password');
            const selectedRole  = document.querySelector('input[name="login-role"]:checked');
            const loginBtn      = document.getElementById('loginBtn');

            clearAllErrors();

            const username = usernameInput?.value.trim() || '';
            const password = passwordInput?.value || '';
            const role     = selectedRole?.value || '';

            if (window.MoveXDebugLog) {
                window.MoveXDebugLog.clear();
                window.MoveXDebugLog.log('🔐 Login attempt started', 'info');
                window.MoveXDebugLog.log(`Username: ${username}`, 'info');
                window.MoveXDebugLog.log(`Role: ${role}`, 'info');
            }

            // Basic validation – NO SecureAuth yet
            if (!username) {
                showFieldError('login-username', 'Username is required');
                return;
            }

            if (!password) {
                showFieldError('login-password', 'Password is required');
                return;
            }

            if (!role || role.trim().length === 0) {
                showFieldError('login-role', 'Please select a role');
                return;
            }

            // Now we really process
            isProcessing = true;
            setLoadingState(loginBtn, true);

            // Show button state
            let originalBtnText = null;
            if (loginBtn) {
                const btnContent = loginBtn.querySelector('.btn-text');
                if (btnContent) {
                    originalBtnText = btnContent.textContent;
                    btnContent.textContent = 'Verifying...';
                }
            }

            try {
                if (!window.SecureAuth) {
                    throw new Error('SecureAuth not loaded');
                }

                if (window.MoveXDebugLog) {
                    window.MoveXDebugLog.log('✅ SecureAuth found', 'success');
                    window.MoveXDebugLog.log('📤 Calling SecureAuth.authenticate()...', 'info');
                }

                const result = await window.SecureAuth.authenticate({
                    username,
                    password,
                    role
                });

                await new Promise(resolve => setTimeout(resolve, UI_DELAY_MS));

                if (window.MoveXDebugLog) {
                    window.MoveXDebugLog.log(
                        `📥 Auth result: ${result.success ? 'SUCCESS' : 'FAILURE'}`,
                        result.success ? 'success' : 'error'
                    );
                }

                if (result.success) {
                    await showSuccessAnimation();
                    // Redirect handled by SecureAuth
                } else {
                    showGenericError();
                    setLoadingState(loginBtn, false);
                    if (window.MoveXDebugLog) {
                        window.MoveXDebugLog.log('❌ Invalid credentials', 'error');
                    }
                }

                if (passwordInput) passwordInput.value = '';

            } catch (error) {
                console.error('Auth request error:', error);
                if (window.MoveXDebugLog) {
                    window.MoveXDebugLog.log(`❌ Error: ${error.message}`, 'error');
                }
                await new Promise(resolve => setTimeout(resolve, UI_DELAY_MS));
                showGenericError();
                setLoadingState(loginBtn, false);
            } finally {
                isProcessing = false;

                // Restore button text
                if (loginBtn) {
                    const btnContent = loginBtn.querySelector('.btn-text');
                    if (btnContent && originalBtnText) {
                        btnContent.textContent = originalBtnText;
                    }
                }

                // Ensure button is usable again if still on login page
                if (window.location.pathname.includes('index.html') ||
                    window.location.pathname === '/' ) {
                    setLoadingState(loginBtn, false);
                }
            }
        }

        // UI feedback helpers
        function showFieldError(fieldId, message) {
            const input = document.getElementById(fieldId);
            if (input) {
                input.classList.add('error');
                input.style.borderColor = '#ff3860';

                let errorDiv = input.parentElement.querySelector('.error-message');
                if (!errorDiv) {
                    errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.style.cssText =
                        'color: #ff3860; font-size: 12px; margin-top: 4px;';
                    input.parentElement.appendChild(errorDiv);
                }
                errorDiv.textContent = message;
                errorDiv.style.display = 'block';
            }
        }

        function showGenericError() {
            showFieldError(
                'login-username',
                'Invalid credentials - check username, password, and role'
            );
            const loginCard = document.querySelector('.login-card');
            if (loginCard) {
                loginCard.style.animation = 'shake 0.5s ease';
                setTimeout(() => loginCard.style.animation = '', 500);
            }
        }

        function clearFieldError(fieldId) {
            const input = document.getElementById(fieldId);
            if (input) {
                input.classList.remove('error');
                input.style.borderColor = '';
                const errorDiv = input.parentElement.querySelector('.error-message');
                if (errorDiv) {
                    errorDiv.style.display = 'none';
                }
            }
        }

        function clearRoleError() {
            const roleError = document.querySelector('.role-selector .error-message');
            if (roleError) {
                roleError.style.display = 'none';
            }
        }

        function clearAllErrors() {
            ['login-username', 'login-password'].forEach(clearFieldError);
            clearRoleError();
        }

        function setLoadingState(button, loading) {
            if (!button) return;
            button.classList.toggle('loading', loading);
            button.disabled = loading;
        }

        async function showSuccessAnimation() {
            const loginCard = document.querySelector('.login-card');
            if (loginCard) {
                loginCard.style.animation = 'successPulse 0.6s ease';
            }
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        return { init };
    })();

    // SIMPLE, SAFE PASSWORD TOGGLE
    (function() {
        document.addEventListener('DOMContentLoaded', function() {
            const toggles = document.querySelectorAll('.password-toggle');
            toggles.forEach(btn => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (!input) return;

                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    btn.classList.toggle('is-visible', isPassword);
                });
            });
        });
    })();

    // Initialize after SecureAuth is ready
    async function initWithSecurity() {
        if (window.SecureAuth && typeof window.SecureAuth.initialize === 'function') {
            try {
                await window.SecureAuth.initialize();
            } catch (e) {
                console.error('SecureAuth init failed in UI layer:', e);
            }
        }
        AuthUI.init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWithSecurity);
    } else {
        initWithSecurity();
    }
})();
