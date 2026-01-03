/* ═══════════════════════════════════════════════════════════
   OFFLINE PROTOTYPE - AUTH ORCHESTRATOR (OPTIMIZED UX)
   ═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // Reduced timing window for better UX
    const FIXED_AUTH_TIME_MIN = 200;   // was 1000
    const FIXED_AUTH_TIME_MAX = 400;   // was 1500

    window.SecureAuth = (function () {
        let cryptoEngine = null;
        let vaultManager = null;
        let sessionManager = null;
        let deviceBinding = null;
        let challengeAuth = null;
        let antiTamper = null;
        let initialized = false;
        let initPromise = null; // ensure single init

        // Initialize security system ONCE
        async function initialize() {
            if (initialized) return;
            if (initPromise) return initPromise;

            initPromise = (async () => {
                console.log('🔐 Initializing Secure Authentication System (optimized)...');

                cryptoEngine = new window.CryptoEngine();
                await cryptoEngine.initialize();

                deviceBinding = new window.DeviceBinding();
                await deviceBinding.initialize();

                vaultManager = new window.VaultManager(cryptoEngine, deviceBinding);
                await vaultManager.initialize();

                sessionManager = new window.SessionManager(deviceBinding);
                challengeAuth = new window.ChallengeAuth(cryptoEngine);
                antiTamper = new window.AntiTamper();
                antiTamper.initialize();

                initialized = true;
                console.log('✅ Security system initialized (ready)');
                console.log('KDF: PBKDF2 (600000 iterations)');

                await checkExistingSession();
            })();

            return initPromise;
        }

        // Check for existing valid session
        async function checkExistingSession() {
            const session = await sessionManager.getSession();
            if (session && session.isLoggedIn) {
                const dashboard = getDashboardUrl(session.role);
                if (window.location.pathname.includes('index.html') ||
                    window.location.pathname === '/') {
                    window.location.replace(dashboard);
                }
            }
        }

        // Main authentication entry point
        async function authenticate(credentials) {
            // Make sure system is fully ready BEFORE auth
            await initialize();

            const startTime = performance.now();

            try {
                // Execute authentication with constant-time operations
                const result = await executeConstantTimeAuth(credentials);

                // Enforce minimum duration (but shorter now)
                await enforceFixedTiming(startTime);

                // Lighter CPU work
                await addMandatoryCPUWork();

                if (result.success) {
                    await sessionManager.createSession(result.userData);

                    setTimeout(() => {
                        window.location.replace(result.userData.dashboard);
                    }, 50); // slightly faster redirect

                    return { success: true };
                } else {
                    await addFakeWorkload();
                    return { success: false };
                }

            } catch (error) {
                console.error('Authentication error:', error);
                await enforceFixedTiming(startTime);
                await addMandatoryCPUWork();
                await addFakeWorkload();
                return { success: false };
            }
        }

        // Execute authentication with vault + role checks ONLY
        async function executeConstantTimeAuth(credentials) {
            const { username, password, role } = credentials;

            const userExists = await vaultManager.userExists(username);
            let userData = null;

            if (userExists) {
                userData = await vaultManager.verifyCredentials(username, password);
            } else {
                await performFakeCryptoWork(password);
            }

            let roleMatches = false;
            if (userData) {
                roleMatches = constantTimeCompare(userData.role, role);
            } else {
                constantTimeCompare('dummy', role);
            }

            // 🔹 CHALLENGE AUTH DISABLED for offline UX:
            // vault + role are treated as final authority here.
            if (userData && roleMatches) {
                return {
                    success: true,
                    userData: userData
                };
            }

            return { success: false };
        }

        // Constant-time string comparison
        function constantTimeCompare(a, b) {
            if (typeof a !== 'string' || typeof b !== 'string') {
                return false;
            }

            const aLen = a.length;
            const bLen = b.length;
            const maxLen = Math.max(aLen, bLen);

            let result = aLen ^ bLen;

            for (let i = 0; i < maxLen; i++) {
                const aChar = i < aLen ? a.charCodeAt(i) : 0;
                const bChar = i < bLen ? b.charCodeAt(i) : 0;
                result |= aChar ^ bChar;
            }

            return result === 0;
        }

        async function enforceFixedTiming(startTime) {
            const elapsed = performance.now() - startTime;
            const targetTime = FIXED_AUTH_TIME_MIN +
                Math.random() * (FIXED_AUTH_TIME_MAX - FIXED_AUTH_TIME_MIN);

            if (elapsed < targetTime) {
                await new Promise(resolve =>
                    setTimeout(resolve, targetTime - elapsed)
                );
            }
        }

        // Lighter CPU workload
        async function addMandatoryCPUWork() {
            const iterations = 3; // was 10
            for (let i = 0; i < iterations; i++) {
                const data = new Uint8Array(256);
                crypto.getRandomValues(data);
                await crypto.subtle.digest('SHA-256', data);
            }
        }

        async function addFakeWorkload() {
            const fakeData = new Uint8Array(512);
            crypto.getRandomValues(fakeData);
            await crypto.subtle.digest('SHA-256', fakeData);
            await crypto.subtle.digest('SHA-512', fakeData);
        }

        async function performFakeCryptoWork(password) {
            const fakeSalt = 'fake_salt_for_timing_protection_' + Date.now();
            const encoder = new TextEncoder();

            try {
                const keyMaterial = await crypto.subtle.importKey(
                    'raw',
                    encoder.encode(password),
                    'PBKDF2',
                    false,
                    ['deriveBits']
                );

                await crypto.subtle.deriveBits(
                    {
                        name: 'PBKDF2',
                        salt: encoder.encode(fakeSalt),
                        iterations: 50000, // lower for speed
                        hash: 'SHA-256'
                    },
                    keyMaterial,
                    256
                );
            } catch (error) {
                // Silent fail
            }
        }

        function getDashboardUrl(role) {
            const dashboards = {
                admin: 'admin/dashboard.html',
                franchisee: 'dashboards/franchisee.html',
                staff: 'dashboards/staff.html',
                user: 'dashboards/user.html'
            };
            return dashboards[role] || 'index.html';
        }

        return {
            initialize,
            authenticate
        };
    })();

    // Auto-prewarm on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.SecureAuth && window.SecureAuth.initialize) {
                window.SecureAuth.initialize().catch(console.error);
            }
        });
    } else {
        if (window.SecureAuth && window.SecureAuth.initialize) {
            window.SecureAuth.initialize().catch(console.error);
        }
    }

})();
