// js/auth-api.js

(function () {
  'use strict';

  // Auto-detect: localhost for dev, Koyeb for production
  const API_BASE = window.location.hostname === 'localhost'
    ? ''
    : 'https://presidential-fly-movex-237428a4.koyeb.app';

  let isProcessing = false;

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      background: ${type === 'success'
        ? '#10b981'
        : type === 'error'
          ? '#ef4444'
          : '#3b82f6'};
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

  function triggerConfetti() {
    if (typeof createConfetti === 'function') {
      createConfetti();
    }
  }

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

  function setupCardFlip() {
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const flipper = document.getElementById('cardFlipper');
    const showForgot = document.getElementById('show-forgot');
    const forgotForm = document.getElementById('forgotForm');
    const resetForm = document.getElementById('resetForm');
    const loginForm = document.getElementById('loginForm');
    const backToLogin = document.getElementById('back-to-login');
    const backToLogin2 = document.getElementById('back-to-login-2');

    // Dynamic Height Adjustment Helper
    const updateHeight = () => {
      if (!flipper) return;
      const isFlipped = flipper.classList.contains('flipped');
      const loginCard = document.getElementById('loginCard');
      const registerCard = document.getElementById('registerCard');
      const verticalFlipper = document.getElementById('verticalFlipper');

      if (loginCard && registerCard && verticalFlipper) {
        let height;
        const isForgotFlipped = verticalFlipper.classList.contains('flipped-vertical');
        const forgotCard = document.getElementById('forgotCard');

        if (isFlipped) {
          // Register Mode
          height = registerCard.offsetHeight;
        } else if (isForgotFlipped && forgotCard) {
          // Forgot Mode
          height = forgotCard.offsetHeight;
        } else {
          // Login Mode
          height = loginCard.offsetHeight;
        }

        flipper.style.height = height + 'px';
        if (verticalFlipper) verticalFlipper.style.height = '100%';

        // Also set wrapper min-height to ensure no clipping
        const wrapper = document.getElementById('cardWrapper');
        if (wrapper) wrapper.style.minHeight = height + 'px';

        // TOGGLE SCROLLING:
        if (isFlipped) {
          document.body.style.overflowY = 'auto';
          document.documentElement.style.overflowY = 'auto';
        } else {
          // Force scroll top before locking
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;

          // Lock after short delay to ensure scroll happened
          setTimeout(() => {
            document.body.style.overflowY = 'hidden';
            document.documentElement.style.overflowY = 'hidden';
          }, 20);
        }
      }
    };

    if (showRegister && flipper) {
      showRegister.addEventListener('click', e => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'instant' });
        flipper.classList.add('flipped');
        setTimeout(updateHeight, 50);
      });
    }

    if (showLogin && flipper) {
      showLogin.addEventListener('click', e => {
        e.preventDefault();
        // Unlock first
        document.body.style.overflowY = 'auto';
        document.documentElement.style.overflowY = 'auto';
        // Scroll Top
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        flipper.classList.remove('flipped');

        // Update height and lock later
        setTimeout(updateHeight, 50);
      });
    }

    // Forgot Password Vertical Flip
    const verticalFlipper = document.getElementById('verticalFlipper');
    if (showForgot && verticalFlipper) {
      showForgot.addEventListener('click', e => {
        e.preventDefault();

        // Ensure form is visible and reset
        const fForm = document.getElementById('forgotForm');
        const qDiv = document.getElementById('forgot-security-questions');
        const nextBtn = document.getElementById('forgotNextBtn');
        const verifyBtn = document.getElementById('forgotBtn');
        const userInp = document.getElementById('forgot-username');

        if (fForm) {
          fForm.style.display = 'block';
          fForm.style.opacity = '1';
        }
        if (qDiv) qDiv.style.display = 'none';
        if (nextBtn) {
          nextBtn.style.display = 'flex'; // Use flex for centering
          nextBtn.classList.remove('loading');
        }
        if (verifyBtn) verifyBtn.style.display = 'none';
        if (userInp) {
          userInp.disabled = false;
          userInp.value = '';
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'instant' });
        // Flip Vertical
        verticalFlipper.classList.add('flipped-vertical');

        // Force update height immediately and after delay
        updateHeight();
        setTimeout(updateHeight, 50);
        setTimeout(updateHeight, 300); // multiple checks
      });
    }

    // Back to Login from Forgot (Vertical Flip Back)
    if (backToLogin && verticalFlipper) {
      backToLogin.addEventListener('click', e => {
        e.preventDefault();
        // Unlock first
        document.body.style.overflowY = 'auto';
        document.documentElement.style.overflowY = 'auto';
        // Scroll Top
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        verticalFlipper.classList.remove('flipped-vertical');

        // Lock later
        setTimeout(updateHeight, 50);
      });
    }

    // Back to Login from Reset (Vertical Flip Back)
    if (backToLogin2 && verticalFlipper) {
      backToLogin2.addEventListener('click', e => {
        e.preventDefault();
        // Unlock first
        document.body.style.overflowY = 'auto';
        document.documentElement.style.overflowY = 'auto';
        // Scroll Top
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        verticalFlipper.classList.remove('flipped-vertical');

        // Lock later
        setTimeout(updateHeight, 50);
      });
    }




    // Initial height set
    setTimeout(updateHeight, 100);
    window.addEventListener('resize', updateHeight);
  }

  function saveSessionAndRedirect(user, token) {
    const session = {
      isLoggedIn: true,
      role: user.role,
      username: user.username,
      token,
      loginTime: Date.now()
    };

    // Keep key name compatible with dashboards
    sessionStorage.setItem(
      'movexsecuresession',
      JSON.stringify({ data: session })
    );

    const dashboards = {
      admin: 'admin/dashboard',
      franchisee: 'dashboards/franchisee',
      staff: 'dashboards/staff',
      user: 'dashboards/user',
      customer: 'dashboards/customer'
    };

    const target = dashboards[user.role] || 'dashboards/user';
    window.location.href = target;
  }

  function setupLoginForm() {
    const form = document.getElementById('loginForm');
    const btn = document.getElementById('loginBtn');

    if (!form || !btn) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (isProcessing) return;

      const usernameInput = document.getElementById('login-username');
      const passwordInput = document.getElementById('login-password');
      const username = usernameInput?.value.trim();
      const password = passwordInput?.value;
      const roleInput = document.querySelector('input[name="login-role"]:checked');
      const role = roleInput?.value;

      if (!username || !password) {
        showNotification('Please fill username and password.', 'error');
        return;
      }

      if (!role) {
        showNotification('Please select your role.', 'error');
        return;
      }

      isProcessing = true;
      btn.classList.add('loading');

      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Required for cross-origin cookies
          body: JSON.stringify({ username, password, role })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg = data.message || 'Login failed. Check your credentials.';
          showNotification(msg, 'error');
          return;
        }

        showNotification('Login successful!', 'success');
        triggerConfetti();

        // Store session for cross-origin token auth fallback
        const user = data.user || {};
        const token = data.token || '';
        const session = {
          isLoggedIn: true,
          role: user.role,
          username: user.username,
          token,
          loginTime: Date.now()
        };
        sessionStorage.setItem('movexsecuresession', JSON.stringify({ data: session }));

        setTimeout(() => {
          const dashboards = {
            admin: 'admin/dashboard',
            franchisee: 'dashboards/franchisee',
            staff: 'dashboards/staff',
            user: 'dashboards/user',
            customer: 'dashboards/customer'
          };
          const target = dashboards[user.role] || 'dashboards/user';
          window.location.href = target;
        }, 800);
      } catch (err) {
        console.error('Login error:', err);
        showNotification('Cannot reach server. Is backend running on port 4000?', 'error');
      } finally {
        btn.classList.remove('loading');
        isProcessing = false;
      }
    });
  }

  function setupRegisterForm() {
    const form = document.getElementById('registerForm');
    const btn = document.getElementById('registerBtn');
    if (!form || !btn) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (isProcessing) return;

      const usernameInput = document.getElementById('register-username');
      const nameInput = document.getElementById('register-name');
      const phoneInput = document.getElementById('register-phone');
      const passwordInput = document.getElementById('register-password');
      const confirmInput = document.getElementById('register-confirm-password');
      const roleInput = document.querySelector('input[name="register-role"]:checked');

      const q1Input = document.getElementById('reg-q1');
      const q2Input = document.getElementById('reg-q2');
      const q3Input = document.getElementById('reg-q3');

      const username = usernameInput?.value.trim();
      const fullName = nameInput?.value.trim();
      const phone = phoneInput?.value.trim();
      const password = passwordInput?.value;
      const confirmPassword = confirmInput?.value;
      const role = roleInput?.value;
      const q1 = q1Input?.value.trim();
      const q2 = q2Input?.value.trim();
      const q3 = q3Input?.value.trim();

      // UI-only validation
      if (!username || !fullName || !phone || !password || !confirmPassword || !role || !q1 || !q2 || !q3) {
        showNotification('Please fill all fields, including security questions.', 'error');
        return;
      }

      // Indian Phone Validation (+91 optional, 10 digits starting 6-9)
      const phoneRegex = /^(\+91[\-\s]?)?[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        showNotification('Please enter a valid Indian phone number.', 'error');
        return;
      }

      if (password !== confirmPassword) {
        showNotification('Passwords do not match.', 'error');
        return;
      }
      if (password.length < 8) {
        showNotification('Password must be at least 8 characters.', 'error');
        return;
      }

      isProcessing = true;
      btn.classList.add('loading');

      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username,
            full_name: fullName,
            phone,
            password,
            role,  // Send selected role to backend
            securityAnswers: { q1, q2, q3 }
          })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg = data.message || 'Registration failed. Please try again.';
          showNotification(msg, 'error');
          return;
        }

        showNotification(data.message || 'Registration successful. Please log in.', 'success');
        triggerConfetti();

        const flipper = document.getElementById('cardFlipper');
        if (flipper) {
          setTimeout(() => flipper.classList.remove('flipped'), 800);
        }
      } catch (err) {
        console.error('Registration error:', err);
        showNotification('Cannot reach server. Is backend running on port 4000?', 'error');
      } finally {
        btn.classList.remove('loading');
        isProcessing = false;
      }
    });
  }

  function setupForgotForm() {
    const form = document.getElementById('forgotForm');
    const nextBtn = document.getElementById('forgotNextBtn');
    const verifyBtn = document.getElementById('forgotBtn');
    const questionsDiv = document.getElementById('forgot-security-questions');

    if (!form || !nextBtn || !verifyBtn) return;

    // Reset UI state when opening form
    const resetUI = () => {
      questionsDiv.style.display = 'none';
      nextBtn.style.display = 'block';
      verifyBtn.style.display = 'none';
      document.getElementById('forgot-username').disabled = false;
      // clear inputs
      ['forgot-a1', 'forgot-a2', 'forgot-a3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    };

    // STEP 1: Click Next -> Validate username exists (mock or real check if needed, but here we just proceed to show questions)
    // Actually, good UX is to verify user exists and load their questions if dynamic, but questions are static here.
    // So we just show the questions.
    nextBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('forgot-username');
      const username = usernameInput?.value.trim();

      if (!username) {
        showNotification('Please enter your username first.', 'error');
        return;
      }

      // Check User Eligibility (User Request: Show error if Admin/Staff/Franchisee)
      nextBtn.classList.add('loading');
      try {
        const res = await fetch(`${API_BASE}/api/auth/forgot-password-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          // e.g. "User not found" or "Contact Administrator"
          showNotification(data.message || 'Error verifying account.', 'error');
          return;
        }

        // If eligible
        questionsDiv.style.display = 'block';
        nextBtn.style.display = 'none';
        verifyBtn.style.display = 'block';
        usernameInput.disabled = true; // Lock username

      } catch (err) {
        console.error('Check eligibility error:', err);
        showNotification('Error connecting to server.', 'error');
      } finally {
        nextBtn.classList.remove('loading');
      }
    });

    // STEP 2: Verify & Reset
    // We hijacked the form submit for the verification step
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (isProcessing) return; // Prevent double submit

      const usernameInput = document.getElementById('forgot-username');
      const username = usernameInput?.value.trim();

      const q1 = document.getElementById('forgot-a1').value.trim();
      const q2 = document.getElementById('forgot-a2').value.trim();
      const q3 = document.getElementById('forgot-a3').value.trim();

      if (!q1 || !q2 || !q3) {
        showNotification('Please answer all security questions.', 'error');
        return;
      }

      isProcessing = true;
      verifyBtn.classList.add('loading');

      try {
        const res = await fetch(`${API_BASE}/api/auth/reset-password-security`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username,
            securityAnswers: { q1, q2, q3 }
          })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          showNotification(data.message || 'Verification failed.', 'error');
          verifyBtn.classList.remove('loading');
          isProcessing = false;
          return;
        }

        // Success! We get a temp token or we simply proceed to reset password screen with the token
        // Let's assume backend returns { resetToken: '...' }
        const resetToken = data.resetToken;

        showNotification('Verification successful! Set your new password.', 'success');

        // Switch to Reset Form
        const resetForm = document.getElementById('resetForm');
        const tokenInput = document.getElementById('reset-token');

        if (tokenInput) {
          tokenInput.value = resetToken;
          // Hide the token input since it's auto-filled? User might be confused. 
          // Better to leave it or hide it. Let's hide the input group for token if auto-filled.
          tokenInput.parentElement.parentElement.style.display = 'none';
        }

        form.style.display = 'none';

        // Also update headers
        document.getElementById('forgotWelcome').style.display = 'none';
        // We can reuse loginWelcome or create a new header for Reset, but strict UI not requested.

        if (resetForm) resetForm.style.display = 'block';

      } catch (err) {
        console.error('Security verify error:', err);
        showNotification('Error connecting to server.', 'error');
      } finally {
        verifyBtn.classList.remove('loading');
        isProcessing = false;
      }
    });

    // Hook into Show Forgot to reset UI
    const showForgotBtn = document.getElementById('show-forgot');
    if (showForgotBtn) {
      showForgotBtn.addEventListener('click', resetUI);
    }
  }

  function setupResetForm() {
    const form = document.getElementById('resetForm');
    const btn = document.getElementById('resetBtn');
    if (!form || !btn) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (isProcessing) return;

      const tokenInput = document.getElementById('reset-token');
      const passwordInput = document.getElementById('reset-password');
      const token = tokenInput?.value.trim();
      const password = passwordInput?.value;

      if (!token || !password) {
        showNotification('Please enter token and new password.', 'error');
        return;
      }
      if (password.length < 8) {
        showNotification('Password must be at least 8 characters.', 'error');
        return;
      }

      isProcessing = true;
      btn.classList.add('loading');
      try {
        const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showNotification(data.message || 'Reset failed. Please try again.', 'error');
          return;
        }
        showNotification('Password has been reset. Please log in.', 'success');
        form.style.display = 'none';
        const forgotForm = document.getElementById('forgotForm');
        if (forgotForm) forgotForm.style.display = 'none';
      } catch (err) {
        console.error('Reset password error:', err);
        showNotification('Reset failed. Please try again.', 'error');
      } finally {
        btn.classList.remove('loading');
        isProcessing = false;
      }
    });
  }



  function setupMfaModal() {
    const mfaModal = document.getElementById('mfaModal');
    const mfaVerifyBtn = document.getElementById('mfaVerifyBtn');
    const mfaCancelBtn = document.getElementById('mfaCancelBtn');
    const mfaInputs = document.querySelectorAll('.mfa-digit');

    mfaInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value && index < mfaInputs.length - 1) {
          mfaInputs[index + 1].focus();
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          mfaInputs[index - 1].focus();
        }
      });
    });

    if (mfaCancelBtn) {
      mfaCancelBtn.addEventListener('click', () => {
        if (mfaModal) mfaModal.style.display = 'none';
        mfaInputs.forEach(input => input.value = '');
      });
    }

    if (mfaVerifyBtn) {
      mfaVerifyBtn.addEventListener('click', async () => {
        const code = Array.from(mfaInputs).map(i => i.value).join('');
        if (code.length !== 6) {
          showNotification('Please enter all 6 digits', 'error');
          return;
        }

        const pendingUserId = sessionStorage.getItem('mfa_pending_user');
        if (!pendingUserId) {
          showNotification('Session expired. Please login again.', 'error');
          mfaModal.style.display = 'none';
          return;
        }

        try {
          const res = await fetch(`${API_BASE}/api/mfa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userId: pendingUserId, code })
          });

          const data = await res.json();
          if (!res.ok) {
            showNotification(data.message || 'Invalid code', 'error');
            return;
          }

          const pendingSession = JSON.parse(sessionStorage.getItem('mfa_pending_session') || '{}');
          sessionStorage.setItem('movexsecuresession', JSON.stringify({ data: pendingSession }));
          sessionStorage.removeItem('mfa_pending_user');
          sessionStorage.removeItem('mfa_pending_session');
          mfaModal.style.display = 'none';

          showNotification('Login successful!', 'success');
          triggerConfetti();

          const dashboards = {
            admin: 'admin/dashboard',
            franchisee: 'dashboards/franchisee',
            staff: 'dashboards/staff',
            user: 'dashboards/user',
            customer: 'dashboards/customer'
          };
          const target = dashboards[pendingSession.role] || 'dashboards/user';
          setTimeout(() => window.location.href = target, 800);
        } catch (err) {
          console.error('MFA verify error:', err);
          showNotification('Verification failed', 'error');
        }
      });
    }
  }



  function init() {
    const loginForm = document.getElementById('loginForm');
    const forgotForm = document.getElementById('forgotForm');
    const resetForm = document.getElementById('resetForm');
    if (loginForm) loginForm.style.display = 'block';
    if (forgotForm) forgotForm.style.display = 'none';
    if (resetForm) resetForm.style.display = 'none';

    setupCardFlip();
    setupPasswordToggles();
    setupLoginForm();
    setupRegisterForm();
    setupForgotForm();
    setupResetForm();

    // Check for URL errors (from backend redirects)
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const authMsg = urlParams.get('auth_message');

    if (error || authMsg) {
      const messages = {
        'unauthorized': 'Please log in to continue.',
        'invalid_session': 'Session expired. Please log in again.',
        'role_mismatch': 'Access denied: Role mismatch.',
        'logout_success': 'Logged out successfully.'
      };
      const msg = authMsg || messages[error] || 'Authentication error.';
      // Delay slightly to ensure UI is ready
      setTimeout(() => showNotification(msg, 'error'), 500);

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    console.log('MoveX API auth initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
