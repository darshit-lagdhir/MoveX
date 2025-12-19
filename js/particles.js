/* ═══════════════════════════════════════════════════════════
   PARTICLE NETWORK ANIMATION - THEME-AWARE
   ═══════════════════════════════════════════════════════════ */

if (typeof ParticleNetwork === 'undefined') {
class ParticleNetwork {
    constructor() {
        this.canvas = document.getElementById('particleCanvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 60;  // REDUCED for better performance
        this.maxDistance = 150;
        this.mouse = { x: null, y: null, radius: 150 };
        
        this.init();
    }
    
    init() {
        this.resize();
        this.createParticles();
        this.animate();
        
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseout', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1
            });
        }
    }
    
    handleMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }
    
    getParticleColor() {
        const style = getComputedStyle(document.documentElement);
        return style.getPropertyValue('--particle-dot').trim() || 'rgba(99, 102, 241, 0.5)';
    }
    
    getLineColor() {
        const style = getComputedStyle(document.documentElement);
        return style.getPropertyValue('--particle-line').trim() || 'rgba(99, 102, 241, 0.15)';
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const particleColor = this.getParticleColor();
        const lineBaseColor = this.getLineColor();
        
        // Update and draw particles
        this.particles.forEach((particle, i) => {
            // Move particle
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Bounce off edges
            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;
            
            // Mouse interaction
            if (this.mouse.x !== null && this.mouse.y !== null) {
                const dx = this.mouse.x - particle.x;
                const dy = this.mouse.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.mouse.radius) {
                    const angle = Math.atan2(dy, dx);
                    const force = (this.mouse.radius - distance) / this.mouse.radius;
                    particle.vx -= Math.cos(angle) * force * 0.5;
                    particle.vy -= Math.sin(angle) * force * 0.5;
                }
            }
            
            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = particleColor;
            this.ctx.fill();
            
            // Draw connections
            for (let j = i + 1; j < this.particles.length; j++) {
                const other = this.particles[j];
                const dx = particle.x - other.x;
                const dy = particle.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.maxDistance) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(other.x, other.y);
                    
                    // Calculate opacity based on distance
                    const opacity = 1 - (distance / this.maxDistance);
                    
                    // Parse the base color and apply opacity
                    const rgbaMatch = lineBaseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                    if (rgbaMatch) {
                        const r = rgbaMatch[1];
                        const g = rgbaMatch[2];
                        const b = rgbaMatch[3];
                        const baseOpacity = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
                        this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * baseOpacity})`;
                    } else {
                        this.ctx.strokeStyle = `rgba(99, 102, 241, ${opacity * 0.2})`;
                    }
                    
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            }
        });
    }
}

// Initialize particles when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ParticleNetwork();
});
}
