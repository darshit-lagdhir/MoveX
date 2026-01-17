/**
 * MoveX ER Diagram - Interactive Features
 * =============================================
 * Provides dynamic enhancements for the ER Diagram
 */

document.addEventListener('DOMContentLoaded', () => {
    // Set current date
    setCurrentDate();

    // Initialize hover effects
    initEntityHoverEffects();

    // Initialize relationship highlighting
    initRelationshipHighlighting();

    // Add print button functionality
    addPrintButton();

    // Add smooth scroll animations
    initScrollAnimations();

    // Initialize tooltips
    initTooltips();
});

/**
 * Set the current date in the header and footer
 */
function setCurrentDate() {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date().toLocaleDateString('en-US', options);

    const dateElement = document.getElementById('dateGenerated');
    const footerDate = document.getElementById('footerDate');

    if (dateElement) {
        dateElement.textContent = date;
    }

    if (footerDate) {
        footerDate.textContent = date;
    }
}

/**
 * Initialize hover effects for entity cards
 */
function initEntityHoverEffects() {
    const entityCards = document.querySelectorAll('.entity-card');

    entityCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px) scale(1.01)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
}

/**
 * Initialize relationship highlighting
 * When hovering over a relationship card, highlight related entities
 */
function initRelationshipHighlighting() {
    const relationshipCards = document.querySelectorAll('.relationship-card');

    relationshipCards.forEach(card => {
        const entities = card.querySelectorAll('.rel-entity');
        const entityNames = [];

        entities.forEach(entity => {
            entityNames.push(entity.textContent.trim());
        });

        card.addEventListener('mouseenter', () => {
            entityNames.forEach(name => {
                const entityCard = document.getElementById(name);
                if (entityCard) {
                    entityCard.style.boxShadow = '0 0 30px rgba(255, 102, 51, 0.5)';
                    entityCard.style.borderColor = 'var(--primary-orange)';
                }
            });
        });

        card.addEventListener('mouseleave', () => {
            entityNames.forEach(name => {
                const entityCard = document.getElementById(name);
                if (entityCard) {
                    entityCard.style.boxShadow = '';
                    entityCard.style.borderColor = '';
                }
            });
        });
    });
}

/**
 * Add print button to the page
 */
function addPrintButton() {
    const printBtn = document.createElement('button');
    printBtn.className = 'print-btn';
    printBtn.innerHTML = '🖨️ Print / Save as PDF';
    printBtn.title = 'Print this ER Diagram or Save as PDF';

    printBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: linear-gradient(135deg, #FF6633, #FF3366);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 50px;
        font-family: 'Outfit', sans-serif;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(255, 102, 51, 0.4);
        transition: all 0.3s ease;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    printBtn.addEventListener('mouseenter', () => {
        printBtn.style.transform = 'translateY(-2px) scale(1.05)';
        printBtn.style.boxShadow = '0 6px 25px rgba(255, 102, 51, 0.5)';
    });

    printBtn.addEventListener('mouseleave', () => {
        printBtn.style.transform = 'translateY(0) scale(1)';
        printBtn.style.boxShadow = '0 4px 20px rgba(255, 102, 51, 0.4)';
    });

    printBtn.addEventListener('click', () => {
        // Hide print button during printing
        printBtn.style.display = 'none';

        // Add print notification
        const notification = document.createElement('div');
        notification.className = 'print-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(15, 23, 42, 0.95);
                color: white;
                padding: 30px 50px;
                border-radius: 16px;
                font-family: 'Outfit', sans-serif;
                text-align: center;
                z-index: 10000;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            ">
                <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Preparing for Print...</div>
                <div style="font-size: 14px; color: #94A3B8;">Use "Save as PDF" in the print dialog for best results</div>
            </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
            window.print();
            printBtn.style.display = 'flex';
        }, 500);
    });

    document.body.appendChild(printBtn);

    // Hide print button when printing via CSS
    const style = document.createElement('style');
    style.textContent = `
        @media print {
            .print-btn,
            .print-notification {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Initialize scroll animations using Intersection Observer
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Animate entity cards
    const entityCards = document.querySelectorAll('.entity-card');
    entityCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
        observer.observe(card);
    });

    // Animate relationship cards
    const relationshipCards = document.querySelectorAll('.relationship-card');
    relationshipCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `opacity 0.4s ease ${index * 0.05}s, transform 0.4s ease ${index * 0.05}s`;
        observer.observe(card);
    });

    // Animate enum cards
    const enumCards = document.querySelectorAll('.enum-card');
    enumCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(15px)';
        card.style.transition = `opacity 0.3s ease ${index * 0.1}s, transform 0.3s ease ${index * 0.1}s`;
        observer.observe(card);
    });
}

/**
 * Initialize tooltips for key badges
 */
function initTooltips() {
    const keyBadges = document.querySelectorAll('.key-badge');

    keyBadges.forEach(badge => {
        let tooltipText = '';

        if (badge.classList.contains('pk')) {
            tooltipText = 'Primary Key - Unique identifier for each row';
        } else if (badge.classList.contains('fk')) {
            tooltipText = 'Foreign Key - References another table';
        } else if (badge.classList.contains('idx')) {
            tooltipText = 'Indexed - Optimized for faster queries';
        }

        if (tooltipText) {
            badge.setAttribute('data-tooltip', tooltipText);
            badge.style.cursor = 'help';
            badge.style.position = 'relative';

            badge.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'custom-tooltip';
                tooltip.textContent = tooltipText;
                tooltip.style.cssText = `
                    position: fixed;
                    background: rgba(15, 23, 42, 0.95);
                    color: #F8FAFC;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-family: 'Outfit', sans-serif;
                    font-weight: 400;
                    z-index: 10000;
                    pointer-events: none;
                    white-space: nowrap;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                `;

                document.body.appendChild(tooltip);

                const rect = badge.getBoundingClientRect();
                tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;

                badge._tooltip = tooltip;
            });

            badge.addEventListener('mouseleave', () => {
                if (badge._tooltip) {
                    badge._tooltip.remove();
                    badge._tooltip = null;
                }
            });
        }
    });
}

/**
 * Utility: Smooth scroll to element
 */
function scrollToElement(element, offset = 100) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

/**
 * Console welcome message
 */
console.log(`
%c╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║    🚀 MoveX ER Diagram                                   ║
║    Entity Relationship Diagram for MoveX Logistics       ║
║                                                           ║
║    Database: PostgreSQL via Supabase                     ║
║    Tables: 7 | Relationships: 6                          ║
║                                                           ║
║    Use the Print button for PDF export!                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`, 'color: #FF6633; font-weight: bold; font-size: 12px;');
