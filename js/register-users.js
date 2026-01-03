/* ═══════════════════════════════════════════════════════════
   MOVEX IDENTITY MANAGEMENT SYSTEM
   Vault-Based Identity Creation | One-Time Registration
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  window.IdentityManager = (function () {
    const ALLOWED_ROLES = ['user'];
    const REGISTRATION_TIME_MIN = 1500;
    const REGISTRATION_TIME_MAX = 2000;

    let cryptoEngine = null;
    let deviceBinding = null;
    let vaultManager = null;
    let isProcessing = false;

    // Initialize identity management system
    async function initialize() {
      try {
        cryptoEngine = new window.CryptoEngine();
        await cryptoEngine.initialize();

        deviceBinding = new window.DeviceBinding();
        await deviceBinding.initialize();

        vaultManager = new window.VaultManager(cryptoEngine, deviceBinding);
        await vaultManager.initialize();

        console.log('✅ Identity manager initialized');
        return true;
      } catch (error) {
        console.error('❌ Identity manager initialization failed:', error);
        return false;
      }
    }

    // Create new identity (FIRST TIME ONLY)
    // ONLINE registration – no more vault creation
    async function createIdentity(identityData) {
      const { username, password, confirmPassword, role } = identityData;

      // Same UI-style validation as before
      if (!username || username.trim().length === 0) {
        return { success: false, message: 'Username is required' };
      }
      if (!password || password.length === 0) {
        return { success: false, message: 'Password is required' };
      }
      if (password.length < 8) {
        return { success: false, message: 'Password must be at least 8 characters' };
      }
      if (password !== confirmPassword) {
        return { success: false, message: 'Passwords do not match' };
      }
      // Role is now hardcoded to 'user' - no need to validate

      try {
        // Send to backend; backend decides final role (user)
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password
          })
        });

        const data = await res.json();

        if (!res.ok) {
          return {
            success: false,
            message: data.message || 'Registration failed. Please try again.'
          };
        }

        return {
          success: true,
          message: data.message || 'Registration successful. Please log in.',
          username
        };
      } catch (error) {
        console.error('Online registration error:', error);
        return {
          success: false,
          message: 'Registration failed. Please try again.'
        };
      }
    }


    // Validate identity creation
    function validateIdentityCreation(data) {
      const { username, password, confirmPassword, role } = data;

      if (!username || username.trim().length === 0) {
        return { valid: false, message: 'Username is required' };
      }

      if (username.length < 3) {
        return { valid: false, message: 'Username must be at least 3 characters' };
      }

      if (!password || password.length === 0) {
        return { valid: false, message: 'Password is required' };
      }

      if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters' };
      }

      if (password !== confirmPassword) {
        return { valid: false, message: 'Passwords do not match' };
      }

      // Role is now hardcoded to 'user' - no need to validate

      return { valid: true };
    }

    // Get dashboard for role
    function getDashboardForRole(role) {
      const dashboards = {
        user: 'dashboards/user.html'
      };
      return dashboards[role] || 'dashboards/user.html';
    }

    // Enforce minimum timing (timing attack mitigation)
    async function enforceMinimumTime(startTime) {
      const elapsed = performance.now() - startTime;
      const targetTime = REGISTRATION_TIME_MIN +
        Math.random() * (REGISTRATION_TIME_MAX - REGISTRATION_TIME_MIN);

      if (elapsed < targetTime) {
        await new Promise(resolve =>
          setTimeout(resolve, targetTime - elapsed)
        );
      }
    }

    // Public API
    return {
      initialize,
      createIdentity
    };
  })();
})();
