/* ═══════════════════════════════════════════════════════════
   ANTI-TAMPER PROTECTION - EPIC LOCKDOWN UI
   Inter Font | Animated | Professional Design
   
   SECURITY NOTE: This is for deterrence only. Client-side
   anti-tamper can always be bypassed. Real security must be
   enforced server-side.
   ═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    window.AntiTamper = class AntiTamper {
        constructor() {
            this.detectionCount = 0;
            this.maxDetections = 10; // SECURITY: Increased threshold to reduce false positives
            this.checkInterval = null;
            // SECURITY: Disable in development to allow debugging
            this.isProduction = !window.location.hostname.includes('localhost') &&
                !window.location.hostname.includes('127.0.0.1');
        }

        initialize() {
            // SECURITY: Skip anti-tamper in development
            if (!this.isProduction) {
                console.log('🛡️ Anti-tamper disabled in development mode');
                return;
            }

            console.log('🛡️ Anti-tamper protection ACTIVE');

            // Detect DevTools (production only)
            this.detectDevTools();

            // Disable right-click (production only)
            this.disableRightClick();

            // Disable keyboard shortcuts (production only)
            this.disableKeyboardShortcuts();

            // NOTE: Removed debugger detection - causes false positives
            // this.detectDebugger();

            // Integrity check
            this.integrityCheck();

            console.log('✅ Anti-tamper initialized');
        }

        detectDevTools() {
            const element = new Image();
            let devtoolsOpen = false;

            Object.defineProperty(element, 'id', {
                get: () => {
                    devtoolsOpen = true;
                    this.onTamperDetected('DevTools detected');
                }
            });

            this.checkInterval = setInterval(() => {
                devtoolsOpen = false;
                console.log(element);
                console.clear();

                if (devtoolsOpen) {
                    this.onTamperDetected('DevTools open');
                }
            }, 1000);
        }

        disableRightClick() {
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.onTamperDetected('Right-click attempted');
            });
        }

        disableKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // F12
                if (e.key === 'F12') {
                    e.preventDefault();
                    this.onTamperDetected('F12 pressed');
                }

                // Ctrl+Shift+I (Inspect)
                if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                    e.preventDefault();
                    this.onTamperDetected('Inspect shortcut');
                }

                // Ctrl+Shift+J (Console)
                if (e.ctrlKey && e.shiftKey && e.key === 'J') {
                    e.preventDefault();
                    this.onTamperDetected('Console shortcut');
                }

                // Ctrl+Shift+C (Element picker)
                if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                    e.preventDefault();
                    this.onTamperDetected('Element picker shortcut');
                }

                // Ctrl+U (View source)
                if (e.ctrlKey && e.key === 'u') {
                    e.preventDefault();
                    this.onTamperDetected('View source shortcut');
                }
            });
        }

        detectDebugger() {
            setInterval(() => {
                const start = performance.now();
                debugger;
                const end = performance.now();

                if (end - start > 100) {
                    this.onTamperDetected('Debugger detected');
                }
            }, 2000);
        }

        integrityCheck() {
            setInterval(() => {
                if (!localStorage.getItem || !sessionStorage.getItem) {
                    this.onTamperDetected('Storage functions tampered');
                }

                if (!window.crypto || !window.crypto.subtle) {
                    this.onTamperDetected('Crypto API tampered');
                }
            }, 5000);
        }

        onTamperDetected(reason) {
            this.detectionCount++;

            console.warn(`⚠️ Tamper attempt ${this.detectionCount}/${this.maxDetections}: ${reason}`);

            if (this.detectionCount >= this.maxDetections) {
                this.lockdown(reason);
            }
        }

        lockdown(reason) {
            console.error('🚨 SECURITY LOCKDOWN:', reason);

            // SECURITY: Only clear session-related data, preserve user preferences
            // Clearing all storage on false positive is a DoS to legitimate users
            sessionStorage.clear();
            // Only remove auth-related items from localStorage
            localStorage.removeItem('movex_secure_session');
            localStorage.removeItem('movex_encrypted_vault');
            localStorage.removeItem('movex_device_secret');
            // Preserve: movex-theme, movex_theme (user preferences)

            // Show EPIC lockdown screen
            document.body.innerHTML = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Security Lockdown - MoveX</title>
                    <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    overflow: hidden;
                    background: #0a0a0a;
                }
                
                .lockdown-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100vh;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    z-index: 999999;
                }
                
                /* Animated background particles */
                .particles {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }
                
                .particle {
                    position: absolute;
                    background: rgba(239, 68, 68, 0.3);
                    border-radius: 50%;
                    animation: float 15s infinite;
                }
                
                .particle:nth-child(1) { width: 60px; height: 60px; left: 10%; animation-delay: 0s; }
                .particle:nth-child(2) { width: 40px; height: 40px; left: 30%; animation-delay: 2s; }
                .particle:nth-child(3) { width: 70px; height: 70px; left: 50%; animation-delay: 4s; }
                .particle:nth-child(4) { width: 50px; height: 50px; left: 70%; animation-delay: 6s; }
                .particle:nth-child(5) { width: 60px; height: 60px; left: 90%; animation-delay: 8s; }
                
                @keyframes float {
                    0%, 100% { transform: translateY(100vh) scale(0); opacity: 0; }
                    50% { opacity: 0.3; }
                    100% { transform: translateY(-100vh) scale(1); }
                }
                
                /* Warning stripes animation */
                .warning-stripes {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 50px,
                        rgba(239, 68, 68, 0.03) 50px,
                        rgba(239, 68, 68, 0.03) 100px
                    );
                    animation: stripes 20s linear infinite;
                }
                
                @keyframes stripes {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(141px); }
                }
                
                .lockdown-content {
                    position: relative;
                    z-index: 10;
                    text-align: center;
                    padding: 30px 35px;
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(20px);
                    border-radius: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 
                        0 20px 60px rgba(0, 0, 0, 0.5),
                        inset 0 1px 1px rgba(255, 255, 255, 0.1);
                    max-width: 550px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    animation: fadeInScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                
                @keyframes fadeInScale {
                    from {
                        opacity: 0;
                        transform: scale(0.9) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                
                /* Animated lock icon */
                .lock-icon-container {
                    position: relative;
                    width: 100px;
                    height: 100px;
                    margin: 0 auto 20px;
                }
                
                .lock-circle {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1));
                    animation: pulse 2s ease-in-out infinite;
                }
                
                .lock-circle-2 {
                    animation-delay: 0.3s;
                    opacity: 0.6;
                }
                
                .lock-circle-3 {
                    animation-delay: 0.6s;
                    opacity: 0.3;
                }
                
                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 0.8;
                    }
                    50% {
                        transform: scale(1.15);
                        opacity: 0.4;
                    }
                }
                
                .lock-icon {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: #ef4444;
                    filter: drop-shadow(0 0 20px rgba(239, 68, 68, 0.5));
                    animation: shake 0.5s infinite;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
                    25% { transform: translate(-50%, -50%) rotate(-5deg); }
                    75% { transform: translate(-50%, -50%) rotate(5deg); }
                }
                
                .status-badge {
                    display: inline-block;
                    padding: 6px 16px;
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid rgba(239, 68, 68, 0.5);
                    border-radius: 50px;
                    color: #fca5a5;
                    font-size: 12px;
                    font-weight: 600;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin-bottom: 15px;
                    animation: blink 1.5s infinite;
                }
                
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                h1 {
                    font-size: 34px;
                    font-weight: 700;
                    color: #ffffff;
                    margin-bottom: 12px;
                    letter-spacing: -0.5px;
                    line-height: 1.2;
                }
                
                .subtitle {
                    font-size: 15px;
                    color: rgba(255, 255, 255, 0.7);
                    margin-bottom: 20px;
                    line-height: 1.5;
                }
                
                .warning-message {
                    padding: 16px;
                    background: rgba(239, 68, 68, 0.1);
                    border-left: 3px solid #ef4444;
                    border-radius: 10px;
                    margin: 20px 0;
                    text-align: left;
                }
                
                .warning-message h3 {
                    font-size: 14px;
                    color: #fca5a5;
                    margin-bottom: 6px;
                    font-weight: 600;
                }
                
                .warning-message p {
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.6);
                    line-height: 1.5;
                    margin-bottom: 8px;
                }
                
                .reason-tag {
                    display: inline-block;
                    padding: 4px 12px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 6px;
                    color: #fbbf24;
                    font-size: 12px;
                    font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
                }
                
                .reload-button {
                    margin-top: 20px;
                    padding: 14px 32px;
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    border: none;
                    border-radius: 14px;
                    color: white;
                    font-size: 15px;
                    font-weight: 600;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
                    position: relative;
                    overflow: hidden;
                    width: 100%;
                }
                
                .reload-button::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    transition: left 0.5s;
                }
                
                .reload-button:hover::before {
                    left: 100%;
                }
                
                .reload-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 40px rgba(239, 68, 68, 0.4);
                }
                
                .reload-button:active {
                    transform: translateY(0);
                }
                
                .footer-text {
                    margin-top: 18px;
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.4);
                }
                
                /* Scrollbar styling */
                .lockdown-content::-webkit-scrollbar {
                    width: 8px;
                }
                
                .lockdown-content::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                
                .lockdown-content::-webkit-scrollbar-thumb {
                    background: rgba(239, 68, 68, 0.3);
                    border-radius: 10px;
                }
                
                .lockdown-content::-webkit-scrollbar-thumb:hover {
                    background: rgba(239, 68, 68, 0.5);
                }
                
                @media (max-width: 768px) {
                    .lockdown-content {
                        padding: 25px;
                    }
                    
                    h1 {
                        font-size: 28px;
                    }
                    
                    .lock-icon-container {
                        width: 80px;
                        height: 80px;
                    }
                    
                    .lock-icon {
                        width: 50px;
                        height: 50px;
                    }
                }
                
                @media (max-height: 700px) {
                    .lock-icon-container {
                        width: 80px;
                        height: 80px;
                        margin-bottom: 15px;
                    }
                    
                    h1 {
                        font-size: 28px;
                        margin-bottom: 10px;
                    }
                    
                    .subtitle {
                        font-size: 14px;
                        margin-bottom: 15px;
                    }
                    
                    .warning-message {
                        padding: 12px;
                        margin: 15px 0;
                    }
                    
                    .reload-button {
                        margin-top: 15px;
                        padding: 12px 28px;
                    }
                }
            </style>
                </head>
                <body>
                    <div class="lockdown-container">
                        <!-- Animated background -->
                        <div class="particles">
                            <div class="particle"></div>
                            <div class="particle"></div>
                            <div class="particle"></div>
                            <div class="particle"></div>
                            <div class="particle"></div>
                        </div>
                        <div class="warning-stripes"></div>
                        
                        <!-- Main content -->
                        <div class="lockdown-content">
                            <!-- Animated lock icon -->
                            <div class="lock-icon-container">
                                <div class="lock-circle lock-circle-1"></div>
                                <div class="lock-circle lock-circle-2"></div>
                                <div class="lock-circle lock-circle-3"></div>
                                <svg class="lock-icon" width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                                </svg>
                            </div>
                            
                            <div class="status-badge">⚠️ Security Alert</div>
                            
                            <h1>System Lockdown</h1>
                            
                            <p class="subtitle">
                                Suspicious activity has been detected and all data has been cleared for your protection.
                            </p>
                            
                            <div class="warning-message">
                                <h3>🔒 Security Measures Activated</h3>
                                <p>
                                    For your safety, all authentication data and session information has been permanently removed from this device.
                                </p>
                                <div class="reason-tag">${reason}</div>
                            </div>
                            
                            <button class="reload-button" onclick="localStorage.removeItem('movex_theme'); location.reload();">
                                🔄 Reload Application
                            </button>
                            
                            <p class="footer-text">
                                MoveX Security System • Powered by Advanced Threat Detection
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // Clear interval
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
            }
        }
    };
})();
