/**
 * Login Page — handles views/login.html
 */

import { isAuthenticated, login, setAuth } from '../../domain/use-cases/auth.use-cases.js';

// Redirect if already authenticated
if (isAuthenticated()) {
    window.location.href = '/';
}

const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');
const errorMsg = document.getElementById('errorMsg');
const leftPanel = document.querySelector('.left-panel');
const particleField = document.getElementById('particleField');

// ─── UI helpers ─────────────────────────────────────────────────────────────

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add('visible');
}

function clearError() {
    errorMsg.textContent = '';
    errorMsg.classList.remove('visible');
}

function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('loading', on);
    if (!on) submitBtn.textContent = 'Sign in';
}

function initParticleField() {
    if (!leftPanel || !particleField) return;

    const ctx = particleField.getContext('2d');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const CONFIG = {
        count: 90,
        maxSpeed: 0.35,
        connectionDist: 110,
        mouseRadius: 130,
        mouseRepel: 0.014,
        dotColor: 'rgba(52, 174, 242, 0.85)',
        lineColor: [45, 157, 235],
        bgColor: '#0d0d18'
    };

    let width = 0;
    let height = 0;
    let particles = [];
    let mouse = { x: -9999, y: -9999 };
    let animationId = 0;

    function resize() {
        const rect = particleField.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        width = rect.width;
        height = rect.height;
        particleField.width = Math.max(1, Math.floor(width * ratio));
        particleField.height = Math.max(1, Math.floor(height * ratio));
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function createParticles() {
        particles = [];

        for (let i = 0; i < CONFIG.count; i += 1) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * CONFIG.maxSpeed * 2,
                vy: (Math.random() - 0.5) * CONFIG.maxSpeed * 2,
                r: Math.random() * 1.4 + 0.8
            });
        }
    }

    function drawConnections() {
        const [red, green, blue] = CONFIG.lineColor;

        for (let i = 0; i < particles.length; i += 1) {
            for (let j = i + 1; j < particles.length; j += 1) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt((dx * dx) + (dy * dy));

                if (distance < CONFIG.connectionDist) {
                    const alpha = (1 - (distance / CONFIG.connectionDist)) * 0.35;
                    ctx.strokeStyle = `rgba(${red},${green},${blue},${alpha})`;
                    ctx.lineWidth = 0.6;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        if (mouse.x > 0) {
            for (const particle of particles) {
                const dx = mouse.x - particle.x;
                const dy = mouse.y - particle.y;
                const distance = Math.sqrt((dx * dx) + (dy * dy));

                if (distance < CONFIG.mouseRadius * 1.1) {
                    const alpha = (1 - (distance / (CONFIG.mouseRadius * 1.1))) * 0.65;
                    ctx.strokeStyle = `rgba(${red},${green},${blue},${alpha})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(mouse.x, mouse.y);
                    ctx.lineTo(particle.x, particle.y);
                    ctx.stroke();
                }
            }

            ctx.fillStyle = 'rgba(52, 174, 242, 0.9)';
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function updateParticles() {
        for (const particle of particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < -10) particle.x = width + 10;
            if (particle.x > width + 10) particle.x = -10;
            if (particle.y < -10) particle.y = height + 10;
            if (particle.y > height + 10) particle.y = -10;

            const dx = mouse.x - particle.x;
            const dy = mouse.y - particle.y;
            const distance = Math.sqrt((dx * dx) + (dy * dy));

            if (distance < CONFIG.mouseRadius) {
                particle.x -= dx * CONFIG.mouseRepel;
                particle.y -= dy * CONFIG.mouseRepel;
            }
        }
    }

    function drawParticles() {
        for (const particle of particles) {
            ctx.fillStyle = CONFIG.dotColor;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function tick() {
        ctx.fillStyle = CONFIG.bgColor;
        ctx.fillRect(0, 0, width, height);

        updateParticles();
        drawConnections();
        drawParticles();

        animationId = window.requestAnimationFrame(tick);
    }

    function updatePointer(event) {
        const rect = particleField.getBoundingClientRect();
        mouse.x = event.clientX - rect.left;
        mouse.y = event.clientY - rect.top;
    }

    function restart() {
        resize();
        createParticles();
        ctx.fillStyle = CONFIG.bgColor;
        ctx.fillRect(0, 0, width, height);

        if (prefersReducedMotion) {
            drawParticles();
        }
    }

    leftPanel.addEventListener('mousemove', updatePointer);
    leftPanel.addEventListener('mouseleave', () => {
        mouse.x = -9999;
        mouse.y = -9999;
    });
    window.addEventListener('resize', restart);

    restart();
    if (!prefersReducedMotion) tick();

    window.addEventListener('beforeunload', () => {
        window.cancelAnimationFrame(animationId);
    });
}

// ─── Event listeners ─────────────────────────────────────────────────────────

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showError('Please fill in all fields.');
        return;
    }

    setLoading(true);

    try {
        const data = await login(email, password);
        setAuth(data.token, data.user);
        window.location.href = '/';
    } catch (err) {
        console.error('Login error:', err);
        showError(err.message || 'Invalid email or password.');
    } finally {
        setLoading(false);
    }
});

initParticleField();
