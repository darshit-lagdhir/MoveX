/* ═══════════════════════════════════════════════════════════
   OFFLINE PROTOTYPE - DEVICE FINGERPRINTING (LIMITED VALUE)
   (actually SessionManager - secure session wrapper)
   ═══════════════════════════════════════════════════════════ */

(function() {
    'use strict';
    
    window.SessionManager = class SessionManager {
        constructor(deviceBinding) {
            this.deviceBinding = deviceBinding;
            this.sessionKey = 'movex_secure_session';
            this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        }
        
        // Create secure session with integrity protection
        async createSession(userData) {
            const deviceSecret = this.deviceBinding.getDeviceSecret();
            
            const sessionData = {
                isLoggedIn: true,
                role: userData.role,
                username: userData.username,
                timestamp: Date.now(),
                expires: Date.now() + this.maxAge,
                nonce: this.generateNonce(),
                version: '2.0.0'
            };
            
            // Generate HMAC integrity signature
            const integrity = await this.generateIntegrity(sessionData, deviceSecret);
            
            const session = {
                data: sessionData,
                integrity: integrity,
                deviceHash: await this.hashDeviceSecret(deviceSecret)
            };
            
            sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
            
            return sessionData;
        }
        
        // Get and verify session (full security checks)
        async getSession() {
            try {
                const sessionJson = sessionStorage.getItem(this.sessionKey);
                
                if (!sessionJson) {
                    return null;
                }
                
                const session = JSON.parse(sessionJson);
                const deviceSecret = this.deviceBinding.getDeviceSecret();
                
                // Verify device binding
                const currentDeviceHash = await this.hashDeviceSecret(deviceSecret);
                if (session.deviceHash !== currentDeviceHash) {
                    console.warn('⚠️ Session device mismatch');
                    this.clearSession();
                    return null;
                }
                
                // Verify integrity (HMAC)
                const expectedIntegrity = await this.generateIntegrity(
                    session.data,
                    deviceSecret
                );
                
                if (!this.constantTimeCompare(session.integrity, expectedIntegrity)) {
                    console.error('⚠️ SESSION TAMPERED - Integrity check failed');
                    this.handleTampering();
                    return null;
                }
                
                // Check expiration
                if (session.data.expires < Date.now()) {
                    console.log('Session expired');
                    this.clearSession();
                    return null;
                }
                
                // Check timestamp anomaly
                if (session.data.timestamp > Date.now()) {
                    console.error('⚠️ SESSION TAMPERED - Future timestamp detected');
                    this.handleTampering();
                    return null;
                }
                
                return session.data;
                
            } catch (error) {
                console.error('Session error:', error);
                this.clearSession();
                return null;
            }
        }

        // 🔹 NEW: Lightweight helper for dashboards (no HMAC recompute here)
        getRawSessionDataForDashboard() {
            try {
                const sessionJson = sessionStorage.getItem(this.sessionKey);
                if (!sessionJson) return null;

                const wrapper = JSON.parse(sessionJson);
                // dashboards only care about role/isLoggedIn; they don't recompute integrity
                return wrapper.data || null;
            } catch {
                return null;
            }
        }
        
        // Generate HMAC integrity signature
        async generateIntegrity(data, deviceSecret) {
            const message = JSON.stringify(data) + deviceSecret + 'movex-session-salt';
            const encoder = new TextEncoder();
            const messageBuffer = encoder.encode(message);
            
            // Use device secret as HMAC key
            const keyBuffer = encoder.encode(deviceSecret);
            const key = await crypto.subtle.importKey(
                'raw',
                keyBuffer,
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );
            
            // Generate HMAC
            const signature = await crypto.subtle.sign('HMAC', key, messageBuffer);
            
            return Array.from(new Uint8Array(signature))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }
        
        // Hash device secret
        async hashDeviceSecret(deviceSecret) {
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest(
                'SHA-256',
                encoder.encode(deviceSecret)
            );
            
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }
        
        // Constant-time comparison
        constantTimeCompare(a, b) {
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
        
        // Handle tampering detection
        handleTampering() {
            // Clear all session data
            this.clearSession();
            
            // Lock vault
            localStorage.setItem('movex_tamper_detected', Date.now().toString());
            
            // Redirect to login
            setTimeout(() => {
                alert('Security violation detected. Session cleared.');
                window.location.replace('index.html');
            }, 100);
        }
        
        // Generate nonce
        generateNonce() {
            const nonce = new Uint8Array(16);
            crypto.getRandomValues(nonce);
            return Array.from(nonce)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }
        
        // Clear session
        clearSession() {
            sessionStorage.removeItem(this.sessionKey);
        }
        
        // Update session (refresh)
        async updateSession() {
            const session = await this.getSession();
            if (session) {
                // Extend expiration
                session.expires = Date.now() + this.maxAge;
                await this.createSession(session);
            }
        }
    };
})();
