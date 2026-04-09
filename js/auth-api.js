// js/auth-api.js
(function () {
  'use strict';

  const API_BASE = window.MoveXConfig ? window.MoveXConfig.API_URL : 'http://localhost:4000';
  let isProcessing = false;

  // --- AUTO-REDIRECT ---
  const urlParams = new URLSearchParams(window.location.search);
  if ((['/', '/index.html'].includes(window.location.pathname) || window.location.pathname === '') &&
    !urlParams.has('logout') && !urlParams.has('auth_message')) {
    const session = sessionStorage.getItem('movexsecuresession');
    if (session) {
      try {
        const data = JSON.parse(session);
        if (data && data.data && data.data.username) {
          const storedRole = data.data.role || 'user';
          const dashboards = {
            admin: '/dashboards/admin/admin-dashboard.html',
            franchisee: '/dashboards/franchisee/franchisee-dashboard.html',
            staff: '/dashboards/staff/staff-dashboard.html',
            user: '/dashboards/user/user-dashboard.html'
          };
          window.location.href = dashboards[storedRole] || dashboards.user;
        }
      } catch (e) {
        sessionStorage.removeItem('movexsecuresession');
      }
    }
  }

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
      z-index: 10000;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  function setupCardFlip() {
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const flipper = document.getElementById('cardFlipper');

    if (showRegister && flipper) {
      showRegister.addEventListener('click', e => {
        e.preventDefault();
        flipper.classList.add('flipped');
      });
    }

    if (showLogin && flipper) {
      showLogin.addEventListener('click', e => {
        e.preventDefault();
        flipper.classList.remove('flipped');
      });
    }
  }

  function setupLoginForm() {
    const form = document.getElementById('loginForm');
    const btn = document.getElementById('loginBtn');
    if (!form || !btn) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (isProcessing) return;

      const username = document.getElementById('login-username')?.value.trim();
      const password = document.getElementById('login-password')?.value;
      const role = document.querySelector('input[name="login-role"]:checked')?.value;

      if (!username || !password || !role) {
        showNotification('Please fill all fields and select a role.', 'error');
        return;
      }

      isProcessing = true;
      btn.style.opacity = '0.7';

      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, role })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showNotification(data.message || 'Login failed.', 'error');
          return;
        }

        const session = {
          isLoggedIn: true,
          role: data.user.role,
          username: data.user.username,
          loginTime: Date.now()
        };
        sessionStorage.setItem('movexsecuresession', JSON.stringify(session));
        
        showNotification('Login successful!', 'success');
        setTimeout(() => {
          const dashboards = {
            admin: 'dashboards/admin/admin-dashboard.html',
            franchisee: 'dashboards/franchisee/franchisee-dashboard.html',
            staff: 'dashboards/staff/staff-dashboard.html',
            user: 'dashboards/user/user-dashboard.html'
          };
          window.location.href = dashboards[data.user.role] || dashboards.user;
        }, 800);

      } catch (err) {
        showNotification('Cannot reach server.', 'error');
      } finally {
        isProcessing = false;
        btn.style.opacity = '1';
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

      const username = document.getElementById('register-username')?.value.trim();
      const fullName = document.getElementById('register-name')?.value.trim();
      const phone = document.getElementById('register-phone')?.value.trim();
      const password = document.getElementById('register-password')?.value;
      const confirm = document.getElementById('register-confirm-password')?.value;

        const q1 = document.getElementById('register-q1')?.value.trim();
      const q2 = document.getElementById('register-q2')?.value.trim();
      const q3 = document.getElementById('register-q3')?.value.trim();

      if (!username || !fullName || !phone || !password || !confirm || !q1 || !q2 || !q3) {
        showNotification('Please fill all registration fields, including security questions.', 'error');
        return;
      }

      if (password !== confirm) {
        showNotification('Passwords do not match.', 'error');
        return;
      }

      isProcessing = true;
      btn.style.opacity = '0.7';

      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username, 
            full_name: fullName, 
            phone, 
            password,
            security_answers: { q1, q2, q3 }
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showNotification(data.message || 'Registration failed.', 'error');
          return;
        }

        showNotification('Registration successful! Please log in.', 'success');
        document.getElementById('cardFlipper')?.classList.remove('flipped');
      } catch (err) {
        showNotification('Cannot reach server.', 'error');
      } finally {
        isProcessing = false;
        btn.style.opacity = '1';
      }
    });
  }

  function setupForgotFlow() {
    const btnNext = document.getElementById('btn-forgot-next');
    const btnVerify = document.getElementById('btn-forgot-verify');
    const btnReset = document.getElementById('btn-forgot-reset');

    let recoveryUser = '';
    let recoveryToken = '';

    if (btnNext) {
      btnNext.onclick = async () => {
        recoveryUser = document.getElementById('forgot-username').value.trim();
        if (!recoveryUser) return showNotification('Please enter your username first.', 'error');
        
        try {
          const res = await fetch(`${API_BASE}/api/auth/forgot-password/check-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: recoveryUser })
          });
          const data = await res.json();
          if (data.success) {
            // Move to questions step
            document.getElementById('step1-forgot').style.display = 'none';
            document.getElementById('step2-forgot').style.display = 'block';
          } else {
            showNotification(data.message || 'Error occurred.', 'error');
          }
        } catch (e) {
          showNotification('Cannot reach server.', 'error');
        }
      };
    }

    if (btnVerify) {
      btnVerify.onclick = async () => {
        const q1 = document.getElementById('forgot-a1').value.trim();
        const q2 = document.getElementById('forgot-a2').value.trim();
        const q3 = document.getElementById('forgot-a3').value.trim();

        if (!q1 || !q2 || !q3) return showNotification('Please answer all 3 questions.', 'error');

        try {
          console.log('Verifying answers for:', recoveryUser);
          const res = await fetch(`${API_BASE}/api/auth/forgot-password/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: recoveryUser, answers: { q1, q2, q3 } })
          });
          const data = await res.json();
          if (data.success) {
            recoveryToken = data.token;
            console.log('Recovery proof obtained.');
            showNotification('Identity Verified! Set your new password.', 'success');
            document.getElementById('step2-forgot').style.display = 'none';
            document.getElementById('step3-forgot').style.display = 'block';
          } else {
            console.warn('Verification failed:', data.message);
            showNotification(data.message || 'Answers are incorrect.', 'error');
          }
        } catch (e) { 
          console.error(e);
          showNotification('Verification failed due to a system error.', 'error'); 
        }
      };
    }

    if (btnReset) {
      btnReset.onclick = async () => {
        const pass = document.getElementById('forgot-new-pass').value;
        const confirm = document.getElementById('forgot-confirm-pass').value;
        if (pass !== confirm) return showNotification('Passwords do not match.', 'error');

        try {
          const res = await fetch(`${API_BASE}/api/auth/forgot-password/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: recoveryUser, token: recoveryToken, new_password: pass })
          });
          const data = await res.json();
          if (data.success) {
            showNotification('Password updated! You can login now.', 'success');
            setTimeout(() => location.reload(), 1500);
          } else {
            showNotification(data.message || 'Reset failed.', 'error');
          }
        } catch (e) { showNotification('Reset failed.', 'error'); }
      };
    }
  }

  function init() {
    setupCardFlip();
    setupLoginForm();
    setupRegisterForm();
    setupForgotFlow();
    
    // Simple password toggle
    document.querySelectorAll('.password-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        if (input) {
          input.type = input.type === 'password' ? 'text' : 'password';
        }
      });
    });

    console.log('MoveX Simple Auth Initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
