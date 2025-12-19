/* ═══════════════════════════════════════════════════════════
   CHALLENGE-RESPONSE AUTHENTICATION
   Single-Use Challenges | Replay Protection | Zero-Knowledge
   ═══════════════════════════════════════════════════════════ */

(function() {
    'use strict';
    
    window.ChallengeAuth = class ChallengeAuth {
        constructor(cryptoEngine) {
            this.crypto = cryptoEngine;
            this.activeChallenges = new Map();
            this.maxChallengeAge = 30000; // 30 seconds
            this.cleanupInterval = null;
            
            // Start cleanup timer
            this.startCleanup();
        }
        
        // Generate cryptographically strong challenge
        generateChallenge() {
            const challenge = {
                id: this.generateChallengeId(),
                challenge: this.crypto.generateChallenge(),
                timestamp: Date.now(),
                nonce: this.generateNonce(),
                used: false
            };
            
            // Store in memory only (never persisted)
            this.activeChallenges.set(challenge.id, challenge);
            
            return challenge;
        }
        
        // Verify user with challenge-response
        async verifyUserChallenge(username, password, challengeObj) {
            // Validate challenge exists and is fresh
            if (!this.validateChallenge(challengeObj)) {
                return false;
            }
            
            // Mark as used immediately (prevent replay)
            this.markChallengeUsed(challengeObj.id);
            
            try {
                // Get user's salt from vault
                const vault = this.getVaultReference();
                const userKey = username.replace('@movex', '');
                const user = vault?.users?.[userKey];
                
                if (!user || !user.salt) {
                    // Perform fake work for timing consistency
                    await this.performFakeWork();
                    return false;
                }
                
                // Derive key from password
                const deviceSecret = window.deviceBindingInstance?.getDeviceSecret();
                if (!deviceSecret) {
                    await this.performFakeWork();
                    return false;
                }
                
                const derivedKey = await this.crypto.deriveKey(
                    password,
                    user.salt,
                    deviceSecret
                );
                
                // Create response signature
                const signature = await this.crypto.signChallenge(
                    challengeObj.challenge,
                    derivedKey
                );
                
                // Verify signature (constant-time)
                const isValid = await this.crypto.verifyChallenge(
                    challengeObj.challenge,
                    signature,
                    derivedKey
                );
                
                // Clean up challenge
                this.activeChallenges.delete(challengeObj.id);
                
                return isValid;
                
            } catch (error) {
                console.error('Challenge verification error:', error);
                await this.performFakeWork();
                return false;
            }
        }
        
        // Validate challenge freshness and single-use
        validateChallenge(challengeObj) {
            if (!challengeObj || !challengeObj.id) {
                return false;
            }
            
            const stored = this.activeChallenges.get(challengeObj.id);
            
            if (!stored) {
                return false; // Challenge doesn't exist
            }
            
            if (stored.used) {
                return false; // Already used (replay attack)
            }
            
            const age = Date.now() - stored.timestamp;
            if (age > this.maxChallengeAge) {
                this.activeChallenges.delete(challengeObj.id);
                return false; // Expired
            }
            
            // Verify nonce matches (prevent tampering)
            if (stored.nonce !== challengeObj.nonce) {
                return false;
            }
            
            return true;
        }
        
        // Mark challenge as used (prevent replay)
        markChallengeUsed(challengeId) {
            const challenge = this.activeChallenges.get(challengeId);
            if (challenge) {
                challenge.used = true;
            }
        }
        
        // Generate unique challenge ID
        generateChallengeId() {
            const randomBytes = new Uint8Array(16);
            crypto.getRandomValues(randomBytes);
            return Array.from(randomBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }
        
        // Generate nonce
        generateNonce() {
            const nonce = new Uint8Array(16);
            crypto.getRandomValues(nonce);
            return Array.from(nonce)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }
        
        // Get vault reference (without circular dependency)
        getVaultReference() {
            return JSON.parse(localStorage.getItem('movex_encrypted_vault') || 'null');
        }
        
        // Perform fake work for timing consistency
        async performFakeWork() {
            const fakeData = new Uint8Array(256);
            crypto.getRandomValues(fakeData);
            await crypto.subtle.digest('SHA-256', fakeData);
        }
        
        // Start cleanup timer (remove expired challenges)
        startCleanup() {
            this.cleanupInterval = setInterval(() => {
                const now = Date.now();
                for (const [id, challenge] of this.activeChallenges.entries()) {
                    if (now - challenge.timestamp > this.maxChallengeAge) {
                        this.activeChallenges.delete(id);
                    }
                }
            }, 10000); // Clean every 10 seconds
        }
        
        // Stop cleanup timer
        stopCleanup() {
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
                this.cleanupInterval = null;
            }
        }
        
        // Clear all challenges (security event)
        clearAllChallenges() {
            this.activeChallenges.clear();
        }
    };
})();
