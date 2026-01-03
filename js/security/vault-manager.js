/* ═══════════════════════════════════════════════════════════
   OFFLINE PROTOTYPE - ENCRYPTED VAULT (EDUCATIONAL)
   
   ⚠️ CLIENT-SIDE CRYPTO LIMITATION:
   While this implements industry-standard encryption (AES-GCM),
   client-side storage is fundamentally untrusted because:
   - Browser DevTools can access localStorage
   - JavaScript can be modified before execution
   - No true secret can exist in the browser
   
   OFFLINE PURPOSE: Demonstrates vault architecture concepts
   ONLINE REPLACEMENT: Backend database with server-side hashing
   
   SECURITY MODEL:
   Offline: Best-effort protection (educational)
   Online: Backend PostgreSQL + bcrypt/Argon2id (production)
   ═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    window.VaultManager = class VaultManager {
        constructor(cryptoEngine, deviceBinding) {
            this.crypto = cryptoEngine;
            this.deviceBinding = deviceBinding;
            this.vaultKey = 'movex_encrypted_vault';
            this.integrityKey = 'movex_vault_integrity';
            this.vault = null;
        }

        async initialize() {
            await this.loadVault();
            await this.verifyVaultIntegrity();
            console.log('✅ Vault initialized');
        }

        async loadVault() {
            const vaultData = localStorage.getItem(this.vaultKey);

            if (!vaultData) {
                console.log('Creating new vault...');
                this.vault = this.createVaultStructure();
                await this.saveVault();
            } else {
                try {
                    this.vault = JSON.parse(vaultData);
                    console.log('Loaded existing vault');
                } catch (error) {
                    console.error('Vault corrupted, creating new');
                    this.vault = this.createVaultStructure();
                    await this.saveVault();
                }
            }
        }

        createVaultStructure() {
            const generateSalt = () => {
                const salt = new Uint8Array(32);
                crypto.getRandomValues(salt);
                return Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
            };

            const now = Date.now();

            return {
                version: '2.0.0',
                created: now,
                lastModified: now,
                users: {
                    'admin': {
                        salt: generateSalt(),
                        verificationBlob: null,
                        role: 'admin',
                        dashboard: 'admin/dashboard.html',
                        metadata: {
                            created: now,
                            lastLogin: null,
                            registered: null
                        }
                    },
                    'franchisee_blr': {
                        salt: generateSalt(),
                        verificationBlob: null,
                        role: 'franchisee',
                        dashboard: 'dashboards/franchisee.html',
                        metadata: {
                            created: now,
                            lastLogin: null,
                            registered: null
                        }
                    },
                    'staff_blr01': {
                        salt: generateSalt(),
                        verificationBlob: null,
                        role: 'staff',
                        dashboard: 'dashboards/staff.html',
                        metadata: {
                            created: now,
                            lastLogin: null,
                            registered: null
                        }
                    },
                    'user01': {
                        salt: generateSalt(),
                        verificationBlob: null,
                        role: 'user',
                        dashboard: 'dashboards/user.html',
                        metadata: {
                            created: now,
                            lastLogin: null,
                            registered: null
                        }
                    },

                }
            };
        }

        async saveVault() {
            this.vault.lastModified = Date.now();
            const vaultJson = JSON.stringify(this.vault);
            localStorage.setItem(this.vaultKey, vaultJson);

            const integrity = await this.generateIntegritySignature(vaultJson);
            localStorage.setItem(this.integrityKey, integrity);
        }

        async verifyVaultIntegrity() {
            const vaultJson = localStorage.getItem(this.vaultKey);
            const storedIntegrity = localStorage.getItem(this.integrityKey);

            if (!vaultJson || !storedIntegrity) {
                return true;
            }

            const computedIntegrity = await this.generateIntegritySignature(vaultJson);

            if (computedIntegrity !== storedIntegrity) {
                console.warn('⚠️ Vault integrity mismatch');
                return false;
            }

            return true;
        }

        async generateIntegritySignature(data) {
            const deviceSecret = this.deviceBinding.getDeviceSecret();
            const combined = data + deviceSecret + 'movex-integrity-salt';
            return await this.crypto.hash(combined);
        }

        // Register pre-provisioned user
        async registerUser(username, password) {
            const userKey = username.replace('@movex', '');
            const user = this.vault.users[userKey];

            if (!user) {
                throw new Error(`User not found: ${userKey}`);
            }

            if (!user.metadata) {
                user.metadata = {
                    created: Date.now(),
                    lastLogin: null,
                    registered: null
                };
            }

            const deviceSecret = this.deviceBinding.getDeviceSecret();

            const derivedKey = await this.crypto.deriveKey(
                password,
                user.salt,
                deviceSecret
            );

            const verificationData = {
                username: username,
                role: user.role,
                dashboard: user.dashboard,
                registeredAt: Date.now(),
                deviceFingerprint: await this.crypto.hash(deviceSecret)
            };

            user.verificationBlob = await this.crypto.encrypt(
                verificationData,
                derivedKey
            );

            user.metadata.registered = Date.now();

            await this.saveVault();

            return true;
        }

        // Check if user exists (timing-safe)
        async userExists(username) {
            const userKey = username.replace('@movex', '');
            const user = this.vault.users[userKey];
            const exists = !!(user && user.verificationBlob);
            await new Promise(resolve => setTimeout(resolve, 10));
            return exists;
        }

        // Verify credentials (pre-provisioned users)
        async verifyCredentials(username, password) {
            const userKey = username.replace('@movex', '');
            return await this.verifyUserCredentials(userKey, password);
        }

        // Verify specific user credentials
        async verifyUserCredentials(userKey, password) {
            const user = this.vault.users[userKey];

            if (!user || !user.verificationBlob) {
                return null;
            }

            try {
                const deviceSecret = this.deviceBinding.getDeviceSecret();

                const derivedKey = await this.crypto.deriveKey(
                    password,
                    user.salt,
                    deviceSecret
                );

                const verificationData = await this.crypto.decrypt(
                    user.verificationBlob,
                    derivedKey
                );

                if (!verificationData) {
                    return null;
                }

                const currentDeviceHash = await this.crypto.hash(deviceSecret);
                if (verificationData.deviceFingerprint !== currentDeviceHash) {
                    console.warn('⚠️ Device binding mismatch');
                    return null;
                }

                if (!user.metadata) {
                    user.metadata = {};
                }
                user.metadata.lastLogin = Date.now();
                await this.saveVault();

                return {
                    username: verificationData.username,
                    role: verificationData.role,
                    dashboard: verificationData.dashboard
                };

            } catch (error) {
                console.error('Credential verification error:', error);
                return null;
            }
        }

        // Check if user-created identity exists
        async hasUserCreatedIdentity() {
            if (!this.vault || !this.vault.users) {
                return false;
            }

            const preProvisionedKeys = ['admin', 'franchisee_blr', 'staff_blr01', 'user01'];

            for (const userKey in this.vault.users) {
                if (!preProvisionedKeys.includes(userKey)) {
                    const user = this.vault.users[userKey];
                    if (user && user.verificationBlob) {
                        return true;
                    }
                }
            }

            return false;
        }

        // Get user-created identity metadata
        async getUserCreatedIdentity() {
            if (!this.vault || !this.vault.users) {
                return null;
            }

            const preProvisionedKeys = ['admin', 'franchisee_blr', 'staff_blr01', 'user01'];

            for (const userKey in this.vault.users) {
                if (!preProvisionedKeys.includes(userKey)) {
                    const user = this.vault.users[userKey];
                    if (user && user.verificationBlob) {
                        return {
                            userKey: userKey,
                            username: userKey,
                            role: user.role,
                            exists: true
                        };
                    }
                }
            }

            return null;
        }

        // Create user identity (FIRST TIME ONLY)
        async createUserIdentity(identityData) {
            try {
                const { username, password, role, dashboard } = identityData;

                // CRITICAL: Check if any user-created identity exists
                const identityExists = await this.hasUserCreatedIdentity();
                if (identityExists) {
                    console.error('⚠️ SECURITY: Attempted duplicate identity creation blocked');
                    return false;
                }

                // Generate unique user key
                const userKey = this.generateUniqueUserKey(username);

                // Generate unique salt
                const salt = this.crypto.generateSalt();

                // Create user structure
                this.vault.users[userKey] = {
                    salt: salt,
                    verificationBlob: null,
                    role: role,
                    dashboard: dashboard,
                    metadata: {
                        created: Date.now(),
                        lastLogin: null,
                        registered: Date.now(),
                        identityType: 'user-created'
                    }
                };

                // Get device secret
                const deviceSecret = this.deviceBinding.getDeviceSecret();

                // Derive key from password
                const derivedKey = await this.crypto.deriveKey(
                    password,
                    salt,
                    deviceSecret
                );

                // Create verification data (encrypted identity)
                const verificationData = {
                    username: username,
                    role: role,
                    dashboard: dashboard,
                    createdAt: Date.now(),
                    deviceFingerprint: await this.crypto.hash(deviceSecret),
                    identityType: 'user-created'
                };

                // Encrypt identity vault
                this.vault.users[userKey].verificationBlob = await this.crypto.encrypt(
                    verificationData,
                    derivedKey
                );

                // Save vault with integrity
                await this.saveVault();

                console.log('✅ User identity created:', userKey);

                return true;

            } catch (error) {
                console.error('Identity creation error:', error);
                return false;
            }
        }

        // Generate unique user key from username
        generateUniqueUserKey(username) {
            let cleanUsername = username.replace('@movex', '').toLowerCase();
            cleanUsername = cleanUsername.replace(/[^a-z0-9_]/g, '_');
            const timestamp = Date.now().toString(36);
            return `user_${cleanUsername}_${timestamp}`;
        }

        getUserSalt(username) {
            const userKey = username.replace('@movex', '');
            return this.vault.users[userKey]?.salt || null;
        }
    };
})();
