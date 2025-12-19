/* ═══════════════════════════════════════════════════════════
   OFFLINE PROTOTYPE - CRYPTOGRAPHIC ENGINE (DEMONSTRATION)
   
   ⚠️ CLIENT-SIDE CRYPTO REALITY:
   This implements PBKDF2-600K correctly, BUT:
   - Secrets exist in browser memory (extractable)
   - User can bypass all crypto via DevTools
   - No server validation = no real security
   
   WHY WE BUILT THIS:
   To understand crypto concepts and prepare architecture.
   NOT for production authentication.
   
   MIGRATION PLAN:
   Online backend will use: bcrypt/Argon2id on server
   Frontend will: Send plain passwords over HTTPS only
   ═══════════════════════════════════════════════════════════ */

(function() {
    'use strict';
    
    window.CryptoEngine = class CryptoEngine {
        constructor() {
            this.iterations = 600000;
            this.keyLength = 256;
            this.algorithm = 'AES-GCM';
        }
        
        async initialize() {
            console.log('🔐 Crypto engine initialized');
            console.log(`KDF: PBKDF2 (${this.iterations} iterations)`);
        }
        
        async deriveKey(password, salt, deviceSecret) {
            const encoder = new TextEncoder();
            const combined = password + deviceSecret;
            
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(combined),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );
            
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode(salt),
                    iterations: this.iterations,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: this.keyLength },
                true,
                ['encrypt', 'decrypt']
            );
            
            return key;
        }
        
        async encrypt(data, key) {
            const encoder = new TextEncoder();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encoder.encode(JSON.stringify(data))
            );
            
            const encryptedArray = new Uint8Array(encrypted);
            const combined = new Uint8Array(iv.length + encryptedArray.length);
            combined.set(iv);
            combined.set(encryptedArray, iv.length);
            
            return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        
        async decrypt(encryptedHex, key) {
            try {
                const encrypted = new Uint8Array(
                    encryptedHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
                );
                
                const iv = encrypted.slice(0, 12);
                const data = encrypted.slice(12);
                
                const decrypted = await crypto.subtle.decrypt(
                    {
                        name: 'AES-GCM',
                        iv: iv
                    },
                    key,
                    data
                );
                
                const decoder = new TextDecoder();
                return JSON.parse(decoder.decode(decrypted));
            } catch (error) {
                console.error('Decryption failed:', error);
                return null;
            }
        }
        
        async hash(data) {
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest(
                'SHA-256',
                encoder.encode(data)
            );
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }
        
        generateSalt() {
            const salt = new Uint8Array(32);
            crypto.getRandomValues(salt);
            return Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
        }
    };
})();
