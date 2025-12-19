/* ═══════════════════════════════════════════════════════════
   ADVANCED ANIMATIONS & INTERACTIONS
   ═══════════════════════════════════════════════════════════ */

if (typeof AnimationManager === 'undefined') {
class AnimationManager {
    constructor() {
        this.card = document.getElementById('loginCard');
        this.cardWrapper = document.getElementById('cardWrapper');
        this.magneticBtn = document.querySelector('.magnetic-btn');
        this.featureCards = document.querySelectorAll('.feature-card[data-tilt]');
        
        this.init();
    }
    
    init() {
        this.initCardParallax();
        this.initFeatureTilt();
        this.initRippleEffect();
        this.initPasswordToggle();
    }
    
    // 3D Card Parallax on Mouse Move
    initCardParallax() {
        if (!this.card || !this.cardWrapper) return;
        
        /* DISABLE THIS - IT CAUSES STRETCHING
    this.cardWrapper.addEventListener('mousemove', (e) => {
        const rect = this.cardWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        
        this.card.style.transform = `
            perspective(1000px)
            rotateX(${rotateX}deg)
            rotateY(${rotateY}deg)
            scale3d(1.02, 1.02, 1.02)
        `;
    });
    
    this.cardWrapper.addEventListener('mouseleave', () => {
        this.card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    });
    */
    }
    
    // Magnetic Button Effect
    // Magnetic Button Effect - DISABLED
    initMagneticButton() {
        // Magnetic effect disabled - button stays stable
        return;
    }

    
    // Feature Cards 3D Tilt
    initFeatureTilt() {
        this.featureCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                
                card.style.transform = `
                    perspective(1000px)
                    rotateX(${rotateX}deg)
                    rotateY(${rotateY}deg)
                    translateY(-8px)
                `;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
            });
        });
    }
    
    // Ripple Effect on Button Click
    initRippleEffect() {
        const buttons = document.querySelectorAll('.btn-login');
        
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const ripple = button.querySelector('.btn-ripple');
                if (!ripple) return;
                
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                ripple.classList.remove('active');
                
                setTimeout(() => {
                    ripple.classList.add('active');
                }, 0);
            });
        });
    }

    // Premium Password Toggle with Animations
    initPasswordToggle() {
        const toggleBtn = document.querySelector('.password-toggle');
        const passwordInput = document.getElementById('password');
        
        if (!toggleBtn || !passwordInput) return;
        
        toggleBtn.addEventListener('click', (e) => {
            // Add click pulse animation
            toggleBtn.classList.add('clicked');
            setTimeout(() => toggleBtn.classList.remove('clicked'), 400);
            
            // Create ripple effect
            this.createRipple(e, toggleBtn);
            
            // Toggle password visibility
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleBtn.classList.add('active');
            } else {
                passwordInput.type = 'password';
                toggleBtn.classList.remove('active');
            }
        });
    }

    // Ripple effect function
    createRipple(event, button) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            top: ${y}px;
            left: ${x}px;
            background: var(--brand-primary);
            border-radius: 50%;
            opacity: 0.4;
            pointer-events: none;
            transform: scale(0);
            animation: rippleEffect 0.6s ease-out;
            z-index: -1;
        `;
        
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }

    
    // Success Confetti
    static createConfetti() {
        const container = document.getElementById('confettiContainer');
        if (!container) return;
        
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#3b82f6'];
        const confettiCount = 80;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'absolute';
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.opacity = Math.random() + 0.5;
            confetti.style.animation = `confettiFall ${Math.random() * 3 + 2}s linear forwards`;
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            
            container.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 5000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AnimationManager();
});
}
