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
const particleEggButton = document.getElementById('particleEggButton');
const particleConfigPanel = document.getElementById('particleConfigPanel');
const particleConfigClose = document.getElementById('particleConfigClose');
const particleRandomize = document.getElementById('particleRandomize');
const particleReset = document.getElementById('particleReset');

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
    const DEFAULT_CONFIG = {
        count: 130,
        maxSpeed: 0.35,
        connectionDist: 180,
        mouseRadius: 130,
        mouseRepel: 0.014,
        dotColor: [52, 174, 242],
        dotAlpha: 0.85,
        lineColor: [45, 157, 235],
        dotSize: 2,
        bgColor: '#0d0d18'
    };
    const CONFIG = { ...DEFAULT_CONFIG };
    CONFIG.dotColor = [...DEFAULT_CONFIG.dotColor];
    CONFIG.lineColor = [...DEFAULT_CONFIG.lineColor];

    const controls = {
        count: document.getElementById('particleCount'),
        countValue: document.getElementById('particleCountValue'),
        speed: document.getElementById('particleSpeed'),
        speedValue: document.getElementById('particleSpeedValue'),
        links: document.getElementById('particleLinks'),
        linksValue: document.getElementById('particleLinksValue'),
        mouse: document.getElementById('particleMouse'),
        mouseValue: document.getElementById('particleMouseValue'),
        repel: document.getElementById('particleRepel'),
        repelValue: document.getElementById('particleRepelValue'),
        size: document.getElementById('particleSize'),
        sizeValue: document.getElementById('particleSizeValue'),
        dotColor: document.getElementById('particleDotColor'),
        lineColor: document.getElementById('particleLineColor'),
        bgColor: document.getElementById('particleBgColor')
    };

    let width = 0;
    let height = 0;
    let particles = [];
    let mouse = { x: -9999, y: -9999 };
    let animationId = 0;

    function rgbStyle(color, alpha = 1) {
        return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
    }

    function hexToRgb(hex) {
        const value = hex.replace('#', '');
        return [
            parseInt(value.slice(0, 2), 16),
            parseInt(value.slice(2, 4), 16),
            parseInt(value.slice(4, 6), 16)
        ];
    }

    function rgbToHex(color) {
        return `#${color.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
    }

    function setPanelOpen(open) {
        if (!particleEggButton || !particleConfigPanel) return;

        particleConfigPanel.hidden = !open;
        particleEggButton.setAttribute('aria-expanded', String(open));

        if (open) {
            controls.count?.focus({ preventScroll: true });
        } else {
            particleEggButton.focus({ preventScroll: true });
        }
    }

    function syncControlValues() {
        if (!controls.count) return;

        controls.count.value = String(CONFIG.count);
        controls.countValue.textContent = String(CONFIG.count);
        controls.speed.value = String(CONFIG.maxSpeed);
        controls.speedValue.textContent = CONFIG.maxSpeed.toFixed(2);
        controls.links.value = String(CONFIG.connectionDist);
        controls.linksValue.textContent = String(CONFIG.connectionDist);
        controls.mouse.value = String(CONFIG.mouseRadius);
        controls.mouseValue.textContent = String(CONFIG.mouseRadius);
        controls.repel.value = String(CONFIG.mouseRepel);
        controls.repelValue.textContent = CONFIG.mouseRepel.toFixed(3);
        controls.size.value = String(CONFIG.dotSize);
        controls.sizeValue.textContent = CONFIG.dotSize.toFixed(1);
        controls.dotColor.value = rgbToHex(CONFIG.dotColor);
        controls.lineColor.value = rgbToHex(CONFIG.lineColor);
        controls.bgColor.value = CONFIG.bgColor;
    }

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
                r: Math.random() * CONFIG.dotSize + 0.8
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

            ctx.fillStyle = rgbStyle(CONFIG.dotColor, 0.9);
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
            ctx.fillStyle = rgbStyle(CONFIG.dotColor, CONFIG.dotAlpha);
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

    function drawStaticFrame() {
        ctx.fillStyle = CONFIG.bgColor;
        ctx.fillRect(0, 0, width, height);
        drawConnections();
        drawParticles();
    }

    function refreshParticles() {
        createParticles();
        drawStaticFrame();
    }

    function bindRange(input, output, formatter, onChange) {
        if (!input || !output) return;

        input.addEventListener('input', () => {
            const value = Number(input.value);
            output.textContent = formatter(value);
            onChange(value);
        });
    }

    function bindParticleControls() {
        if (!particleEggButton || !particleConfigPanel) return;

        syncControlValues();

        particleEggButton.addEventListener('click', () => {
            setPanelOpen(particleConfigPanel.hidden);
        });

        particleConfigClose?.addEventListener('click', () => setPanelOpen(false));

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !particleConfigPanel.hidden) {
                setPanelOpen(false);
            }
        });

        bindRange(controls.count, controls.countValue, String, (value) => {
            CONFIG.count = value;
            refreshParticles();
        });

        bindRange(controls.speed, controls.speedValue, (value) => value.toFixed(2), (value) => {
            CONFIG.maxSpeed = value;
            refreshParticles();
        });

        bindRange(controls.links, controls.linksValue, String, (value) => {
            CONFIG.connectionDist = value;
        });

        bindRange(controls.mouse, controls.mouseValue, String, (value) => {
            CONFIG.mouseRadius = value;
        });

        bindRange(controls.repel, controls.repelValue, (value) => value.toFixed(3), (value) => {
            CONFIG.mouseRepel = value;
        });

        bindRange(controls.size, controls.sizeValue, (value) => value.toFixed(1), (value) => {
            CONFIG.dotSize = value;
            refreshParticles();
        });

        controls.dotColor?.addEventListener('input', () => {
            CONFIG.dotColor = hexToRgb(controls.dotColor.value);
            drawStaticFrame();
        });

        controls.lineColor?.addEventListener('input', () => {
            CONFIG.lineColor = hexToRgb(controls.lineColor.value);
            drawStaticFrame();
        });

        controls.bgColor?.addEventListener('input', () => {
            CONFIG.bgColor = controls.bgColor.value;
            drawStaticFrame();
        });

        particleRandomize?.addEventListener('click', () => {
            CONFIG.count = Math.floor(Math.random() * 121) + 40;
            CONFIG.maxSpeed = Number((Math.random() * 0.85 + 0.15).toFixed(2));
            CONFIG.connectionDist = Math.floor(Math.random() * 151) + 60;
            CONFIG.mouseRadius = Math.floor(Math.random() * 221) + 30;
            CONFIG.mouseRepel = Number((Math.random() * 0.04 + 0.004).toFixed(3));
            CONFIG.dotSize = Number((Math.random() * 2 + 0.7).toFixed(1));
            CONFIG.dotColor = [
                Math.floor(Math.random() * 156) + 80,
                Math.floor(Math.random() * 156) + 80,
                Math.floor(Math.random() * 156) + 80
            ];
            CONFIG.lineColor = [...CONFIG.dotColor];
            CONFIG.bgColor = ['#0d0d18', '#101827', '#14111f', '#071a1f', '#181414'][Math.floor(Math.random() * 5)];
            syncControlValues();
            refreshParticles();
        });

        particleReset?.addEventListener('click', () => {
            Object.assign(CONFIG, DEFAULT_CONFIG);
            CONFIG.dotColor = [...DEFAULT_CONFIG.dotColor];
            CONFIG.lineColor = [...DEFAULT_CONFIG.lineColor];
            syncControlValues();
            refreshParticles();
        });
    }

    leftPanel.addEventListener('mousemove', updatePointer);
    leftPanel.addEventListener('mouseleave', () => {
        mouse.x = -9999;
        mouse.y = -9999;
    });
    window.addEventListener('resize', restart);

    restart();
    bindParticleControls();
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
