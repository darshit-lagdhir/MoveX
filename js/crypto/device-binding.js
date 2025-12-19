/* ═══════════════════════════════════════════════════════════
   OFFLINE PROTOTYPE - DEVICE BINDING (EDUCATIONAL)
   
   ⚠️ CLIENT-SIDE FINGERPRINTING LIMITATION:
   Browser fingerprints can be spoofed. This provides:
   - Casual user tracking only
   - NO security enforcement
   - Educational value for understanding device binding
   
   ONLINE ENHANCEMENT:
   Backend will additionally track:
   - IP addresses, TLS fingerprints
   - Server-side device tokens
   - Anomaly detection patterns
   ═══════════════════════════════════════════════════════════ */

(function() {
    'use strict';
    
    window.DeviceBinding = class DeviceBinding {
        constructor() {
            this.storageKey = 'movex_device_secret'; // PRIMARY KEY (plain for compatibility)
            this.encryptedStorageKey = 'movex_device_secret_encrypted'; // BACKUP (encrypted)
            this.deviceSecret = null;
            this.encryptionKey = null;
        }
        
        async initialize() {
            console.log('🔐 Initializing device binding...');
            
            // Generate encryption key from browser entropy
            this.encryptionKey = await this.generateEncryptionKey();
            
            // Get or create device secret
            this.deviceSecret = await this.getOrCreateDeviceSecret();
            
            // CRITICAL: Ensure both storage formats exist
            await this.ensureStoragePersistence();
            
            console.log('✅ Device binding initialized');
            console.log('   Device secret length:', this.deviceSecret?.length || 0);
            
            return this.deviceSecret;
        }
        
        // Generate encryption key from browser sources
        async generateEncryptionKey() {
            const entropy = await this.collectBrowserEntropy();
            const encoder = new TextEncoder();
            const entropyBuffer = encoder.encode(entropy);
            
            const hashBuffer = await crypto.subtle.digest('SHA-256', entropyBuffer);
            
            return await crypto.subtle.importKey(
                'raw',
                hashBuffer,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
        }
        
        // Collect browser-specific entropy
        async collectBrowserEntropy() {
            const sources = [];
            
            // Navigator properties
            sources.push(navigator.userAgent || '');
            sources.push(navigator.language || '');
            sources.push(navigator.languages?.join(',') || '');
            sources.push(navigator.platform || '');
            sources.push(String(navigator.hardwareConcurrency || 0));
            sources.push(String(navigator.deviceMemory || 0));
            sources.push(String(navigator.maxTouchPoints || 0));
            
            // Screen properties
            sources.push(`${screen.width}x${screen.height}`);
            sources.push(`${screen.availWidth}x${screen.availHeight}`);
            sources.push(String(screen.colorDepth));
            sources.push(String(screen.pixelDepth));
            
            // Timezone
            try {
                sources.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
                sources.push(String(new Date().getTimezoneOffset()));
            } catch (e) {
                sources.push('tz-unavailable');
            }
            
            // Canvas fingerprint (additional entropy)
            sources.push(await this.getCanvasFingerprint());
            
            // WebGL fingerprint
            sources.push(this.getWebGLFingerprint());
            
            return sources.join('||');
        }
        
        // Get or create device secret (with fallback logic)
        async getOrCreateDeviceSecret() {
            // Priority 1: Check plain storage (for compatibility)
            let plainSecret = localStorage.getItem(this.storageKey);
            if (plainSecret && plainSecret.length === 64) {
                console.log('   ✅ Found existing device secret (plain)');
                return plainSecret;
            }
            
            // Priority 2: Check encrypted storage
            const encryptedStored = localStorage.getItem(this.encryptedStorageKey);
            if (encryptedStored) {
                try {
                    const decrypted = await this.decryptDeviceSecret(encryptedStored);
                    if (decrypted && decrypted.length === 64) {
                        console.log('   ✅ Found existing device secret (encrypted)');
                        // Save plain version for compatibility
                        localStorage.setItem(this.storageKey, decrypted);
                        return decrypted;
                    }
                } catch (e) {
                    console.warn('   ⚠️ Failed to decrypt stored secret, generating new');
                }
            }
            
            // Priority 3: Generate new device secret
            console.log('   🔧 Generating new device secret...');
            const secret = await this.generateDeviceSecret();
            await this.storeDeviceSecret(secret);
            console.log('   ✅ New device secret generated and stored');
            return secret;
        }
        
        // Generate unique device secret
        async generateDeviceSecret() {
            const fingerprint = await this.collectBrowserEntropy();
            
            // Add random entropy
            const randomBytes = new Uint8Array(32);
            crypto.getRandomValues(randomBytes);
            const randomHex = Array.from(randomBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            
            // Combine and hash
            const combined = fingerprint + randomHex + Date.now();
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest(
                'SHA-256',
                encoder.encode(combined)
            );
            
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }
        
        // Store device secret (BOTH plain and encrypted)
        async storeDeviceSecret(secret) {
            // Store plain version (for compatibility)
            localStorage.setItem(this.storageKey, secret);
            
            // Store encrypted version (for security)
            const encrypted = await this.encryptDeviceSecret(secret);
            localStorage.setItem(this.encryptedStorageKey, encrypted);
            
            console.log('   ✅ Device secret saved (plain + encrypted)');
        }
        
        // Ensure storage persistence (called after initialization)
        async ensureStoragePersistence() {
            if (!this.deviceSecret) {
                console.error('   ❌ No device secret to persist!');
                return;
            }
            
            // Verify plain storage
            const plainStored = localStorage.getItem(this.storageKey);
            if (!plainStored || plainStored !== this.deviceSecret) {
                localStorage.setItem(this.storageKey, this.deviceSecret);
                console.log('   🔧 Fixed plain storage');
            }
            
            // Verify encrypted storage
            const encryptedStored = localStorage.getItem(this.encryptedStorageKey);
            if (!encryptedStored) {
                const encrypted = await this.encryptDeviceSecret(this.deviceSecret);
                localStorage.setItem(this.encryptedStorageKey, encrypted);
                console.log('   🔧 Fixed encrypted storage');
            }
        }
        
        // Encrypt device secret
        async encryptDeviceSecret(secret) {
            const encoder = new TextEncoder();
            const secretBuffer = encoder.encode(secret);
            
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv, tagLength: 128 },
                this.encryptionKey,
                secretBuffer
            );
            
            // Combine IV + ciphertext
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encrypted), iv.length);
            
            return btoa(String.fromCharCode.apply(null, combined));
        }
        
        // Decrypt device secret
        async decryptDeviceSecret(encryptedBase64) {
            const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
            
            const iv = combined.slice(0, 12);
            const ciphertext = combined.slice(12);
            
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv, tagLength: 128 },
                this.encryptionKey,
                ciphertext
            );
            
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        }
        
        // Canvas fingerprinting (entropy source)
        async getCanvasFingerprint() {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 200;
                canvas.height = 50;
                const ctx = canvas.getContext('2d');
                
                ctx.textBaseline = 'top';
                ctx.font = '14px Arial';
                ctx.fillStyle = '#f60';
                ctx.fillRect(10, 10, 100, 30);
                ctx.fillStyle = '#069';
                ctx.fillText('MoveX Security 🔒', 5, 5);
                ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
                ctx.fillText('Device Binding', 5, 20);
                
                const dataURL = canvas.toDataURL();
                const encoder = new TextEncoder();
                const hashBuffer = await crypto.subtle.digest(
                    'SHA-256',
                    encoder.encode(dataURL)
                );
                
                return Array.from(new Uint8Array(hashBuffer))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
            } catch {
                return 'canvas-unavailable';
            }
        }
        
        // WebGL fingerprinting
        getWebGLFingerprint() {
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                
                if (!gl) return 'webgl-unavailable';
                
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (!debugInfo) return 'webgl-no-debug';
                
                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                
                return `${vendor}~${renderer}`;
            } catch {
                return 'webgl-error';
            }
        }
        
        // Get device secret (read-only access)
        getDeviceSecret() {
            if (!this.deviceSecret) {
                console.warn('⚠️ Device secret not initialized! Call initialize() first.');
                // Attempt to load from storage as fallback
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    console.log('   ℹ️ Loaded device secret from storage');
                    this.deviceSecret = stored;
                    return stored;
                }
            }
            return this.deviceSecret;
        }
        
        // Force refresh device secret from storage
        refreshFromStorage() {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.deviceSecret = stored;
                console.log('✅ Device secret refreshed from storage');
                return true;
            }
            return false;
        }
    };
})();
