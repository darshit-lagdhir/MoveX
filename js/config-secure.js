/* ═══════════════════════════════════════════════════════════
   MOVEX SECURITY CONFIGURATION
   ═══════════════════════════════════════════════════════════ */

export const SecurityConfig = {
    // Key Derivation Settings
    kdf: {
        algorithm: 'PBKDF2', // Will upgrade to Argon2id when WASM loaded
        iterations: 600000,  // OWASP recommended minimum
        hashAlgorithm: 'SHA-512',
        keyLength: 32,
        
        // Argon2id parameters (when available)
        argon2: {
            memoryCost: 65536,    // 64 MB
            timeCost: 3,          // iterations
            parallelism: 4,       // threads
            hashLength: 32
        }
    },
    
    // Vault Encryption
    vault: {
        algorithm: 'AES-GCM',
        keyLength: 256,
        ivLength: 12,
        tagLength: 128
    },
    
    // Session Security
    session: {
        key: 'movex_secure_session',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        integrityCheck: true
    },
    
    // Authentication Timing
    timing: {
        minDelay: 800,    // Minimum login time (ms)
        maxDelay: 1200,   // Maximum login time (ms)
        constantTime: true
    },
    
    // Anti-Tamper
    antiTamper: {
        enabled: true,
        checkInterval: 5000,  // Check every 5 seconds
        integrityChecks: true,
        devToolsDetection: true
    },
    
    // Device Binding
    deviceBinding: {
        enabled: true,
        storageKey: 'movex_device_secret',
        components: [
            'userAgent',
            'language',
            'timezone',
            'screenResolution',
            'colorDepth',
            'hardwareConcurrency',
            'deviceMemory',
            'platform'
        ]
    }
};
