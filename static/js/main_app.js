// Main App JavaScript for Video Processing Suite

// Configuration
const CONFIG = {
    watermarkPort: 5001,
    tamperDetectionPort: 8001,
    mainPort: 5000
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Video Processing Suite initialized');
    initializeCards();
    checkServicesStatus();
});

// Initialize card interactions
function initializeCards() {
    const cards = document.querySelectorAll('.service-card');
    
    cards.forEach(card => {
        // Add click animation
        card.addEventListener('click', function(e) {
            if (!e.target.classList.contains('action-btn')) {
                const btn = this.querySelector('.action-btn');
                if (btn) {
                    animateButton(btn);
                }
            }
        });

        // Add hover effect for icon
        const icon = card.querySelector('.icon-container');
        card.addEventListener('mouseenter', function() {
            icon.style.transform = 'scale(1.1) rotate(5deg)';
        });
        
        card.addEventListener('mouseleave', function() {
            icon.style.transform = 'scale(1) rotate(0deg)';
        });
    });
}

// Animate button on click
function animateButton(button) {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 100);
}

// Navigate to service
function navigateToService(service) {
    let url;
    
    if (service === 'watermark') {
        url = `http://localhost:${CONFIG.watermarkPort}`;
    } else if (service === 'tamper') {
        url = `http://localhost:${CONFIG.tamperDetectionPort}`;
    }
    
    // Add loading state
    const button = event.target;
    const originalText = button.textContent;
    button.innerHTML = '<span class="loading"></span> Loading...';
    button.disabled = true;
    
    // Navigate after short delay
    setTimeout(() => {
        window.location.href = url;
    }, 500);
}

// Check if services are running
async function checkServicesStatus() {
    const services = [
        { name: 'Watermark Service', port: CONFIG.watermarkPort },
        { name: 'Tamper Detection Service', port: CONFIG.tamperDetectionPort }
    ];
    
    for (const service of services) {
        try {
            const response = await fetch(`http://localhost:${service.port}/`, {
                method: 'HEAD',
                mode: 'no-cors'
            });
            console.log(`${service.name} is running on port ${service.port}`);
        } catch (error) {
            console.warn(`${service.name} may not be running on port ${service.port}`);
        }
    }
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add ripple effect to buttons
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Add ripple effect to all buttons
document.querySelectorAll('.action-btn').forEach(button => {
    button.addEventListener('click', createRipple);
});

// Service card animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all service cards
document.querySelectorAll('.service-card').forEach(card => {
    observer.observe(card);
});

// Keyboard navigation support
document.addEventListener('keydown', function(e) {
    if (e.key === '1') {
        navigateToService('watermark');
    } else if (e.key === '2') {
        navigateToService('tamper');
    }
});

// Display keyboard shortcuts info
console.log('%c Video Processing Suite Controls ', 'background: #667eea; color: white; font-size: 14px; padding: 5px;');
console.log('Press 1 for Video Watermarking');
console.log('Press 2 for Tamper Detection');

// Error handling for navigation
window.addEventListener('error', function(e) {
    console.error('Navigation error:', e.message);
});

// Add loading spinner CSS dynamically
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
